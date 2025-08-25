import { NxAppWebpackPlugin } from '@nx/webpack/app-plugin.js';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default {
  experiments: {
    outputModule: true,
  },
  output: {
    path: join(__dirname, '../../dist/apps/app-gateway'),
    module: true,
    chunkFormat: 'module',
    library: {
      type: 'module'
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
      optimization: true,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};
