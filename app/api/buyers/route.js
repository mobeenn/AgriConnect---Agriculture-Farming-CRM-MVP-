import { handler, ok, okPage, query, body } from '@/lib/http.js';
import { listParties, createParty } from '@/services/parties.js';

export const GET = handler(async ({ request, actor }) => okPage(await listParties(actor, 'buyer', query(request))));
export const POST = handler(async ({ request, actor }) => ok(await createParty(actor, 'buyer', await body(request)), undefined, 201));
