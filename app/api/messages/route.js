import { handler, ok, query, body } from '@/lib/http.js';
import { listConversations, listMessages, sendMessage } from '@/services/messages.js';

// GET /api/messages            -> conversation list
// GET /api/messages?orderId=.. -> messages of one order conversation
export const GET = handler(async ({ request, actor }) => {
  const { orderId } = query(request);
  return ok(orderId ? await listMessages(actor, orderId) : await listConversations(actor));
});
export const POST = handler(async ({ request, actor }) => ok(await sendMessage(actor, await body(request)), undefined, 201));
