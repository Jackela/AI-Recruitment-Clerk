/**
 * Global Jest teardown to cleanup resources
 */

module.exports = async () => {
  // Force cleanup of any lingering handles
  console.log('🧹 执行全局清理检查...');

  // Close any Redis connections from cache-manager
  try {
    const cacheManager = require('cache-manager');
    // Attempt to close any stores that have disconnect methods
    if (cacheManager?.stores) {
      for (const store of Object.values(cacheManager.stores)) {
        if (store?.client?.quit) {
          await store.client.quit();
        }
        if (store?.client?.disconnect) {
          await store.client.disconnect();
        }
        if (store?.disconnect) {
          await store.disconnect();
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }

  console.log('🏁 全局清理检查完成');
};
