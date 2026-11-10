import { notifyParty, nowIso } from './common.js';

export const deriveAvailability = (qty, requested) => (qty <= 0 ? 'Out of Stock' : requested && requested !== 'Out of Stock' ? requested : 'Available');

// Adjust stock and raise a low-stock notification when the threshold is crossed.
export function adjustStock(db, product, delta) {
  const before = product.availableQuantity;
  product.availableQuantity = Math.max(0, before + delta);
  product.availability = deriveAvailability(product.availableQuantity, product.availability);
  product.updatedAt = nowIso();
  checkLowStock(db, product, before);
}

export function checkLowStock(db, product, before) {
  const crossed = product.availableQuantity <= product.lowStockThreshold && (before === undefined || before > product.lowStockThreshold);
  if (!crossed) return;
  notifyParty(db, 'supplier', product.supplierId, {
    type: 'low_stock',
    title: product.availableQuantity <= 0 ? 'Product out of stock' : 'Low inventory alert',
    message: `${product.name} (${product.id}) has ${product.availableQuantity} ${product.unit} left. Threshold: ${product.lowStockThreshold}.`,
  });
}
