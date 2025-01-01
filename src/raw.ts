import type { ValidSchemaLeaf } from "./indexedKeysSchema";
import {indexesPathReversed} from './indexedKeysSchema';

export function get<const TField>(message: readonly unknown[], schemaField: ValidSchemaLeaf<TField>) {
  const reversedIndexesPath = schemaField[indexesPathReversed];
  let currentSlice: readonly unknown[] = message;

  for (let pathIndex = schemaField[indexesPathReversed].length - 1; pathIndex >= 1; pathIndex--) {
    currentSlice = currentSlice[reversedIndexesPath[pathIndex]] as readonly unknown[];
  }

  const lastIndexInPath = reversedIndexesPath[0];
  return currentSlice[lastIndexInPath] as TField;
}

export function set<const TField>(targetMessage: unknown[], schemaField: ValidSchemaLeaf<TField>, value: TField) {
  const reversedIndexesPath = schemaField[indexesPathReversed];
  let currentSlice: unknown[] = targetMessage;

  for (let pathIndex = schemaField[indexesPathReversed].length - 1; pathIndex >= 1; pathIndex--) {
    if (currentSlice[reversedIndexesPath[pathIndex]] === undefined) {
      currentSlice[reversedIndexesPath[pathIndex]] = [];
    }

    currentSlice = currentSlice[reversedIndexesPath[pathIndex]] as unknown[];
  }

  const lastIndexInPath = reversedIndexesPath[0];
  currentSlice[lastIndexInPath] = value;
}