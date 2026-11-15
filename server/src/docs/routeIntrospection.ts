import fs from 'fs';
import path from 'path';

export interface ExpressRoute {
  method: string; // lower case
  path: string; // OpenAPI style, relative to /api/v1
}

/**
 * Walks the routers mounted in server.ts (`app.use('/api/v1/x', xRouter)`) and the app-level `app.get('/api/v1/...')`
 * routes, returning every method and path. Used by the OpenAPI coverage test and the generator check.
 * server.ts is parsed as text (importing it would start the server).
 */
export const listExpressRoutes = (): ExpressRoute[] => {
  const srcDir = path.resolve(__dirname, '..');
  const serverTs = fs.readFileSync(path.join(srcDir, 'server.ts'), 'utf8');
  const imports: Record<string, string> = {};
  for (const m of serverTs.matchAll(/import (\w+) from '(\.\/features\/[^']+routes)'/g)) imports[m[1]] = m[2];

  const out: ExpressRoute[] = [];
  const toOpenApi = (p: string) => p.replace(/:(\w+)/g, '{$1}');

  for (const m of serverTs.matchAll(/app\.use\('(\/api\/v1\/[^']*)', (\w+)\)/g)) {
    const [, base, name] = m;
    if (!imports[name]) continue;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require(path.join(srcDir, imports[name])).default;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const sub = layer.route.path === '/' ? '' : layer.route.path;
      for (const method of Object.keys(layer.route.methods)) {
        out.push({ method, path: toOpenApi((base + sub).replace('/api/v1', '')) });
      }
    }
  }
  for (const m of serverTs.matchAll(/app\.(get|post|put|patch|delete)\('(\/api\/v1\/[^']*)'/g)) {
    out.push({ method: m[1], path: toOpenApi(m[2].replace('/api/v1', '')) });
  }
  return out;
};
