import { handler, ok, body } from '@/lib/http.js';
import { updateRequest } from '@/services/orders.js';

export const PUT = handler(async ({ request, actor, params }) => ok(await updateRequest(actor, params.id, await body(request))));
