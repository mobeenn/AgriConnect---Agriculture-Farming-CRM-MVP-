import { handler, ok, body } from '@/lib/http.js';
import { updateNotification } from '@/services/notifications.js';

export const PUT = handler(async ({ request, actor, params }) => ok(await updateNotification(actor, params.id, await body(request))));
