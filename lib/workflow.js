export const ORDER_STATUSES = [
  'Pending', 'Quotation Submitted', 'Accepted', 'Processing',
  'Dispatched', 'Delivered', 'Completed', 'Rejected', 'Cancelled',
];
export const TERMINAL_STATUSES = ['Completed', 'Rejected', 'Cancelled'];
export const PRE_ORDER_STATUSES = ['Pending', 'Quotation Submitted', 'Rejected', 'Cancelled'];
export const ORDER_STAGE_STATUSES = ['Accepted', 'Processing', 'Dispatched', 'Delivered', 'Completed'];
export const RESERVED_STATUSES = ['Accepted', 'Processing', 'Dispatched', 'Delivered'];

// Direct status changes (PUT /api/orders/:id). Quotations move orders to
// "Quotation Submitted" and "Accepted" through the quotation endpoints.
const TABLE = {
  supplier: {
    Pending: ['Rejected'],
    'Quotation Submitted': ['Rejected'],
    Accepted: ['Processing'],
    Processing: ['Dispatched'],
    Dispatched: ['Delivered'],
  },
  buyer: {
    Pending: ['Cancelled'],
    'Quotation Submitted': ['Cancelled'],
    Delivered: ['Completed'],
  },
};

export function canTransition(role, from, to) {
  if (from === to) return false;
  if (role === 'admin') return ORDER_STATUSES.includes(to);
  return (TABLE[role]?.[from] || []).includes(to);
}
export function allowedTransitions(role, from) {
  if (role === 'admin') return ORDER_STATUSES.filter((s) => s !== from);
  return TABLE[role]?.[from] || [];
}
