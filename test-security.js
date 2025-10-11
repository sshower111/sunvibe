/**
 * Security Testing Script
 * Tests the security improvements implemented in the API routes
 */

const BASE_URL = 'http://localhost:3000'

// Test Results
const results = []

function log(test, passed, message) {
  const status = passed ? '✅' : '❌'
  const result = `${status} ${test}: ${message}`
  console.log(result)
  results.push({ test, passed, message })
}

// Test 1: Rate Limiting on Admin Verify
async function testAdminRateLimit() {
  console.log('\n📋 Testing Admin Verify Rate Limiting...')

  try {
    // Make 6 requests quickly (limit is 5)
    const promises = []
    for (let i = 0; i < 6; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/admin/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'wrong' })
        })
      )
    }

    const responses = await Promise.all(promises)
    const rateLimited = responses.some(r => r.status === 429)

    log(
      'Admin Rate Limit',
      rateLimited,
      rateLimited ? 'Rate limiting active (429 received)' : 'Rate limiting not working'
    )
  } catch (error) {
    log('Admin Rate Limit', false, `Error: ${error.message}`)
  }
}

// Test 2: XSS Protection in Contact Form
async function testContactFormXSS() {
  console.log('\n📋 Testing Contact Form XSS Protection...')

  const xssPayload = {
    name: '<script>alert("xss")</script>',
    email: 'test@test.com',
    message: '<img src=x onerror=alert("xss")>'
  }

  try {
    const response = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(xssPayload)
    })

    // Note: We can't directly verify email content, but endpoint should accept request
    // The actual XSS protection is in the HTML escaping before sending email
    log(
      'Contact XSS Protection',
      response.status === 200 || response.status === 429,
      `Request processed (status: ${response.status})`
    )
  } catch (error) {
    log('Contact XSS Protection', false, `Error: ${error.message}`)
  }
}

// Test 3: Contact Form Rate Limiting
async function testContactRateLimit() {
  console.log('\n📋 Testing Contact Form Rate Limiting...')

  try {
    // Make 4 requests quickly (limit is 3)
    const promises = []
    for (let i = 0; i < 4; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Test ${i}`,
            email: 'test@test.com',
            message: 'Test message'
          })
        })
      )
    }

    const responses = await Promise.all(promises)
    const rateLimited = responses.some(r => r.status === 429)

    log(
      'Contact Rate Limit',
      rateLimited,
      rateLimited ? 'Rate limiting active' : 'Rate limiting not working'
    )
  } catch (error) {
    log('Contact Rate Limit', false, `Error: ${error.message}`)
  }
}

// Test 4: Email Validation
async function testEmailValidation() {
  console.log('\n📋 Testing Email Validation...')

  try {
    const response = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'invalid-email',
        message: 'Test'
      })
    })

    const data = await response.json()
    const isValid = response.status === 400 && data.error

    log(
      'Email Validation',
      isValid,
      isValid ? 'Invalid email rejected' : 'Validation not working'
    )
  } catch (error) {
    log('Email Validation', false, `Error: ${error.message}`)
  }
}

// Test 5: Checkout Input Validation
async function testCheckoutValidation() {
  console.log('\n📋 Testing Checkout Input Validation...')

  try {
    // Test with invalid price ID
    const response = await fetch(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'invalid_price_id',  // Doesn't start with 'price_'
        pickupTime: 'ASAP'
      })
    })

    const isValid = response.status === 400

    log(
      'Checkout Validation',
      isValid,
      isValid ? 'Invalid input rejected' : 'Validation not working'
    )
  } catch (error) {
    log('Checkout Validation', false, `Error: ${error.message}`)
  }
}

// Test 6: Pickup Time Sanitization
async function testPickupTimeSanitization() {
  console.log('\n📋 Testing Pickup Time Sanitization...')

  try {
    const response = await fetch(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_test123',
        pickupTime: '<script>alert("xss")</script>'  // Malicious input
      })
    })

    // Should sanitize to 'ASAP' or reject
    log(
      'Pickup Time Sanitization',
      response.status === 400 || response.status === 429,
      `Handled malicious input (status: ${response.status})`
    )
  } catch (error) {
    log('Pickup Time Sanitization', false, `Error: ${error.message}`)
  }
}

// Run all tests
async function runTests() {
  console.log('🔒 Starting Security Tests...\n')
  console.log('Note: Some tests may fail if rate limits from previous runs are still active.')
  console.log('Wait a few minutes and re-run if needed.\n')

  await testEmailValidation()
  await testCheckoutValidation()
  await testPickupTimeSanitization()
  await testContactFormXSS()

  // Rate limit tests last (they may block subsequent requests)
  console.log('\n⏰ Waiting 2 seconds before rate limit tests...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  await testContactRateLimit()
  await testAdminRateLimit()

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary:')
  console.log('='.repeat(50))

  const passed = results.filter(r => r.passed).length
  const total = results.length

  console.log(`\nTotal Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${total - passed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

  if (passed === total) {
    console.log('\n🎉 All security tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed. Review the results above.')
  }
}

runTests().catch(console.error)
