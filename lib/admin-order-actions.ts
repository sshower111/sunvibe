import type { StoredCakeOrder } from './cake-order'

// What can be done with a cake order in admin, depending on its status. The main actions show as buttons on the
// order; the rest are in its "⋯" menu, so each order takes little space on a phone.

export type OrderActionId =
  | 'approve'
  | 'decline'
  | 'picked_up'
  | 'resend_link'
  | 'copy_link'
  | 'paid_offline'
  | 'text_kitchen'
  | 'copy_kitchen'
  | 'call'
  | 'email'
  | 'not_picked_up'
  | 'delete'

/** Every action available for this order, in the order they are listed. */
export function orderActionIds(o: StoredCakeOrder): OrderActionId[] {
  const ids: OrderActionId[] = []
  if (o.status === 'awaiting_approval') ids.push('approve', 'decline')
  if (o.status === 'paid' || o.status === 'deposit_paid') ids.push('picked_up')
  if (o.kind === 'custom' && (o.status === 'awaiting_payment' || o.status === 'expired'))
    ids.push('resend_link', 'copy_link')
  if (o.status === 'expired' || o.status === 'declined') ids.push('paid_offline')
  ids.push('text_kitchen', 'copy_kitchen', 'call', 'email')
  if (o.status === 'picked_up') ids.push('not_picked_up')
  if (o.test) ids.push('delete')
  return ids
}

/** True for the actions shown as buttons on the order itself; the others go in its "⋯" menu. */
// At most two per order: the next step for its status. Kitchen texts are covered by the pinned
// "Approved — not sent to kitchen" list, and rare or undoing actions stay in the menu.
export function isPrimaryAction(o: StoredCakeOrder, id: OrderActionId): boolean {
  switch (id) {
    case 'approve':
    case 'decline':
      return o.status === 'awaiting_approval'
    case 'picked_up':
      return o.status === 'paid' || o.status === 'deposit_paid'
    case 'resend_link':
      return o.kind === 'custom' && (o.status === 'awaiting_payment' || o.status === 'expired')
    default:
      return false
  }
}
