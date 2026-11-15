/** Writes src/docs/swagger.yml from the route table and zod schemas: `npm run docs:generate`. */
import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';
import { buildOpenApi } from '../docs/openapi';

export const renderSwaggerYaml = (): string => YAML.stringify(JSON.parse(JSON.stringify(buildOpenApi())), 12, 2) + '\n';

if (require.main === module) {
  const target = path.resolve(__dirname, '../docs/swagger.yml');
  fs.writeFileSync(target, renderSwaggerYaml());
  console.log(`Wrote ${target}`);
}
