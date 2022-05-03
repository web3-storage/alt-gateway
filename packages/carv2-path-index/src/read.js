import { reader as bytesReader } from 'it-reader'
import * as CarDecoder from '@ipld/car/decoder'
import { encode as dagCborEncode } from '@ipld/dag-cbor'
import varint from 'varint'
import { readString, readCID, readLength } from './length-prefixed.js'

export const PATH_INDEX_CODEC = 1026

/**
 * Create a v1 header from an array of roots.
 *
 * @param {import('multiformats').CID[]} roots
 * @returns {Uint8Array}
 */
function createHeader(roots) {
  const headerBytes = dagCborEncode({ version: 1, roots })
  const varintBytes = varint.encode(headerBytes.length)
  const header = new Uint8Array(varintBytes.length + headerBytes.length)
  header.set(varintBytes, 0)
  header.set(headerBytes, varintBytes.length)
  return header
}

/**
 * @param {import('fs').promises.FileHandle} file
 * @param {string} path
 */
export async function* exportCar(file, path) {
  // read header
  const headerRes = await file.read({ offset: 0, position: 11, length: 40 })

  const header = await CarDecoder.readHeader(
    CarDecoder.bytesReader(headerRes.buffer)
  )
  if (header.version !== 2) {
    throw new Error('unexpected CAR version')
  }

  if (path === '/') {
    yield* file.createReadStream({
      start: header.dataOffset,
      end: header.dataOffset + header.dataSize,
    })
    return
  }

  const index = read(file.createReadStream({ start: header.indexOffset }))
  let entry
  for await (const e of index) {
    if (e.path === path) {
      entry = e
      break
    }
  }
  // TODO: directory?
  if (!entry) throw new Error('not found')
  // yield CARv1 header
  yield createHeader([entry.cid])
  // read data
  yield* file.createReadStream({
    start: entry.offset,
    end: entry.offset + entry.length,
  })
}

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
