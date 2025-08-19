const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/app-gateway'),
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
    'level': 'level',
    '@angular/core': '@angular/core',
    '@angular/common': '@angular/common',
    '@angular/platform-browser': '@angular/platform-browser',
    '@angular/platform-browser-dynamic': '@angular/platform-browser-dynamic',
    '@angular/router': '@angular/router',
    '@angular/forms': '@angular/forms',
    '@angular/compiler': '@angular/compiler'
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: true,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};
