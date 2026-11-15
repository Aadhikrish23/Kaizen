import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { buildOpenApi, ROUTES } from '../src/docs/openapi';
import { renderSwaggerYaml } from '../src/scripts/generateSwagger';
import { listExpressRoutes } from '../src/docs/routeIntrospection';

const yamlPath = path.resolve(__dirname, '../src/docs/swagger.yml');
const doc: any = YAML.load(yamlPath);

test('the committed swagger.yml is up to date (run `npm run docs:generate` after changing routes or zod schemas)', () => {
  assert.equal(fs.readFileSync(yamlPath, 'utf8'), renderSwaggerYaml());
});

test('swagger.yml is a valid OpenAPI 3 document (all $refs resolve)', async () => {
  const copy = JSON.parse(JSON.stringify(doc));
  const api: any = await SwaggerParser.validate(copy);
  assert.equal(api.openapi, '3.1.0');
  assert.equal(api.info.title, 'Kaizen API');
  assert.ok(api.components.securitySchemes.bearerAuth);
  assert.deepEqual(api.security, [{ bearerAuth: [] }]);
});

test('every Express route is documented (method and path)', () => {
  const routes = listExpressRoutes();
  assert.ok(routes.length > 60, `introspection found only ${routes.length} routes`);
  const missing = routes.filter((r) => !doc.paths?.[r.path]?.[r.method]).map((r) => `${r.method.toUpperCase()} ${r.path}`);
  assert.deepEqual(missing, [], `routes missing from swagger.yml: ${missing.join(', ')}`);
});

test('documented operations exist as Express routes (admin routes may be documented before their router is mounted)', () => {
  const have = new Set(listExpressRoutes().map((r) => `${r.method} ${r.path}`));
  const stale: string[] = [];
  for (const [p, ops] of Object.entries<any>(doc.paths)) {
    for (const method of Object.keys(ops)) {
      if (!have.has(`${method} ${p}`) && !p.startsWith('/admin')) stale.push(`${method.toUpperCase()} ${p}`);
    }
  }
  assert.deepEqual(stale, []);
});

test('every operation has a tag, summary, responses with the error shape and a 429', () => {
  for (const [p, ops] of Object.entries<any>(doc.paths)) {
    for (const [method, op] of Object.entries<any>(ops)) {
      const id = `${method} ${p}`;
      assert.ok(op.tags?.length === 1 && op.summary, `${id} needs a tag and summary`);
      assert.ok(op.responses['429'], `${id} should document 429`);
      assert.equal(op.responses['429'].content['application/json'].schema.$ref, '#/components/schemas/Error');
      assert.ok(op.responses['200'] || op.responses['201'], `${id} needs a success response`);
    }
  }
});

test('authentication: bearer by default, public routes opt out, protected routes document 401, admin routes 403', () => {
  for (const pub of ['/auth/register', '/auth/login', '/auth/refresh', '/health']) {
    const op = Object.values<any>(doc.paths[pub])[0];
    assert.deepEqual(op.security, [], `${pub} should be public`);
    assert.equal(op.responses['401'], undefined);
  }
  assert.equal(doc.paths['/auth/me'].get.security, undefined); // inherits bearerAuth
  assert.ok(doc.paths['/auth/me'].get.responses['401']);
  for (const [p, ops] of Object.entries<any>(doc.paths)) {
    if (!p.startsWith('/admin')) continue;
    for (const op of Object.values<any>(ops)) assert.ok(op.responses['403'] && op.responses['401'], `${p} admin responses`);
  }
});

test('request schemas are derived from the zod schemas the routes validate with', () => {
  const profile = doc.paths['/profile'].patch.requestBody.content['application/json'].schema;
  assert.equal(profile.additionalProperties, false); // strict whitelist from updateProfileSchema
  assert.ok(profile.properties.targetWeightKg && !profile.properties.role && !profile.properties.email);
  assert.equal(profile.properties.targetWeightKg.maximum, 500);

  const chat = doc.paths['/ai/chat'].post.requestBody.content['application/json'].schema;
  assert.deepEqual(chat.properties.history.items.properties.role.enum, ['user', 'assistant']);
  assert.equal(chat.properties.message.maxLength, 2000);

  const routine = doc.paths['/routines'].post.requestBody.content['application/json'].schema;
  assert.equal(routine.additionalProperties, false);
  assert.ok(!routine.properties.userId);

  const search = doc.paths['/ai/search'].get.parameters.find((p: any) => p.name === 'q');
  assert.equal(search.required, true);
  assert.equal(search.schema.maxLength, 100);

  const idParam = doc.paths['/recipes/{id}'].delete.parameters[0];
  assert.deepEqual([idParam.name, idParam.in, idParam.required], ['id', 'path', true]);
  assert.ok(doc.paths['/recipes/{id}'].delete.responses['404']);
});

test('per-user limited groups say so in their 429 description', () => {
  assert.match(doc.paths['/ai/chat'].post.responses['429'].description, /per-user/);
  assert.match(doc.paths['/meals'].get.responses['429'].description, /global/);
});

test('the route table has no duplicates', () => {
  const keys = ROUTES.map((r) => `${r.method} ${r.path}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(Object.keys(buildOpenApi().paths).length, Object.keys(doc.paths).length);
});
