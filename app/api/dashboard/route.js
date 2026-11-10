import { handler, ok } from '@/lib/http.js';
import { getDashboard } from '@/services/dashboard.js';

export const GET = handler(async ({ actor }) => ok(await getDashboard(actor)));
