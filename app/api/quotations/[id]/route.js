import { handler, ok, body } from '@/lib/http.js';
import { respondToQuotation } from '@/services/quotations.js';

// body: { "action": "accept" | "reject" }
export const PUT = handler(async ({ request, actor, params }) => ok(await respondToQuotation(actor, params.id, await body(request))));
