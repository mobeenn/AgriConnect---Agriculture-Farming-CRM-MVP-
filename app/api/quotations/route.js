import { handler, ok, okPage, query, body } from '@/lib/http.js';
import { listQuotations, createQuotation } from '@/services/quotations.js';

export const GET = handler(async ({ request, actor }) => okPage(await listQuotations(actor, query(request))));
export const POST = handler(async ({ request, actor }) => ok(await createQuotation(actor, await body(request)), undefined, 201));
