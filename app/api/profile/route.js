import { handler, ok, body } from '@/lib/http.js';
import { getProfile, updateProfile } from '@/services/parties.js';

export const GET = handler(async ({ actor }) => ok(await getProfile(actor)));
export const PUT = handler(async ({ request, actor }) => ok(await updateProfile(actor, await body(request))));
