import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Square Payments API over plain HTTPS (no SDK). Cards are entered in Square's own card field on the page
// (Web Payments SDK), which gives this server a one-time token; card numbers never reach the site.
// Payments made this way use Square's "Online API" rate.

const API_VERSION = '2026-01-22'

export function squareEnvironment() {
  return process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
}
/** Public values for the card field. Null when online cake ordering is not set up. */
export function squareClientConfig() {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
  const locationId = process.env.SQUARE_LOCATION_ID
  if (!applicationId || !locationId || !process.env.SQUARE_ACCESS_TOKEN) return null
  return { applicationId, locationId, environment: squareEnvironment() } as const
}

const baseUrl = () =>
  squareEnvironment() === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'

export class SquareError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export type SquarePayment = {
  id: string
  status: 'APPROVED' | 'PENDING' | 'COMPLETED' | 'CANCELED' | 'FAILED'
  receipt_url?: string
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const response = await fetch(baseUrl() + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.SQUARE_ACCESS_TOKEN,
      'Square-Version': API_VERSION,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const first = data.errors?.[0] ?? {}
    throw new SquareError(first.detail || 'Square request failed', first.code || 'UNKNOWN', response.status)
  }
  return data as T
}

/** Customer-facing wording for a card that Square turned down. */
export function cardErrorMessage(error: unknown) {
  const code = error instanceof SquareError ? error.code : ''
  const messages: Record<string, string> = {
    CARD_DECLINED: 'Your card was declined. Please try another card.',
    INSUFFICIENT_FUNDS: 'Your card was declined (insufficient funds). Please try another card.',
    CVV_FAILURE: 'The security code (CVV) did not match. Please check it and try again.',
    ADDRESS_VERIFICATION_FAILURE: 'The ZIP code did not match your card. Please check it and try again.',
    INVALID_EXPIRATION: 'The expiration date is not valid. Please check it and try again.',
    GENERIC_DECLINE: 'Your card was declined. Please try another card.',
    CARD_DECLINED_VERIFICATION_REQUIRED: 'Your bank needs to verify this payment. Please try again.',
    INVALID_CARD: 'The card number is not valid. Please check it and try again.',
    INVALID_CARD_DATA: 'The card details are not valid. Please check them and try again.',
    PAN_FAILURE: 'The card number is not valid. Please check it and try again.',
    CARD_EXPIRED: 'This card has expired. Please use another card.',
    TRANSACTION_LIMIT: 'Your card was declined (over its limit). Please try another card.',
  }
  return messages[code] || ''
}

export async function createPayment(input: {
  sourceId: string
  idempotencyKey: string
  amountCents: number
  /** false = only hold the amount on the card until completePayment (approval). */
  autocomplete: boolean
  /** How long the hold lasts before Square releases it, in minutes (autocomplete false only). */
  holdMinutes?: number
  referenceId: string
  note: string
  email: string
  verificationToken?: string
}) {
  const { payment } = await call<{ payment: SquarePayment }>('POST', '/v2/payments', {
    source_id: input.sourceId,
    idempotency_key: input.idempotencyKey,
    amount_money: { amount: input.amountCents, currency: 'USD' },
    location_id: process.env.SQUARE_LOCATION_ID,
    autocomplete: input.autocomplete,
    ...(input.autocomplete ? {} : { delay_duration: `PT${input.holdMinutes}M`, delay_action: 'CANCEL' }),
    reference_id: input.referenceId,
    note: input.note.slice(0, 500),
    buyer_email_address: input.email,
    ...(input.verificationToken ? { verification_token: input.verificationToken } : {}),
  })
  return payment
}
export const completePayment = async (id: string) =>
  (await call<{ payment: SquarePayment }>('POST', `/v2/payments/${encodeURIComponent(id)}/complete`, {})).payment
export const cancelPayment = async (id: string) =>
  (await call<{ payment: SquarePayment }>('POST', `/v2/payments/${encodeURIComponent(id)}/cancel`, {})).payment
export const getPayment = async (id: string) =>
  (await call<{ payment: SquarePayment }>('GET', `/v2/payments/${encodeURIComponent(id)}`)).payment

/** Checks Square's webhook signature: HMAC-SHA256 of notification URL + raw body, base64. */
export function isValidWebhook(rawBody: string, signature: string | null) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  const url = process.env.SQUARE_WEBHOOK_URL
  if (!key || !url || !signature) return false
  const expected = createHmac('sha256', key)
    .update(url + rawBody)
    .digest()
  const given = Buffer.from(signature, 'base64')
  return given.length === expected.length && timingSafeEqual(given, expected)
}
