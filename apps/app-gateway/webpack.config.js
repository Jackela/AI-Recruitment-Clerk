import { NxAppWebpackPlugin } from '@nx/webpack/app-plugin.js';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default {
  // Build the gateway as CommonJS to avoid `require` in ESM runtime errors
  experiments: {
    outputModule: false,
  },
  mode: 'production',
  target: 'node20',
  output: {
    path: join(__dirname, '../../dist/apps/app-gateway'),
    // Use .cjs to ensure Node treats it as CommonJS even with root package type: module
    filename: 'main.cjs',
    module: false,
    chunkFormat: 'commonjs',
    library: {
      type: 'commonjs2',
    },
    environment: {
      module: false,
      dynamicImport: true,
      const: true,
      arrowFunction: true,
    },
  },
  resolve: {
    alias: {
      'class-transformer/storage': join(
        __dirname,
        './webpack.alias-stubs/class-transformer/storage.js',
      ),
      // Force-bundle internal libs instead of treating them as external packages
      '@ai-recruitment-clerk/shared-dtos': join(
        __dirname,
        '../../libs/shared-dtos/src/index.ts',
      ),
      '@ai-recruitment-clerk/user-management-domain': join(
        __dirname,
        '../../libs/user-management-domain/src/index.ts',
      ),
    },
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
  },
  externals: [
    (context, request, callback) => {
      if (/^@nestjs\/microservices(\/.*)?$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      if (/^(amqplib|amqp-connection-manager|kafkajs|mqtt)$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
    {
      bcrypt: 'bcrypt',
      sqlite3: 'sqlite3',
      'better-sqlite3': 'better-sqlite3',
      mysql2: 'mysql2',
      pg: 'pg',
      'pg-native': 'pg-native',
      tedious: 'tedious',
      mysql: 'mysql',
      ioredis: 'ioredis',
      redis: 'redis',
      level: 'level',
    },
  ],
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: true,
      outputHashing: 'none',
      generatePackageJson: false,
      typeCheck: true,
      // Ensure CommonJS output to be compatible with Node runtime in this repo
      outputModule: false,
    }),
  ],
};
