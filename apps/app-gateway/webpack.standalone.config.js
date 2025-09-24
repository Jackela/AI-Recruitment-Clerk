import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  mode: 'production',
  target: 'node20',
  entry: join(__dirname, './src/main.ts'),
  experiments: { outputModule: true },
  output: {
    path: join(__dirname, '../../dist/apps/app-gateway'),
    filename: 'main.mjs',
    chunkFormat: 'module',
    module: true,
    library: { type: 'module' },
    environment: { module: true, dynamicImport: true },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js'],
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: false, decorators: true },
              target: 'es2022',
              transform: { decoratorMetadata: true },
            },
            module: { type: 'es6' },
            sourceMaps: false,
          },
        },
      },
    ],
  },
  externals: [
    // Ignore Nest microservices optional transports during bundling
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
};
