// Test-only module loader: resolves the "@/" alias and swaps Next.js runtime modules for tiny shims,
// so the real route handlers can run under plain Node.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shim = (n) => pathToFileURL(path.join(root, 'tests', 'shims', n)).href;

export async function resolve(specifier, context, next) {
  if (specifier === 'next/server') return { url: shim('next-server.js'), shortCircuit: true };
  if (specifier === 'next/headers') return { url: shim('next-headers.js'), shortCircuit: true };
  if (specifier.startsWith('@/')) {
    const file = path.join(root, specifier.slice(2));
    if (!fs.existsSync(file)) throw new Error(`Unresolved alias import: ${specifier}`);
    return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}
