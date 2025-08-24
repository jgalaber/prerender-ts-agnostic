import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  target: 'node20',
  inlineDynamicImports: true,
  treeshake: true,
  optimization: true,
  minify: true,
  sourcemap: false,
  output: [{ format: 'esm', dir: 'dist', exports: 'auto' }],
});
