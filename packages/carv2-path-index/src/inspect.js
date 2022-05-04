import { readHeader, bytesReader } from '@ipld/car/decoder'
import { read } from './read.js'

/**
 * @param {import('fs').promises.FileHandle} file
 */
export async function* inspectCar(file) {
  const headerData = new Uint8Array(
    51 /* CAR v2 pragma */ + 59 /* probably enough space for CAR v1 header */
  )
  await file.read(headerData, 0, 51 + 59, 0)

  const reader = bytesReader(headerData)
  const header = await readHeader(reader)
  if (header.version !== 2) {
    throw new Error('unexpected CAR version')
  }

  yield* read(file.createReadStream({ start: header.indexOffset }))
}
