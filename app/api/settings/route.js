import { handler, ok, body } from '@/lib/http.js';
import { getSettings, updateSettings } from '@/services/settings.js';

export const GET = handler(async ({ actor }) => ok(await getSettings(actor)));
export const PUT = handler(async ({ request, actor }) => ok(await updateSettings(actor, await body(request))));
