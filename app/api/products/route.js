import { handler, ok, okPage, query, body } from '@/lib/http.js';
import { listProducts, createProduct } from '@/services/products.js';

export const GET = handler(async ({ request, actor }) => okPage(await listProducts(actor, query(request))));
export const POST = handler(async ({ request, actor }) => ok(await createProduct(actor, await body(request)), undefined, 201));
