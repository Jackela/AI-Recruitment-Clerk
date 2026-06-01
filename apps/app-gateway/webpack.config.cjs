const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/app-gateway'),
    filename: 'main.cjs',
  },
  resolve: {
    alias: {
      'class-transformer/storage': join(
        __dirname,
        './webpack.alias-stubs/class-transformer/storage.js',
      ),
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
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
    }),
  ],
};
