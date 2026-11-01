import type { StoredCakeOrder } from './cake-order'

// What can be done with a cake order in admin, depending on its status. In the order's side panel the main actions
// show as buttons and the rest are in its "⋯" menu.

export type OrderActionId =
  | 'review'
  | 'picked_up'
  | 'resend_link'
  | 'copy_link'
  | 'paid_offline'
  | 'text_kitchen'
  | 'copy_kitchen'
  | 'call'
  | 'email'
  | 'not_picked_up'
  | 'refund'
  | 'delete'

/** Waiting on the bakery's answer: card held, or the hold ended before approval. */
export const needsAnswer = (o: Pick<StoredCakeOrder, 'status'>) =>
  o.status === 'awaiting_approval' || o.status === 'checking_kitchen' || o.status === 'hold_expired'

/** Every action available for this order, in the order they are listed. */
export function orderActionIds(o: StoredCakeOrder): OrderActionId[] {
  const ids: OrderActionId[] = []
  if (needsAnswer(o)) ids.push('review')
  if (o.status === 'paid' || o.status === 'deposit_paid') ids.push('picked_up')
  if ((o.kind === 'custom' || o.payBy) && (o.status === 'awaiting_payment' || o.status === 'expired'))
    ids.push('resend_link', 'copy_link')
  if (o.status === 'expired' || o.status === 'declined' || o.status === 'hold_expired') ids.push('paid_offline')
  ids.push('text_kitchen', 'copy_kitchen', 'call', 'email')
  if (o.status === 'picked_up') ids.push('not_picked_up')
  if ((o.status === 'paid' || o.status === 'deposit_paid' || o.status === 'picked_up') && o.paymentId)
    ids.push('refund')
  if (o.test) ids.push('delete')
  return ids
}

/** True for the actions shown as buttons on the order itself; the others go in its "⋯" menu. */
// At most two per order: the next step for its status. Rare or undoing actions stay in the menu.
export function isPrimaryAction(o: StoredCakeOrder, id: OrderActionId): boolean {
  switch (id) {
    case 'review':
      return true
    case 'picked_up':
      return o.status === 'paid' || o.status === 'deposit_paid'
    case 'resend_link':
      return (o.kind === 'custom' || !!o.payBy) && (o.status === 'awaiting_payment' || o.status === 'expired')
    default:
      return false
  }
}
