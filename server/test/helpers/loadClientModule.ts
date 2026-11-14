import fs from 'fs';
import path from 'path';
import Module from 'module';
import ts from 'typescript';

// The client package is ESM ("type": "module"), which ts-node's CommonJS require hook rejects.
// Pure client modules (no imports) are transpiled to CommonJS here so server tests can exercise them directly.
export const loadClientModule = (relFromRepoRoot: string): any => {
  const file = path.resolve(__dirname, '../../..', relFromRepoRoot);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const m: any = new Module(file);
  m.filename = file;
  m.paths = (Module as any)._nodeModulePaths(path.dirname(file));
  m._compile(outputText, file);
  return m.exports;
};
