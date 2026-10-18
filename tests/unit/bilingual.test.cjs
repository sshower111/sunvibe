'use strict'
// Splitting "English 中文" menu names for the large Chinese label. Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { splitName } = createLoader().load('lib/bilingual.ts')

test('splits English and Chinese parts', () => {
  assert.deepEqual(splitName('Milky Pineapple Bun 奶油菠蘿包'), { en: 'Milky Pineapple Bun', zh: '奶油菠蘿包' })
  assert.deepEqual(splitName('BBQ Pork Bun  叉燒包 '), { en: 'BBQ Pork Bun', zh: '叉燒包' })
})

test('names without Chinese stay whole', () => {
  assert.deepEqual(splitName('Hot Dog Bun'), { en: 'Hot Dog Bun', zh: '' })
})

test('a name written only in Chinese is the main name', () => {
  assert.deepEqual(splitName('月餅'), { en: '月餅', zh: '' })
})
