# Carnonical

Canonical CAR block ordering.

This repo is the spec for block ordering within CAR files.

Block order is depth-first traversal order.

```js
// API
validate(car: CarReader): Promise<boolean> // make sure in carninical order (unixfs only)
transform(car: CarReader): Promise<CarReader> // gives you back a CAR in carnonical order (unixfs only)
```
