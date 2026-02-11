export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kkr_portfolio',
  },
  kkr: {
    apiBaseUrl:
      process.env.KKR_API_BASE_URL ||
      'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json',
    rateLimitMs: parseInt(process.env.KKR_RATE_LIMIT_MS, 10) || 1000,
    requestTimeout: parseInt(process.env.KKR_REQUEST_TIMEOUT, 10) || 10000,
  },
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS, 10) || 2000,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
