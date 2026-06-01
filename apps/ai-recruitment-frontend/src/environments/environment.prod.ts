export const environment = {
  production: true,
  apiUrl: '/api',
  frontendUrl: '',
  // ⚡ Production API configuration
  wsUrl: '/ws',
  enableMockData: false,
  apiTimeout: 30000,
  remoteLogging: {
    enabled: true,
    endpoint: '/api/analytics/logs/client',
  },
};
