const { merge } = require('webpack-merge');
const path = require('path');

module.exports = (config, context) => {
  return merge(config, {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Separate vendor bundle for Angular core
          angular: {
            test: /[\\/]node_modules[\\/]@angular[\\/]/,
            name: 'angular-vendor',
            chunks: 'all',
            priority: 30,
            enforce: true
          },
          // Separate NgRx bundle 
          ngrx: {
            test: /[\\/]node_modules[\\/]@ngrx[\\/]/,
            name: 'ngrx-vendor',
            chunks: 'all',
            priority: 25,
            enforce: true
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
            enforce: true
          },
          // Common shared modules
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true
          }
        }
      },
      // Module IDs optimization
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // Remove unused exports (tree shaking)
      usedExports: true,
      sideEffects: false
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