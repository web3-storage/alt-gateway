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
  return toString(value)
}

/**
 * Read length prefixed CID data.
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readCID(reader) {
  const value = await readData(reader)
  return CID.decode(value)
}

/**
 * Read some length prefixed data.
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readData(reader) {
  const len = await readLength(reader)
  const { value, done } = await reader.next(len)
  if (done || !value) throw new Error('missing data')
  return value
}

/**
 * Read a length (a varint).
 *
 * @param {import('it-reader').Reader} reader
 */
export async function readLength(reader) {
  const buffer = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    const { value } = await reader.next(1)
    buffer.set(value, i)
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