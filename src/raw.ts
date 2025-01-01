import type { ValidSchemaLeaf } from "./indexedKeysSchema";

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