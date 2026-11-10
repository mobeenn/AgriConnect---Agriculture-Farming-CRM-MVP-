import { handler, ok, body } from '@/lib/http.js';
import { getProduct, updateProduct, deleteProduct } from '@/services/products.js';

export const GET = handler(async ({ actor, params }) => ok(await getProduct(actor, params.id)));
export const PUT = handler(async ({ request, actor, params }) => ok(await updateProduct(actor, params.id, await body(request))));
export const DELETE = handler(async ({ actor, params }) => ok(await deleteProduct(actor, params.id)));
