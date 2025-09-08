import { NxAppWebpackPlugin } from '@nx/webpack/app-plugin.js';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default {
  experiments: {
    outputModule: true,
  },
  mode: 'production',
  target: 'node20',
  output: {
    path: join(__dirname, '../../dist/apps/app-gateway'),
    filename: 'main.mjs',
    module: true,
    chunkFormat: 'module',
    library: {
      type: 'module'
    },
    environment: {
      module: true,
      dynamicImport: true,
      const: true,
      arrowFunction: true
    }
  },
  resolve: {
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs']
    }
  },
  externals: {
    'bcrypt': 'bcrypt',
    'sqlite3': 'sqlite3',
    'better-sqlite3': 'better-sqlite3',
    'mysql2': 'mysql2',
    'pg': 'pg',
    'pg-native': 'pg-native',
    'tedious': 'tedious',
    'mysql': 'mysql',
    'ioredis': 'ioredis',
    'redis': 'redis',
    'level': 'level'
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      typeCheck: false,
      outputModule: true
    }),
  ],
};
