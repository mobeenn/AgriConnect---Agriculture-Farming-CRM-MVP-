import { handler, ok, body } from '@/lib/http.js';
import { getParty, updateParty, deleteParty } from '@/services/parties.js';

export const GET = handler(async ({ actor, params }) => ok(await getParty(actor, 'buyer', params.id)));
export const PUT = handler(async ({ request, actor, params }) => ok(await updateParty(actor, 'buyer', params.id, await body(request))));
export const DELETE = handler(async ({ actor, params }) => ok(await deleteParty(actor, 'buyer', params.id)));
