import type { NonNegativeInteger } from "type-fest";

type SchemaLeaf<TField> = {
  indexesPathReversed: number[],
  fieldType: TField
};

type IndexedKeysMessageSchema<TSchema> = {
  [K in keyof TSchema]: TSchema[K] extends SchemaLeaf<infer TField>
      ? SchemaLeaf<TField>
      : IndexedKeysMessageSchema<TSchema[K]>;
};

type ReturnedSchemaNode<TField, TNestedSchema> = TNestedSchema extends undefined ?
    SchemaLeaf<TField>
    : TNestedSchema;

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
    } as const as ReturnedSchemaNode<TField, TNestedSchema>;
  };
}

function isSchemaLeaf(value: IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>): value is SchemaLeaf<unknown> {
  const propertyOnlyInLeaf = "fieldType" satisfies keyof SchemaLeaf<unknown>;
  return Object.hasOwn(value, propertyOnlyInLeaf);
}

function addIndexToPathsRecursively(
    schemaNode: IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>,
    indexToAdd: number) {

  if (isSchemaLeaf(schemaNode)) {
    return;
  }

  for (const [_, nestedSchemaNode] of Object.entries(schemaNode)) {
    const nestedNode = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>;
    if (isSchemaLeaf(nestedNode)) {
      nestedNode.indexesPathReversed.push(indexToAdd);
    } else {
      addIndexToPathsRecursively(nestedNode, indexToAdd);
    }
  }
}

export function get<const TField>(message: readonly unknown[], schemaField: SchemaLeaf<TField>) {
  const indexesPathReversed = schemaField.indexesPathReversed;
  let currentSlice: readonly unknown[] = message;

  for (let pathIndex = schemaField.indexesPathReversed.length - 1; pathIndex >= 1; pathIndex--) {
    currentSlice = currentSlice[indexesPathReversed[pathIndex]] as readonly unknown[];
  }

  const lastIndexInPath = indexesPathReversed[0];
  return currentSlice[lastIndexInPath] as TField;
}

export function set<const TField>(targetMessage: unknown[], schemaField: SchemaLeaf<TField>, value: TField) {
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

type PlainObjectOfSchema<TSchema> = TSchema extends IndexedKeysMessageSchema<unknown> ? {
      [K in keyof TSchema]: TSchema[K] extends SchemaLeaf<infer TField>
          ? TField
          : PlainObjectOfSchema<TSchema[K]>;
    }
    : never;

export function toObject<TSchema extends IndexedKeysMessageSchema<TSchemaInner>, TSchemaInner>(
    message: readonly unknown[],
    schema: TSchema): PlainObjectOfSchema<TSchema> {
  
  const object: Partial<PlainObjectOfSchema<TSchema>> = {};
  for (const [fieldName, nestedSchemaNode] of Object.entries(schema)) {
    const nestedNode = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>;
    let valueToSet = undefined;
    if (isSchemaLeaf(nestedNode)) {
      valueToSet = get(message, nestedNode);
    } else {
      valueToSet = toObject(message, nestedNode);
    }
    
    object[fieldName as keyof PlainObjectOfSchema<TSchema>] = valueToSet as any;
  }
  
  return object as PlainObjectOfSchema<TSchema>;
}
