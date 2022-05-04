#!/usr/bin/env node

import sade from 'sade'
import fs from 'fs'
import * as Carnonical from 'carnonical'
import * as PathIndex from 'carv2-path-index'
import { inspectCar } from 'carv2-path-index/inspect'
import { CarReader } from '@ipld/car'
import { pipeline } from 'stream/promises'
import Table from 'cli-table'

const prog = sade('highway')

prog.version('0.0.0')

prog
  .command('index <src>')
  .describe('Create path index for the passed CAR.')
  .option('-o, --output', 'Write output to a file.')
  .example('index my.car -o my-indexed.car')
  .action(async (src, opts) => {
    const input = await CarReader.fromIterable(fs.createReadStream(src))
    const canon = await Carnonical.transform(input)
    await pipeline(
      PathIndex.process(canon),
      opts.output ? fs.createWriteStream(opts.output) : process.stdout
    )
  })
  .command('inspect <src>')
  .describe('List index contents for the given CAR file.')
  .example('inspect my-indexed.car')
  .action(async (src) => {
    const table = new Table({
      head: ['Path', 'CID', 'Offset', 'Length'],
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: ' ',
      },
      style: { 'padding-left': 0, 'padding-right': 0 },
    })

    const file = await fs.promises.open(src, fs.constants.O_RDONLY)
    for await (const { path, cid, offset, length } of inspectCar(file)) {
      table.push([path, cid.toString(), offset, length])
    }
    // eslint-disable-next-line no-console
    console.log(table.toString())
    await file.close()
  })

prog.parse(process.argv)
