import varint from 'varint'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { concat } from 'uint8arrays/concat'
import { fromString } from 'uint8arrays/from-string'

import { bytesReader } from '@ipld/car/decoder'

const CIDV0_BYTES = {
  SHA2_256: 0x12,
  LENGTH: 0x20,
  DAG_PB: 0x70,
}

/**
 *
 * @param {Uint8Array} bytes
 * @returns
 */
export async function* process(bytes) {
  const reader = bytesReader(bytes)

  yield carV2Header(bytes.length)
  // return full car v1
  yield bytes
  await readHeader(reader)

  while (reader.pos < bytes.length) {
    const { block, start, end } = await readBlock(reader)
    const path = new TextEncoder().encode('/')

    yield concat([
      varint.encode(path.length),
      path,
      varint.encode(block.cid.byteLength),
      block.cid.bytes,
      varint.encode(start),
      varint.encode(end),
    ])
  }

  return true
}

/**
 * @param {number} size
 */
function carV2Header(size) {
  const pragma = fromString('0x0aa16776657273696f6e02', 'hex')
  const header = concat([
    pragma,
    new Uint8Array(16).fill(0),
    numberToU8(41),
    numberToU8(size),
    numberToU8(41 + size),
  ])

  return header
}

/**
 * @param {number} num
 */
function numberToU8(num) {
  const arr = new ArrayBuffer(8)
  const view = new DataView(arr)
  view.setBigInt64(0, BigInt(num))

  return new Uint8Array(arr)
}

/**
 *
 * @param {import('@ipld/car/lib/coding').BytesReader} reader
 */
async function readHeader(reader) {
  const length = await readVarint(reader)
  if (length === 0) {
    throw new Error('Invalid CAR header (zero length)')
  }
  // const header = await reader.exactly(length)
  reader.seek(length)
}

/**
 * @param {import('@ipld/car/lib/coding').BytesReader} reader
 * @returns {Promise<number>}
 */
async function readVarint(reader) {
  const bytes = await reader.upTo(8)
  if (bytes.length === 0) {
    throw new Error('Unexpected end of data')
  }
  const i = varint.decode(bytes)
  reader.seek(varint.decode.bytes)
  return i
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * Reads the leading data of an individual block from CAR data from a
 * `BytesReader`. Returns a `BlockHeader` object which contains
 * `{ cid, length, blockLength }` which can be used to either index the block
 * or read the block binary data.
 *
 * @name async decoder.readBlockHead(reader)
 * @param {import('@ipld/car/lib/coding').BytesReader} reader
 * @returns {Promise<import('@ipld/car/api').BlockHeader>}
 */
export async function readBlockHead(reader) {
  // length includes a CID + Binary, where CID has a variable length
  // we have to deal with
  const start = reader.pos
  let length = await readVarint(reader)
  if (length === 0) {
    throw new Error('Invalid CAR section (zero length)')
  }
  length += reader.pos - start
  const cid = await readCid(reader)
  const blockLength = length - Number(reader.pos - start) // subtract CID length

  return { cid, length, blockLength }
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('@ipld/car/lib/coding').BytesReader} reader
 * @returns {Promise<{block: import('@ipld/car/api').Block, start: number, end: number}>}
 */
async function readBlock(reader) {
  const { cid, blockLength } = await readBlockHead(reader)
  const start = reader.pos
  const bytes = await reader.exactly(blockLength)
  reader.seek(blockLength)
  const end = reader.pos
  return {
    block: { bytes, cid },
    start,
    end,
    // chunk: await reader.exactly(end - start),
  }
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('@ipld/car/lib/coding').BytesReader} reader
 * @returns {Promise<CID>}
 */
async function readCid(reader) {
  const first = await reader.exactly(2)
  if (first[0] === CIDV0_BYTES.SHA2_256 && first[1] === CIDV0_BYTES.LENGTH) {
    // cidv0 32-byte sha2-256
    const bytes = await reader.exactly(34)
    reader.seek(34)
    const multihash = Digest.decode(bytes)
    return CID.create(0, CIDV0_BYTES.DAG_PB, multihash)
  }

  const version = await readVarint(reader)
  if (version !== 1) {
    throw new Error(`Unexpected CID version (${version})`)
  }
  const codec = await readVarint(reader)
  const bytes = await readMultihash(reader)
  const multihash = Digest.decode(bytes)
  return CID.create(version, codec, multihash)
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('@ipld/car/lib/coding').BytesReader} reader
 * @returns {Promise<Uint8Array>}
 */
async function readMultihash(reader) {
  // | code | length | .... |
  // where both code and length are varints, so we have to decode
  // them first before we can know total length

  const bytes = await reader.upTo(8)
  varint.decode(bytes) // code
  const codeLength = varint.decode.bytes
  const length = varint.decode(bytes.subarray(varint.decode.bytes))
  const lengthLength = varint.decode.bytes
  const mhLength = codeLength + lengthLength + length
  const multihash = await reader.exactly(mhLength)
  reader.seek(mhLength)
  return multihash
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}
