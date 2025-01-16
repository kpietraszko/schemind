# schemind
[![NPM Version](https://img.shields.io/npm/v/schemind?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fschemind)](https://www.npmjs.com/package/schemind)
![Code Coverage](https://raw.githubusercontent.com/kpietraszko/schemind/refs/heads/main/badge.svg)
[![Brotli Size](https://deno.bundlejs.com/badge?q=schemind&treeshake=[*]&config={%22compression%22:%22brotli%22})](https://bundlejs.com/?q=schemind&treeshake=%5B*%5D&config=%7B%22compression%22%3A%22brotli%22%7D)

Read and write to messages serialized as arrays (aka indexed keys messages) by defining a schema. Protocol‑agnostic.

## What?
In formats like JSON, a message normally looks something like this:
```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "johndoe@example.com",
  "birthDate": "1973-01-22",
  "address": {
    "street": "123 Main Street",
    "city": "Anytown",
    "zipcode": "12345-6789",
    "geo": {
      "lat": 42.1234,
      "lng": -71.2345
    }
  },
  "website": "www.johndoe.com"
}
```
*I'm using JSON as an example here, but schemind is essentially protocol-agnostic. I use it with MessagePack.*

If you desperately need to make this message more compact, you could alternatively serialize it like so:
```json
[
  1,
  "John Doe",
  "johndoe@example.com",
  "1973-01-22",
  [
    "123 Main Street",
    "Anytown",
    "12345-6789",
    [
      42.1234,
      -71.2345
    ]
  ],
  "www.johndoe.com"
]
```

This is sometimes referred to as a message with *indexed keys*.

**Schemind** helps you create and read such messages, if your (de)serializer doesn't support this technique.


*Note that this format obviously has some drawbacks: [recommended reading about the pros and cons](https://github.com/MessagePack-CSharp/MessagePack-CSharp#use-indexed-keys-instead-of-string-keys-contractless).*

## Installation

```shell
npm install schemind
```

## Usage
### Defining a schema
```typescript
import { buildSchema, withIndex as i } from "schemind";

const personSchema = buildSchema({
  id: i(0)<number>(),
  fullName: i(1)<string>(),
  email: i(2)<string>(),
  birthDate: i(3)<Date>(),
  address: i(4)({
    street: i(0)<string>(),
    city: i(1)<string>(),
    zipcode: i(2)<string>(),
    geo: i(3)({
      lat: i(0)<number>(),
      lng: i(1)<number>()
    })
  }),
  website: i(5)<string>()
});
```
Every field needs to have its index in the message specified using `withIndex`.  
Note that this also goes for nested objects, such as `address`.

* If you accidentally pass the same index twice, or you forget to call `withIndex` on any nested object, `buildSchema` will throw an `InvalidSchemaError`.   
* If you forget to call `buildSchema` on your object, you'll get a type error when trying to use your schema.


### Reading from a message
Say you have an incoming message (from network/storage/whatever) like this:
```typescript
const incomingMessage = JSON.parse(`
[
  1,
  "John Doe",
  "johndoe@example.com",
  "1973-01-22",
  [
    "123 Main Street",
    "Anytown",
    "12345-6789",
    [
      42.1234,
      -71.2345
    ]
  ],
  "www.johndoe.com"
]`);
```

There are 2 ways to read this message:
#### • `toPlainObject`
This is the more convenient option.
```typescript
import { toPlainObject } from "schemind";

const messageAsObject = toPlainObject(incomingMessage, personSchema);
//    ^ this has the following type:
//   {
//     id: number,
//     fullName: string,
//     email: string,
//     birthDate: Date,
//     address: {
//       street: string,
//       city: string,
//       zipcode: string,
//       geo: {
//         lat: number,
//         lng: number
//       }
//     },
//     website: string
//   }
```
#### • `get`
This is the more performant option – it doesn't allocate on the heap.
```typescript
const fullName = get(incomingMessage, personSchema.fullName);
//    ^ this is of type string

const latitude = get(incomingMessage, personSchema.address.geo.lat);
//    ^ this is of type number
```
Alternatively, you can use the method "get". It works in the exact same way.
```typescript
const fullName = personSchema.fullName.get(incomingMessage);
const latitude = personSchema.address.geo.lat.get(incomingMessage);
```

### Writing
There are 2 ways to write a message.

#### • `toIndexedKeysMessage`
```typescript
import { toIndexedKeysMessage } from "schemind";

const objectToSerialize = {
  id: 1,
  fullName: "John Doe",
  email: "johndoe@example.com",
  birthDate: new Date(),
  address: {
    street: "123 Main Street",
    city: "Anytown",
    zipcode: "12345-6789",
    geo: {
      lat: 42.1234,
      lng: -71.2345
    }
  },
  website: "www.johndoe.com"
};

const message = toIndexedKeysMessage(objectToSerialize, personSchema);
//    ^ this is an array that's the same as the "incomingMessage" in the previous section

// JSON.stringify(message) or whatever
```

#### • `set`

```typescript
import { set } from "schemind";

const newMessage: unknown[] = [];
set(newMessage, personSchema.fullName, "John Doe");
set(newMessage, personSchema.address.geo.lat, 42.1234);
//                                            ^ this is type-checked
// etc
```
Alternatively, you can use the method "set". It works in the exact same way.
```typescript
personSchema.fullName.set(newMessage, "John Doe");
personSchema.address.geo.lat.set(newMessage, 42.1234);
```

## FAQ
### Shouldn't this be an extension of a serializer?
Probably.

### Wouldn't it be better to use protobuf at this point?
Possibly. But if you're already using JSON / MessagePack / CBOR etc. in your app, and you need more compact messages for some features — *schemind* could be useful.

Additionally, in some languages (backend or frontend) there's a MessagePack or JSON implementation that's faster, or allocates less memory, than protobuf.

### Why would I use `get` if it's inconvenient?
The `get` function prioritizes performance over convenience. The main goal here is to avoid any heap allocations (beyond what your deserializer allocates). I use *schemind* in performance-critical scenarios, where avoiding GC pauses is crucial.  
Use the `toPlainObject` function instead, if you don't mind some extra allocations.

## Related work
* [MessagePack-CSharp (.NET)](https://github.com/MessagePack-CSharp/MessagePack-CSharp#use-indexed-keys-instead-of-string-keys-contractless)
* [Nerdbank.MessagePack (.NET)](https://aarnott.github.io/Nerdbank.MessagePack/docs/customizing-serialization.html?q=indexed#serialize-objects-with-indexes-for-keys)


* [Idein/msgpack-schema (Rust)](https://github.com/Idein/msgpack-schema)
* [serde (Rust)](https://github.com/serde-rs/serde/issues/959)