'use strict'
// Menu grouping, search ranking (incl. typo tolerance) and description excerpts. Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { menuGroup, menuDescription, searchMenu } = createLoader().load('lib/menu.ts')

const item = (name, category = 'Traditional Pastries & Mooncakes', description = '') => ({
  id: name,
  name,
  category,
  description,
  price: '3.00',
  priceId: 'p',
  image: '',
})

test('roll cakes are grouped as specialty items', () => {
  assert.equal(menuGroup(item('Chocolate Roll Cake', 'Roll Cakes')), 'Specialty Items')
  assert.equal(menuGroup(item('Japanese Cheese Cake', 'Roll Cakes')), 'Specialty Items')
  assert.equal(menuGroup(item('Coconut Bun', 'Buns')), 'Sweet Buns & Rolls')
})

test('search ranks name matches above category matches and does not mutate input', () => {
  const products = [
    item('Almond Florentine Cookies'),
    ...Array.from({ length: 8 }, (_, i) => item(i === 6 ? 'Lotus Mooncake' : 'Mooncake ' + i)),
  ]
  const { results, corrected } = searchMenu(products, 'mooncake')
  // The cookies match only through their category ("…Mooncakes"), so they rank last.
  assert.equal(results.length, 9)
  assert.equal(results[8].name, 'Almond Florentine Cookies')
  assert.equal(corrected, false)
  assert.ok(results.slice(0, 8).some(p => p.name === 'Lotus Mooncake'))
  assert.equal(products[0].name, 'Almond Florentine Cookies')
})

test('search tolerates small typos and reports them as corrected', () => {
  const { results, corrected } = searchMenu([item('Lotus Mooncake'), item('Coconut Bun', 'Buns')], 'moncake')
  assert.deepEqual(
    results.map(p => p.name),
    ['Lotus Mooncake'],
  )
  assert.equal(corrected, true)
})

test('descriptions are cut on a word boundary', () => {
  assert.equal(menuDescription('Soft bread topped with toasted coconut', 24), 'Soft bread topped with…')
  assert.equal(menuDescription('  Short   text '), 'Short text')
  assert.equal(menuDescription('x'.repeat(70)), 'x'.repeat(70))
})
