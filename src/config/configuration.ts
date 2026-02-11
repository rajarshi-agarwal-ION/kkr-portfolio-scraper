const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default () => ({
  port: toInt(process.env.PORT, 3000),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kkr_portfolio',
  },
  kkr: {
    apiBaseUrl:
      process.env.KKR_API_BASE_URL ||
      'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json',
    rateLimitMs: toInt(process.env.KKR_RATE_LIMIT_MS, 1000),
    requestTimeout: toInt(process.env.KKR_REQUEST_TIMEOUT, 10000),
  },
  retry: {
    maxRetries: toInt(process.env.MAX_RETRIES, 3),
    retryDelayMs: toInt(process.env.RETRY_DELAY_MS, 2000),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
