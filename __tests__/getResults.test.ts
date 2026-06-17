import HLTV from '../src/'
import { sleep } from '../src/utils'
import { test, expect } from '@jest/globals'

const EVENT = 8042

test('getResults', async () => {
  await sleep(3000)
  expect(await HLTV.getResults(EVENT)).toMatchSnapshot()
  await sleep(3000)
}, 30000)
