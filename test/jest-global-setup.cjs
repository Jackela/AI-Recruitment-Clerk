/**
 * Global Jest setup to ensure cache-manager is available
 */

// Pre-load cache-manager to ensure it's available for @nestjs/cache-manager
require('cache-manager');
require('cache-manager-redis-yet');

console.log('✅ Cache modules pre-loaded successfully');
