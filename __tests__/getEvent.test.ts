import HLTV from '../src/'
import { sleep } from '../src/utils'
import { test, expect } from '@jest/globals'

const BASIC_EVENT = 8042
const FUTURE_EVENT = 8297

test('getEvent', async () => {
  await sleep(3000)
  expect(await HLTV.getEvent({ id: BASIC_EVENT })).toMatchSnapshot()
  await sleep(3000)
  expect(await HLTV.getEvent({ id: FUTURE_EVENT })).toMatchSnapshot()
  await sleep(3000)
}, 30000)
