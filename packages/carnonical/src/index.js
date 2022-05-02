import * as raw from 'multiformats/codecs/raw'
import * as dagPB from '@ipld/dag-pb'
import { CarWriter } from '@ipld/car'

/**
 * @param {import('@ipld/car').CarReader} car
 */
export async function validate(car) {
  const roots = await car.getRoots()
  if (roots.length !== 1) {
    throw new Error('unexpected number of roots')
  }
  let nextCids = [roots[0]]
  const blocks = car.blocks()

  while (true) {
    const { value: block, done } = await blocks.next()
    const nextCid = nextCids.shift()
    if (!nextCid && done) {
      return true
    }
    if (done) {
      return false
    }
    if (!block.cid.equals(nextCid)) {
      return false
    }
    switch (nextCid.code) {
      case raw.code:
        break
      case dagPB.code: {
        const data = dagPB.decode(block.bytes)
        nextCids = [...data.Links.map((l) => l.Hash), ...nextCids]
        break
      }
      default:
        throw new Error(`unsupported codec: ${nextCid.code}`)
    }
  }
}

/**
 * @param {import('@ipld/car').CarReader} car
 */
export async function transform(car) {
  const roots = await car.getRoots()
  if (roots.length !== 1) {
    throw new Error('unexpected number of roots')
  }

  let nextCids = [roots[0]]
  const blockstore = new Map()
  const blocks = car.blocks()

  const getBlock = async (cid) => {
    const block = blockstore.get(cid.toString())
    if (block) {
      return block
    }
    while (true) {
      const { value, done } = await blocks.next()
      if (value) {
        if (value.cid.equals(cid)) {
          return value
        }
        blockstore.set(value.cid.toString(), value)
      }
      if (done) {
        throw new Error(`missing block: ${cid}`)
      }
    }
  }

  const { writer, out } = CarWriter.create(roots)

  ;(async () => {
    while (true) {
      const nextCid = nextCids.shift()
      if (!nextCid) break
      const block = await getBlock(nextCid)
      await writer.put(block)

      switch (nextCid.code) {
        case raw.code:
          break
        case dagPB.code: {
          const data = dagPB.decode(block.bytes)
          nextCids = [...data.Links.map((l) => l.Hash), ...nextCids]
          break
        }
        default:
          throw new Error(`unsupported codec: ${nextCid.code}`)
      }
    }
    await writer.close()
  })()

  return out
}
