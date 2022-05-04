import { readHeader, bytesReader } from '@ipld/car/decoder'
import { encode as dagCborEncode } from '@ipld/dag-cbor'
import varint from 'varint'
import { read } from './read.js'

/**
 * Create a v1 header from an array of roots.
 *
 * @param {import('multiformats').CID[]} roots
 * @returns {Uint8Array}
 */
function createCarHeader(roots) {
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
export async function* exportCar(file, path = '') {
  // read header
  const headerData = new Uint8Array(
    51 /* CAR v2 pragma */ + 59 /* probably enough space for CAR v1 header */
  )
  await file.read(headerData, 0, 51 + 59, 0)

  const header = await readHeader(bytesReader(headerData))
  if (header.version !== 2) {
    throw new Error('unexpected CAR version')
  }

  if (path === '') {
    yield* file.createReadStream({
      start: header.dataOffset,
      end: header.dataOffset + header.dataSize - 1,
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
  yield createCarHeader([entry.cid])
  // read data
  yield* file.createReadStream({
    start: header.dataOffset + entry.offset,
    end: header.dataOffset + entry.offset + entry.length - 1,
  })
}
