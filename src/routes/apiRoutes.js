const express = require('express');
const router = express.Router();
const binanceService = require('../services/binanceService');
const logger = require('../utils/logger');

/**
 * Test Binance API connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const result = await binanceService.testConnection();
    res.json(result);
  } catch (error) {
    logger.error('Error testing API connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get account information
 */
router.get('/account', async (req, res) => {
  try {
    const result = await binanceService.getAccountInfo();
    res.json(result);
  } catch (error) {
    logger.error('Error getting account info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get ticker price
 */
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const result = await binanceService.getTickerPrice(req.params.symbol);
    res.json(result);
  } catch (error) {
    logger.error('Error getting ticker price:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
