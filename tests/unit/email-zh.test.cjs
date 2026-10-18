'use strict'
// Traditional Chinese email copy: every option the forms offer has a translation; other text is left alone.
// Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { load } = createLoader()
const { zhOption, translatableOptions, zhText } = load('lib/email-zh.ts')

test('every form option has a Chinese translation', () => {
  const missing = translatableOptions.filter(value => zhOption(value) === value)
  assert.deepEqual(missing, [])
})

test('customer text and price ranges are returned unchanged', () => {
  assert.equal(zhOption('Happy 5th birthday Mia!'), 'Happy 5th birthday Mia!')
  assert.equal(zhOption('$100–$200'), '$100–$200')
  assert.equal(zhOption('2-Tier · 6" / 10"'), '兩層 · 6" / 10"')
})

test('plain-text block starts on its own line', () => {
  assert.equal(zhText('標題', [['姓名', 'Mia']]), '\n— 中文 —\n標題\n姓名：Mia')
})
