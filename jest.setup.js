// Jest global setup - Set NODE_ENV to test
process.env.NODE_ENV = 'test';
// Pin MongoDB binary version for mongodb-memory-server to avoid fassert issues on some platforms
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
process.env.MONGOMS_DISABLE_MD5_CHECK = process.env.MONGOMS_DISABLE_MD5_CHECK || '1';

// Global test configuration
global.beforeAll = global.beforeAll || (() => {});
global.afterAll = global.afterAll || (() => {});
