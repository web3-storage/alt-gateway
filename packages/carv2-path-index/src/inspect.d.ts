import type { CID } from 'multiformats'
import type { FileHandle } from 'fs/promises'

interface Entry {
  path: string
  cid: CID
  offset: number
  length: number
}

declare function inspectCar(file: FileHandle): AsyncGenerator<Entry>

export { inspectCar }
