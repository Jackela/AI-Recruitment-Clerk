const { merge } = require('webpack-merge');
const path = require('path');

module.exports = (config, context) => {
  return merge(config, {
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 20,
        maxAsyncRequests: 30,
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Separate vendor bundle for Angular core
          angular: {
            test: /[\\/]node_modules[\\/]@angular[\\/]/,
            name: 'angular-vendor',
            chunks: 'all',
            priority: 30,
            enforce: true,
            minSize: 0
          },
          // Separate NgRx bundle 
          ngrx: {
            test: /[\\/]node_modules[\\/]@ngrx[\\/]/,
            name: 'ngrx-vendor',
            chunks: 'all',
            priority: 25,
            enforce: true,
            minSize: 0
          },
          // RxJS bundle
          rxjs: {
            test: /[\\/]node_modules[\\/]rxjs[\\/]/,
            name: 'rxjs-vendor',
            chunks: 'all',
            priority: 24,
            enforce: true
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
            enforce: true,
            maxSize: 200000
          },
          // Common shared modules
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            maxSize: 100000
          }
        }
      },
      // Module IDs optimization
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // Remove unused exports (tree shaking)
      usedExports: true,
      sideEffects: false,
      // Minification
      minimize: true,
      // Code concatenation 
      concatenateModules: true
    },
    resolve: {
      alias: {
        // Optimize lodash imports
        'lodash': 'lodash-es',
        // Rxjs operator optimization
        'rxjs/operators': 'rxjs/operators'
      }
    },
    performance: {
      maxAssetSize: 500000,
      maxEntrypointSize: 1000000,
      hints: 'warning'
    }
  });
};