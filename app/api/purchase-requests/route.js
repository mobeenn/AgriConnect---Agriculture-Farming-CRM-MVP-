import { handler, ok, okPage, query, body } from '@/lib/http.js';
import { listRequests, createRequest } from '@/services/orders.js';

export const GET = handler(async ({ request, actor }) => okPage(await listRequests(actor, query(request))));
export const POST = handler(async ({ request, actor }) => ok(await createRequest(actor, await body(request)), undefined, 201));
