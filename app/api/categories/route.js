import { handler, ok } from '@/lib/http.js';
import { getCategories } from '@/services/settings.js';

export const GET = handler(async ({ actor }) => ok(await getCategories(actor)));
