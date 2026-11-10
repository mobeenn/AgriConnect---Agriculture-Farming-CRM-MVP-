import { handler, ok, okPage, query, body } from '@/lib/http.js';
import { listOrders, createRequest } from '@/services/orders.js';

export const GET = handler(async ({ request, actor }) => okPage(await listOrders(actor, query(request))));
// Creating an order = submitting a purchase request (same workflow, same service).
export const POST = handler(async ({ request, actor }) => ok(await createRequest(actor, await body(request)), undefined, 201));
