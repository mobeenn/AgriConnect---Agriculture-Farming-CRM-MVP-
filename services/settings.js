import { readDb, mutate } from '../lib/db.js';
import { requireActor, requireRole } from '../lib/authz.js';
import { validate } from '../lib/validation.js';
import { logActivity } from './common.js';

export async function getCategories(actor) {
  requireActor(actor);
  return readDb().categories;
}
export async function getSettings(actor) {
  requireRole(actor, 'admin');
  return readDb().settings;
}
export async function updateSettings(actor, input) {
  requireRole(actor, 'admin');
  const clean = validate(input, {
    platformName: { type: 'string', required: true, maxLen: 60, label: 'Platform name' },
    supportEmail: { type: 'email', required: true, label: 'Support email' },
    lowStockDefault: { type: 'int', required: true, min: 0, max: 100000, label: 'Default low-stock threshold' },
  }, { partial: true });
  return mutate((db) => {
    db.settings = { ...db.settings, ...clean };
    logActivity(db, actor, 'settings.update', 'SETTINGS', 'Platform settings were updated');
    return db.settings;
  });
}
