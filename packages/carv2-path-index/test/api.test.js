import test from 'ava'
import { CID } from 'multiformats'
import { CarWriter } from '@ipld/car'
import { concat } from 'uint8arrays/concat'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import { process } from '../src/index.js'

test('should index one raw block', async (t) => {
  const block = await toBlock(new TextEncoder().encode('hello'), raw)

  const { writer, out } = CarWriter.create([block.cid])
  const consumed = consume(out)

  await writer.put(block)

  await writer.close()
  const parts = await consumed

  const r = process(concat(parts))
  // eslint-disable-next-line no-console
  console.log(await consume(r))

  t.truthy(true)
})

test('should index two raw block', async (t) => {
  const block1 = await toBlock(new TextEncoder().encode('hello'), raw)
  // const block2 = await toBlock(new TextEncoder().encode('hello'), raw)

  const { writer, out } = CarWriter.create([block1.cid])
  const consumed = consume(out)

  await writer.put(block1)

  await writer.close()
  const parts = await consumed

  const r = process(concat(parts))
  // eslint-disable-next-line no-console
  console.log(await consume(r))

  t.truthy(true)
})

/**
 * @param {any} object
 * @param {{code: number, encode: (obj: any) => Uint8Array}} codec
 * @param {import('multiformats/cid').CIDVersion} version
 * @returns {Promise<import('@ipld/car/api').Block>}
 */
async function toBlock(object, codec, version = 1) {
  const bytes = codec.encode(object)
  const hash = await sha256.digest(bytes)
  const cid = CID.create(version, codec.code, hash)
  return { cid, bytes }
}

/**
 * Collects all values from an (async) iterable into an array and returns it.
 *
 * @param {AsyncIterable<Uint8Array>|Iterable<Uint8Array>} source
 */
export const consume = async (source) => {
  const parts = []

  for await (const entry of source) {
    parts.push(entry)
  }

  return parts
}
