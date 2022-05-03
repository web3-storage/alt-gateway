import { reader as byteReader } from 'it-reader'
import { readString, readCID, readLength } from './length-prefixed.js'

/**
 * @param {AsyncIterable<Uint8Array>} index
 */
export async function* read(index) {
  const reader = byteReader(index)

  while (true) {
    let path
    try {
      path = await readString(reader)
    } catch (/** @type {any} */ error) {
      if (error.code === 'ERR_UNDER_READ') {
        return // finished!
      }
      throw error
    }

    const cid = await readCID(reader)
    const offset = await readLength(reader)
    const length = await readLength(reader)

    yield { path, cid, offset, length }
  }
}
