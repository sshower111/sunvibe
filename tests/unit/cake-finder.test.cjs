'use strict'
// Size suggestion in the order flow: size suggestions and starting prices.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { recommend, startingPrice, deliveryFee, smallestFit } = createLoader().load('lib/cake-finder.ts')
const { cakeCatalog } = createLoader().load('lib/cake-catalog.ts')
const spec = value => cakeCatalog.find(cake => cake.value === value)

test('suggests the smallest cake of the chosen shape that serves everyone', () => {
  assert.equal(recommend(8, 'Round', 'Custard').best.value, '6-inch')
  assert.equal(recommend(9, 'Round', 'Custard').best.value, '8-inch')
  assert.equal(recommend(30, 'Sheet', 'Mango').best.value, 'half-sheet')
  assert.equal(recommend(50, 'Multi-tier', 'Mango').best.value, 'tier-8-12')
  assert.equal(smallestFit(121, 'Round'), null)
})

test('offers the next size up and the same guest count in other shapes', () => {
  const result = recommend(20, 'Round', 'Strawberry')
  assert.equal(result.best.value, '10-inch')
  assert.equal(result.bigger.value, '12-inch')
  assert.deepEqual(
    result.others.map(cake => cake.value),
    ['quarter-sheet', 'tier-6-10'],
  )
})

test('"Not sure" picks the cheaper of round and sheet, never tiered unless needed', () => {
  // 20 guests, custard: 10" round $62 vs 1/4 sheet $56.
  assert.equal(recommend(20, 'Any', 'Custard').best.value, 'quarter-sheet')
  // 12 guests: 8" round is the only small fit that is cheapest.
  assert.equal(recommend(12, 'Any', 'Custard').best.value, '8-inch')
  // 30 guests, mango: 12" round and 1/2 sheet are both $138; the sheet serves more.
  assert.equal(recommend(30, 'Any', 'Mango').best.value, 'half-sheet')
  // 130 guests: only the 3-tier serves that many.
  assert.equal(recommend(130, 'Any', 'Custard').best.value, 'tier-10-14-16')
})

test('switches shape when the chosen one does not go that big, and gives up past the largest cake', () => {
  const sheet = recommend(110, 'Sheet', 'Custard')
  assert.equal(sheet.switched, true)
  assert.equal(sheet.best.value, '20-inch')
  const huge = recommend(200, 'Round', 'Custard')
  assert.equal(huge.best, null)
  assert.equal(huge.switched, false)
})

test('prices follow the filling column; tiered has one price; open fillings have no exact price', () => {
  assert.equal(startingPrice(spec('8-inch'), 'Custard'), 36)
  assert.equal(startingPrice(spec('8-inch'), 'Strawberry Banana'), 40)
  assert.equal(startingPrice(spec('8-inch'), 'Taro'), 42)
  assert.equal(startingPrice(spec('8-inch'), 'Durian'), 60)
  assert.equal(startingPrice(spec('8-inch'), 'Please recommend'), null)
  assert.equal(startingPrice(spec('tier-8-12'), 'Please recommend'), 238)
})

test('delivery fees come from the delivery options', () => {
  assert.equal(deliveryFee('Pickup'), 0)
  assert.equal(deliveryFee('Local delivery (within 10 miles) — $30'), 30)
  assert.equal(deliveryFee('Casino / Hotel delivery — $50'), 50)
  assert.equal(deliveryFee('Other delivery — please advise'), null)
})
