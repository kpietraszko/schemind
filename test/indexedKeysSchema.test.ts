import { describe, it, expect, expectTypeOf } from "vitest";
import { withIndex as i, get, set, toPlainObject, toIndexedKeysMessage } from "../src/index";

const someDate = new Date();
const message = [
  420,
  69,
  "nice",
  true,
  ["quick", "brown", "fox"],
  [
    1234567891234567,
    someDate,
    [
      2138,
      false,
      [2, 3, 5, 8]
    ]
  ]] as unknown[];

type ExpectedObjectType = {
  someNumber: number,
  anotherNumber: number,
  someArray: string[],
  nestedThing: {
    someNestedDate: Date,
    evenMoreNestedThing: {
      moreNestedNumber: number,
      moreNestedBool: boolean,
      moreNestedArray: number[]
    },
    someNestedNumber: number
  },
  someString: string,
  someBool: boolean
};

const messageAsPlainObject = {
  someNumber: 420,
  anotherNumber: 69,
  someArray: ["quick", "brown", "fox"],
  nestedThing: {
    someNestedDate: someDate,
    evenMoreNestedThing: {
      moreNestedNumber: 2138,
      moreNestedBool: false,
      moreNestedArray: [2, 3, 5, 8]
    },
    someNestedNumber: 1234567891234567
  },
  someString: "nice",
  someBool: true
} satisfies ExpectedObjectType;

describe("get", () => {
  it("should return value from the index - and of type - specified by the schema", () => {
    const schema = createTestSchema();

    const r1 = get(message, schema.anotherNumber);
    expectTypeOf(r1).toBeNumber();
    expect(r1).to.equal(69);

    const r2 = get(message, schema.someNumber);
    expectTypeOf(r2).toBeNumber();
    expect(r2).to.equal(420);

    const r3 = get(message, schema.someBool);
    expectTypeOf(r3).toBeBoolean();
    expect(r3).to.equal(true);

    const r4 = get(message, schema.someString);
    expectTypeOf(r4).toBeString();
    expect(r4).to.equal("nice");
    
    const r5 = get(message, schema.someArray);
    expectTypeOf(r5).toEqualTypeOf<string[]>();
    expect(r5).to.deep.equal(["quick", "brown", "fox"]);

    const r6 = get(message, schema.nestedThing.someNestedNumber);
    expectTypeOf(r6).toBeNumber();
    expect(r6).to.equal(1234567891234567);

    const r7 = get(message, schema.nestedThing.someNestedDate);
    expectTypeOf(r7).toEqualTypeOf<Date>();
    expect(r7).to.equal(someDate);

    const r8 = get(message, schema.nestedThing.evenMoreNestedThing.moreNestedNumber);
    expectTypeOf(r8).toBeNumber();
    expect(r8).to.equal(2138);

    const r9 = get(message, schema.nestedThing.evenMoreNestedThing.moreNestedBool);
    expectTypeOf(r9).toBeBoolean();
    expect(r9).to.equal(false);

    const r10 = get(message, schema.nestedThing.evenMoreNestedThing.moreNestedArray);
    expectTypeOf(r10).toEqualTypeOf<number[]>();
    expect(r10).to.deep.equal([2, 3, 5, 8]);
  });
});

describe("set", () => {
  it("should place values at indexes specified by the schema", () => {
    const schema = createTestSchema();

    const newMessage = [] as unknown[];

    set(newMessage, schema.someNumber, 420);
    set(newMessage, schema.someString, "nice");
    set(newMessage, schema.anotherNumber, 69);
    set(newMessage, schema.someBool, true);
    set(newMessage, schema.someArray, ["quick", "brown", "fox"]);
    set(newMessage, schema.nestedThing.someNestedDate, someDate);
    set(newMessage, schema.nestedThing.someNestedNumber, 1234567891234567);
    set(newMessage, schema.nestedThing.evenMoreNestedThing.moreNestedBool, false);
    set(newMessage, schema.nestedThing.evenMoreNestedThing.moreNestedNumber, 2138);
    set(newMessage, schema.nestedThing.evenMoreNestedThing.moreNestedArray, [2, 3, 5, 8]);

    const expectedMessage = message;
    expect(newMessage).to.deep.equal(expectedMessage);
  });
});

describe("toPlainObject", () => {
  it("should convert a message to properly typed plain object", () => {
    const schema = createTestSchema();

    const result = toPlainObject(message, schema);

    const expectedObject = messageAsPlainObject;

    expectTypeOf(result).toEqualTypeOf<ExpectedObjectType>();
    expect(result).to.deep.equal(expectedObject);
  });
});

describe("toIndexedKeysMessage", () => {
  it("should convert plain object to indexed-keys message", () => {
    const schema = createTestSchema();

    const result = toIndexedKeysMessage(messageAsPlainObject, schema);

    const expectedMessage = message;

    expectTypeOf(result).toEqualTypeOf<unknown[]>();
    expect(result).to.deep.equal(expectedMessage);
  });
});

export function createTestSchema() {
  // the order of schema properties is intentionally shuffled here, to test that it doesn't matter
  return {
    someNumber: i(0)<number>(),
    anotherNumber: i(1)<number>(),
    nestedThing: i(5)({
      someNestedDate: i(1)<Date>(),
      evenMoreNestedThing: i(2)({
        moreNestedNumber: i(0)<number>(),
        moreNestedBool: i(1)<boolean>(),
        moreNestedArray: i(2)<number[]>()
      }),
      someNestedNumber: i(0)<number>(),
    }),
    someString: i(2)<string>(),
    someArray: i(4)<string[]>(),
    someBool: i(3)<boolean>()
  };
}
