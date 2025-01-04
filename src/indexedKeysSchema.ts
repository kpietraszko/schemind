import type { NonNegativeInteger } from "type-fest";
import { get, set } from "./raw";

export const indexesPathReversed = Symbol("indexesPathReversed");
const fieldType = Symbol("fieldType");
const isSchemaLeafTag = Symbol("isSchemaLeaf");
const isValidSchemaLeafTag = Symbol("isValidSchemaLeaf");

type IndexesPath = number[];
export type SchemaLeaf<TField> = {
  [indexesPathReversed]: IndexesPath,
  [fieldType]: TField,
  [isSchemaLeafTag]: true
};

export type ValidSchemaLeaf<TField> = SchemaLeaf<TField> & { 
  [isValidSchemaLeafTag]: true,
  get: (message: unknown[]) => TField,
  set: (message: unknown[], value: TField) => void
};

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
export type Invalid<T extends string> = { [invalid]: T }

export type ValidIndexedKeysMessageSchema<TSchema> = {
  [K in keyof TSchema]: TSchema[K] extends ValidSchemaLeaf<infer TField>
      ? ValidSchemaLeaf<TField>
      : TSchema[K] extends SchemaLeaf<unknown> 
          ? Invalid<"Schema needs to be built before you use it, did you forget to call buildSchema()?">
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

export function buildSchema<TSchema extends IndexedKeysMessageSchema<TSchemaInner>, TSchemaInner>(schema: TSchema) {
  validateSchemaRecursively(schema, schema, [], 0);
  return schema as unknown as ToValidIndexedKeysMessageSchema<TSchema>;
}

function validateSchemaRecursively(
    rootSchema: IndexedKeysMessageSchema<unknown>, 
    schemaNode: IndexedKeysMessageSchema<unknown>,
    encounteredIndexesPaths: IndexesPath[],
    currentTreeLevel: number){

  for (const [_, nestedSchemaNode] of Object.entries(schemaNode)) {
    const subschemaOrLeaf = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>;
    if (isSchemaLeaf(subschemaOrLeaf)) {
      validateSchemaLeaf(subschemaOrLeaf, encounteredIndexesPaths, currentTreeLevel);
      
      subschemaOrLeaf.get = (message) => get(message, subschemaOrLeaf);
      subschemaOrLeaf.set = (message, value) => set(message, subschemaOrLeaf, value);
    } else {
      validateSchemaRecursively(rootSchema, subschemaOrLeaf, encounteredIndexesPaths, currentTreeLevel + 1);
    }
  }
}

function validateSchemaLeaf(schemaLeaf: SchemaLeaf<unknown>, 
    encounteredIndexesPaths: IndexesPath[], currentTreeLevel: number): asserts schemaLeaf is ValidSchemaLeaf<unknown>{
  
  const duplicateIndexesPathDetected = encounteredIndexesPaths.some(encounteredPath =>
      encounteredPath.length === schemaLeaf[indexesPathReversed].length && 
      encounteredPath.every((pathElement, index) => pathElement === schemaLeaf[indexesPathReversed][index]));

  if (duplicateIndexesPathDetected)
  {
    throw new InvalidSchemaError()
  }

  encounteredIndexesPaths.push(schemaLeaf[indexesPathReversed]);

  const indexesPathLengthDoesntMatchLevel = schemaLeaf[indexesPathReversed].length !== (currentTreeLevel + 1);
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
      [indexesPathReversed]: [index] as number[],
      [fieldType]: undefined as TField,
      [isSchemaLeafTag]: true
    } as const as ReturnedSchemaNode<TField, TNestedSchema>;
  };
}

// intentionally not validating that it has the "isValidSchemaLeaf" symbol property, because it actually doesn't - it's just a type trick
export function isSchemaLeaf<TLeaf extends SchemaLeaf<unknown>>(value: IndexedKeysMessageSchema<unknown> | TLeaf): value is TLeaf {
  return Object.hasOwn(value, isSchemaLeafTag);
}

function addIndexToPathsRecursively(
    schemaNode: IndexedKeysMessageSchema<unknown>,
    indexToAdd: number) {

  for (const [_, nestedSchemaNode] of Object.entries(schemaNode)) {
    const nestedNode = nestedSchemaNode as IndexedKeysMessageSchema<unknown> | SchemaLeaf<unknown>;
    if (isSchemaLeaf(nestedNode)) {
      nestedNode[indexesPathReversed].push(indexToAdd);
    } else {
      addIndexToPathsRecursively(nestedNode, indexToAdd);
    }
  }
}

