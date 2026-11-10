import { handler, ok } from '@/lib/http.js';
import { markAllRead } from '@/services/notifications.js';

export const POST = handler(async ({ actor }) => ok(await markAllRead(actor)));
