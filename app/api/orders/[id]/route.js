import { handler, ok, body } from '@/lib/http.js';
import { getOrder, updateOrder } from '@/services/orders.js';

export const GET = handler(async ({ actor, params }) => ok(await getOrder(actor, params.id)));
export const PUT = handler(async ({ request, actor, params }) => ok(await updateOrder(actor, params.id, await body(request))));
