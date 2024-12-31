import type { NonNegativeInteger } from "type-fest";

const isSchemaLeafTag = Symbol("isSchemaLeaf");
const isValidSchemaLeaf = Symbol("isValidSchemaLeaf");

type IndexesPath = number[];
type SchemaLeaf<TField> = {
  indexesPathReversed: IndexesPath,
  fieldType: TField,
  [isSchemaLeafTag]: true
};

type ValidSchemaLeaf<TField> = SchemaLeaf<TField> & { [isValidSchemaLeaf]: true };

export type IndexedKeysMessageSchema<TSchema> = {
  [K in keyof TSchema]: TSchema[K] extends SchemaLeaf<infer TField>
      ? SchemaLeaf<TField>
      : IndexedKeysMessageSchema<TSchema[K]>;
};
    
type ToValidIndexedKeysMessageSchema<TSchema> = {
  [K in keyof TSchema]: TSchema[K] extends SchemaLeaf<infer TField>
      ? ValidSchemaLeaf<TField>
      : ToValidIndexedKeysMessageSchema<TSchema[K]>;
};

const invalid = Symbol('invalid')
type Invalid<T extends string> = { [invalid]: T }

export type ValidIndexedKeysMessageSchema<TSchema> = {
  [K in keyof TSchema]: TSchema[K] extends ValidSchemaLeaf<infer TField>
      ? ValidSchemaLeaf<TField>
      : TSchema[K] extends SchemaLeaf<unknown> 
          ? Invalid<"Schema needs to be validated before you use it, did you forget to call validateSchema()?">
          : ToValidIndexedKeysMessageSchema<TSchema[K]>;
};


type ReturnedSchemaNode<TField, TNestedSchema> = TNestedSchema extends undefined ?
    SchemaLeaf<TField>
    : TNestedSchema;

export class InvalidSchemaError extends Error {
  constructor() {
    super("Invalid schema. Make sure there are no duplicate indexes, and that nested objects are also wrapped with withIndex.");
    this.name = "InvalidSchemaError";
  }
}

export function validateSchema<TSchema extends IndexedKeysMessageSchema<TSchemaInner>, TSchemaInner>(schema: TSchema) {
  validateSchemaRecursively(schema, [], 0);
  return schema as unknown as ToValidIndexedKeysMessageSchema<TSchema>;
}

function validateSchemaRecursively(
    schemaNode: IndexedKeysMessageSchema<unknown>,
    encounteredIndexesPaths: IndexesPath[],
    currentTreeLevel: number){

  for (const [_, nestedSchemaNode] of Object.entries(schemaNode)) {
    const nestedNode = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>;
    if (isSchemaLeaf(nestedNode)) {
      validateSchemaLeaf(nestedNode, encounteredIndexesPaths, currentTreeLevel);
    } else {
      validateSchemaRecursively(nestedNode, encounteredIndexesPaths, currentTreeLevel + 1);
    }
  }
}

function validateSchemaLeaf(schemaLeaf: SchemaLeaf<unknown>, encounteredIndexesPaths: IndexesPath[], currentTreeLevel: number){
  const duplicateIndexesPathDetected = encounteredIndexesPaths.some(encounteredPath =>
      encounteredPath.length === schemaLeaf.indexesPathReversed.length && 
      encounteredPath.every((pathElement, index) => pathElement === schemaLeaf.indexesPathReversed[index]));

  if (duplicateIndexesPathDetected)
  {
    throw new InvalidSchemaError()
  }

  encounteredIndexesPaths.push(schemaLeaf.indexesPathReversed);

  const indexesPathLengthDoesntMatchLevel = schemaLeaf.indexesPathReversed.length !== (currentTreeLevel + 1);
  if (indexesPathLengthDoesntMatchLevel)
  {
    throw new InvalidSchemaError()
  }
}

export function withIndex<const TIndex extends number>(index: NonNegativeInteger<TIndex>) {
  return <const TField = undefined, TNestedSchema extends IndexedKeysMessageSchema<TNestedSchema> | undefined = undefined>(nestedSchema?: TNestedSchema)
      : ReturnedSchemaNode<TField, TNestedSchema> => {
    if (nestedSchema) {
      addIndexToPathsRecursively(nestedSchema, index);
      return nestedSchema as ReturnedSchemaNode<TField, typeof nestedSchema>;
    }

    return {
      indexesPathReversed: [index] as number[],
      fieldType: undefined as TField,
      [isSchemaLeafTag]: true
    } as const as ReturnedSchemaNode<TField, TNestedSchema>;
  };
}

