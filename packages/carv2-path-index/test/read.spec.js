import * as raw from 'multiformats/codecs/raw'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import varint from 'varint'
import { concat } from 'uint8arrays'
import test from 'ava'
import { read } from '../../carv2-path-index/src/read.js'

test('should read an index', async (t) => {
  const indexData = [
    ['/images/1.png', await randomCid(), 0, 100],
    ['/images/2.png', await randomCid(), 100, 200],
    ['/images/3.png', await randomCid(), 300, 400],
  ]

  const indexEntries = indexData.map(([path, cid, offset, length]) => {
    return indexEntry(path, cid, offset, length)
  })

  const index = (async function* () {
    yield concat(indexEntries)
  })()

  let i = 0
  for await (const entry of read(index)) {
    t.is(entry.path, indexData[i][0])
    t.is(entry.cid.equals(indexData[i][1]), true)
    t.is(entry.offset, indexData[i][2])
    t.is(entry.length, indexData[i][3])
    i++
  }
})

/**
 * @param {string} path
 * @param {CID} cid
 * @param {number} offset
 * @param {number} length
 */
function indexEntry(path, cid, offset, length) {
  const pathBuf = new TextEncoder().encode(path)
  return concat([
    varint.encode(pathBuf.length),
    pathBuf,
    varint.encode(cid.bytes.length),
    cid.bytes,
    varint.encode(offset),
    varint.encode(length),
  ])
}

async function randomCid() {
  const bytes = new TextEncoder().encode(Date.now().toString() + Math.random())
  const hash = await sha256.digest(raw.encode(bytes))
  return CID.create(1, raw.code, hash)
}
