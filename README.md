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
TODO

## FAQ
### Shouldn't this be an extension of a serializer?
Probably.

### Wouldn't it be better to use protobuf at this point?
Possibly. But if you're already using JSON / MessagePack / CBOR etc. in your app, and you need more compact messages for some features — *schemind* could be useful.

Additionally, in some languages (backend or frontend) there's a MessagePack or JSON implementation that's faster, or allocates less memory, than protobuf.

### Why is `get` so inconvenient?
The `get` function prioritizes performance over convenience. The main goal here is to avoid any heap allocations (beyond what your deserializer allocates). I use *schemind* in performance-critical scenarios, where avoiding GC pauses is crucial.  
Use the `toPlainObject` function instead, if you don't mind some extra allocations.

## Related work
* [MessagePack-CSharp (.NET)](https://github.com/MessagePack-CSharp/MessagePack-CSharp#use-indexed-keys-instead-of-string-keys-contractless)
* [Nerdbank.MessagePack (.NET)](https://aarnott.github.io/Nerdbank.MessagePack/docs/customizing-serialization.html?q=indexed#serialize-objects-with-indexes-for-keys)


* [Idein/msgpack-schema (Rust)](https://github.com/Idein/msgpack-schema)
* [serde (Rust)](https://github.com/serde-rs/serde/issues/959)