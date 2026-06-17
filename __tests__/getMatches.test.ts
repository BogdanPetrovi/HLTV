import HLTV from '../src/'
import { sleep } from '../src/utils'
import { test, expect } from '@jest/globals'

const OLD_EVENT = 8042
const ONGOING_EVENT = 8301

test('getMatches', async () => {
  await sleep(3000)
  expect(await HLTV.getMatches(OLD_EVENT)).toHaveLength(0)
  await sleep(3000)
  expect(await HLTV.getMatches(ONGOING_EVENT)).not.toHaveLength(0)
  await sleep(3000)
}, 30000)
