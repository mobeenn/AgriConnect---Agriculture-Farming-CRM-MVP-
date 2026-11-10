import { handler, okPage, query } from '@/lib/http.js';
import { listNotifications } from '@/services/notifications.js';

export const GET = handler(async ({ request, actor }) => okPage(await listNotifications(actor, query(request))));
