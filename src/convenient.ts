import {
  type IndexedKeysMessageSchema, type Invalid, isSchemaLeaf, type SchemaLeaf,
  type ValidIndexedKeysMessageSchema,
  type ValidSchemaLeaf
} from "./indexedKeysSchema";
import { get, set } from "./raw";

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
