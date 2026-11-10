import { handler, ok } from '@/lib/http.js';
import { requireActor } from '@/lib/authz.js';
import { actorToUser } from '@/services/auth.js';

export const GET = handler(async ({ actor }) => ok(actorToUser(requireActor(actor))));
