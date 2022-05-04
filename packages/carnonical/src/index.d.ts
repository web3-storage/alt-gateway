import type { CarReader } from '@ipld/car/api'

declare function transform(car: CarReader): Promise<AsyncIterable<Uint8Array>>
declare function validate(car: CarReader): Promise<boolean>

export { transform, validate }
