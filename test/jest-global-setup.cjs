/**
 * Global Jest setup to ensure cache-manager is available
 */

module.exports = async () => {
  // Note: cache-manager modules are loaded on-demand by tests
  // to avoid hanging issues with Redis connections
  console.log('✅ Global setup complete');
};
