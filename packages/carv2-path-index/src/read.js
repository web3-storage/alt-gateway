import { reader as bytesReader } from 'it-reader'
import { PATH_INDEX_CODEC } from './constants.js'
import { readString, readCID, readLength } from './length-prefixed.js'

/**
 * @param {AsyncIterable<Uint8Array>} index
 */
export async function* read(index) {
  const reader = bytesReader(index)
  const formatCodec = await readLength(reader)
  if (formatCodec !== PATH_INDEX_CODEC) {
    throw new Error('unexpected index codec')
  }

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