// intentionally not validating that it has the "isValidSchemaLeaf" symbol property, because it actually doesn't - it's just a type trick
function isSchemaLeaf(value: IndexedKeysMessageSchema<unknown> | ValidSchemaLeaf<unknown>): value is ValidSchemaLeaf<unknown>;
function isSchemaLeaf(value: IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>): value is SchemaLeaf<unknown> {
  return Object.hasOwn(value, isSchemaLeafTag);
}

function addIndexToPathsRecursively(
    schemaNode: IndexedKeysMessageSchema<unknown>,
    indexToAdd: number) {

  for (const [_, nestedSchemaNode] of Object.entries(schemaNode)) {
    const nestedNode = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>;
    if (isSchemaLeaf(nestedNode)) {
      nestedNode.indexesPathReversed.push(indexToAdd);
    } else {
      addIndexToPathsRecursively(nestedNode, indexToAdd);
    }
  }
}

export function get<const TField>(message: readonly unknown[], schemaField: ValidSchemaLeaf<TField>) {
  const indexesPathReversed = schemaField.indexesPathReversed;
  let currentSlice: readonly unknown[] = message;

  for (let pathIndex = schemaField.indexesPathReversed.length - 1; pathIndex >= 1; pathIndex--) {
    currentSlice = currentSlice[indexesPathReversed[pathIndex]] as readonly unknown[];
  }

  const lastIndexInPath = indexesPathReversed[0];
  return currentSlice[lastIndexInPath] as TField;
}

export function set<const TField>(targetMessage: unknown[], schemaField: ValidSchemaLeaf<TField>, value: TField) {
  const indexesPathReversed = schemaField.indexesPathReversed;
  let currentSlice: unknown[] = targetMessage;

  for (let pathIndex = schemaField.indexesPathReversed.length - 1; pathIndex >= 1; pathIndex--) {
    if (currentSlice[indexesPathReversed[pathIndex]] === undefined) {
      currentSlice[indexesPathReversed[pathIndex]] = [];
    }

    currentSlice = currentSlice[indexesPathReversed[pathIndex]] as unknown[];
  }

  const lastIndexInPath = indexesPathReversed[0];
  currentSlice[lastIndexInPath] = value;
}

type PlainObjectOfSchema<TSchema> = TSchema extends ValidIndexedKeysMessageSchema<unknown> ? {
      [K in keyof TSchema]: TSchema[K] extends ValidSchemaLeaf<infer TField>
          ? TField
          : TSchema[K] extends SchemaLeaf<unknown>
            ? Invalid<"Schema needs to be validated before you use it!">
            : PlainObjectOfSchema<TSchema[K]>;
    }
    : never;

export function toPlainObject<TSchema extends ValidIndexedKeysMessageSchema<TSchemaInner>, TSchemaInner>(
    message: readonly unknown[],
    schema: TSchema): PlainObjectOfSchema<TSchema> {
  
  const object: Partial<PlainObjectOfSchema<TSchema>> = {};
  
  for (const [fieldName, nestedSchemaNode] of Object.entries(schema)) {
    const nestedNode = nestedSchemaNode as ValidIndexedKeysMessageSchema<unknown> | ValidSchemaLeaf<unknown>;
    let valueToSet = undefined;
    if (isSchemaLeaf(nestedNode)) {
      valueToSet = get(message, nestedNode);
    } else {
      valueToSet = toPlainObject(message, nestedNode);
    }
    
    object[fieldName as keyof PlainObjectOfSchema<TSchema>] = valueToSet as any;
  }
  
  return object as PlainObjectOfSchema<TSchema>;
}

export function toIndexedKeysMessage<TSchema extends ValidIndexedKeysMessageSchema<TSchemaInner>, TSchemaInner>(
    plainObject: PlainObjectOfSchema<TSchema>,
    schema: TSchema): unknown[] {
  
  const message: unknown[] = [];
  populateIndexedKeysMessage(message, plainObject, schema);
  return message;
}

function populateIndexedKeysMessage<TSchema extends ValidIndexedKeysMessageSchema<TSchemaInner>, TSchemaInner>(
    messageToPopulate: unknown[], 
    plainObject: PlainObjectOfSchema<TSchema>,
    schema: TSchema) {
  
  for (const [fieldName, nestedSchemaNode] of Object.entries(schema)) {
    const nestedNode = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | ValidSchemaLeaf<unknown>;
    const leafValueOrSubObject = plainObject[fieldName as keyof PlainObjectOfSchema<TSchema>];
    if (isSchemaLeaf(nestedNode)) {
      set(messageToPopulate, nestedNode, leafValueOrSubObject);
    } else {
      populateIndexedKeysMessage(messageToPopulate, leafValueOrSubObject as PlainObjectOfSchema<TSchema>, nestedNode)
    }
  }
}
