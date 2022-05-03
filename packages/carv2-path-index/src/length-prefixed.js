import { toString } from 'uint8arrays'
import varint from 'varint'
import { CID } from 'multiformats/cid'

/**
 * Read length prefixed string data.
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readString(reader) {
  const value = await readData(reader)
  readString.bytes = readData.bytes
  return toString(value)
}
readString.bytes = 0

/**
 * Read length prefixed CID data.
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readCID(reader) {
  const value = await readData(reader)
  readCID.bytes = readData.bytes
  return CID.decode(value)
}
readCID.bytes = 0

/**
 * Read some length prefixed data.
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readData(reader) {
  const len = await readLength(reader)
  const { value, done } = await reader.next(len)
  if (done || !value) throw new Error('missing data')
  readData.bytes = readLength.bytes + value.length
  // eslint-disable-next-line unicorn/prefer-spread
  return value.slice()
}
readData.bytes = 0

/**
 * Read a length (a varint).
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readLength(reader) {
  const buffer = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    const { value, done } = await reader.next(1)
    if (done || !value) throw new Error('missing length')
    // eslint-disable-next-line unicorn/prefer-spread
    buffer.set(value.slice(), i)
    try {
      const num = varint.decode(buffer)
      readLength.bytes = varint.decode.bytes
      return num
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error
      }
    }
  }
}
readLength.bytes = 0
