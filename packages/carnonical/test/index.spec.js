/* eslint-env mocha */
import assert from 'assert'
import { CarReader, CarWriter } from '@ipld/car'
import * as raw from 'multiformats/codecs/raw'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as dagPB from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import fs from 'fs'
import path from 'path'
import { transform, validate } from '../src/index.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

describe('carnonical', () => {
  it('should validate single raw block CAR', async () => {
    const block = await rawBlock('test data')
    const car = await blocksToCar(block.cid, [block])
    const res = await validate(car)
    assert.equal(res, true)
  })

  it('should validate non-canonical unixfs directory with raw block links', async () => {
    const blocks = [await rawBlock('test data'), await rawBlock('test data2')]

    const dirBlock = await unixfsDirBlock([
      {
        Name: 'first.txt',
        Tsize: blocks[0].bytes.length,
        Hash: blocks[0].cid,
      },
      {
        Name: 'second.txt',
        Tsize: blocks[1].bytes.length,
        Hash: blocks[1].cid,
      },
    ])

    blocks.push(dirBlock)

    const car = await blocksToCar(dirBlock.cid, blocks)
    const res = await validate(car)
    assert.equal(res, false)
  })

  it('should validate canonical unixfs directory with raw block links', async () => {
    const blocks = [await rawBlock('test data'), await rawBlock('test data2')]

    const dirBlock = await unixfsDirBlock([
      {
        Name: 'first.txt',
        Tsize: blocks[0].bytes.length,
        Hash: blocks[0].cid,
      },
      {
        Name: 'second.txt',
        Tsize: blocks[1].bytes.length,
        Hash: blocks[1].cid,
      },
    ])

    const car = await blocksToCar(dirBlock.cid, [dirBlock, ...blocks])
    const res = await validate(car)
    assert.equal(res, true)
  })

  it('should validate ipfs-car output is non-canonical', async () => {
    const stream = fs.createReadStream(
      path.join(__dirname, 'fixtures', 'non-canonical.car')
    )
    const car = await CarReader.fromIterable(stream)
    const res = await validate(car)
    assert.equal(res, false)
  })

  it('should transform no-canonical to canonical', async function () {
    const stream = fs.createReadStream(
      path.join(__dirname, 'fixtures', 'non-canonical.car')
    )
    const car = await CarReader.fromIterable(stream)
    const out = await transform(car)
    const transformedCar = await CarReader.fromIterable(out)
    const res = await validate(transformedCar)
    assert.equal(res, true)
  })
})

/**
 * @param {string} data
 */
async function rawBlock(data) {
  const bytes = new TextEncoder().encode(data)
  const hash = await sha256.digest(raw.encode(bytes))
  const cid = CID.create(1, raw.code, hash)
  return { cid, bytes }
}

/**
 * @param {import('@ipld/dag-pb').PBLink[]} links
 */
async function unixfsDirBlock(links) {
  const bytes = dagPB.encode({
    Data: new UnixFS({ type: 'directory' }).marshal(),
    Links: links,
  })

  const hash = await sha256.digest(bytes)
  const cid = CID.create(1, dagPB.code, hash)

  return { cid, bytes }
}

/**
 * @param {import('multiformats').CID} rootCid
 * @param {import('@ipld/car/api').Block[]} blocks
 */
async function blocksToCar(rootCid, blocks) {
  const { writer, out } = CarWriter.create([rootCid])
  ;(async () => {
    for (const b of blocks) {
      await writer.put(b)
    }
    await writer.close()
  })()
  return CarReader.fromIterable(out)
}
