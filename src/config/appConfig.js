const path = require('path');
require('dotenv').config();

const config = {
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testMode: process.env.TEST_MODE === 'true',
    useTestnet: process.env.USE_BINANCE_TESTNET === 'true',
    rateLimit: parseInt(process.env.RATE_LIMIT) || 10,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 1000
  },
  websocket: {
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 5,
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY) || 5000,
    pingInterval: 30000
  },
  database: {
    enabled: process.env.USE_DATABASE === 'true',
    connectionString: process.env.DATABASE_URL
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(__dirname, '../../logs/app.log')
  }
};

module.exports = config;
