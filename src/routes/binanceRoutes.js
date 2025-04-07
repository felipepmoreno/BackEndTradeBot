const express = require('express');
const router = express.Router();
const binanceService = require('../services/binanceService');
const logger = require('../utils/logger');

// Middleware para verificar se estamos em modo de simulação
const checkSimulationMode = (req, res, next) => {
  if (process.env.SIMULATION_MODE === 'true' && req.method !== 'GET') {
    logger.info(`Simulation mode: Blocking ${req.method} request to ${req.path}`);
    return res.status(200).json({
      success: true,
      simulation: true,
      message: 'Request would have been processed, but simulation mode is enabled',
      requestData: {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query
      }
    });
  }
  next();
};

// Middleware para validar parâmetros obrigatórios
const validateParams = (requiredParams) => {
  return (req, res, next) => {
    const params = { ...req.query, ...req.body };
    
    const missingParams = requiredParams.filter(param => !params[param]);
    
    if (missingParams.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`
      });
    }
    
    next();
  };
};

// Rota para verificar conectividade da API
router.get('/status', async (req, res) => {
  try {
    const result = await binanceService.account.testConnectivity();
    res.json(result);
  } catch (error) {
    logger.error(`Error testing API connectivity: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to test API connectivity'
    });
  }
});

// Rotas para dados de mercado
router.get('/ticker/:symbol?', async (req, res) => {
  try {
    const symbol = req.params.symbol ? req.params.symbol.toUpperCase() : null;
    const result = await binanceService.marketData.getTickerPrice(symbol);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting ticker price: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get ticker price'
    });
  }
});

router.get('/klines', validateParams(['symbol', 'interval']), async (req, res) => {
  try {
    const { symbol, interval, limit } = req.query;
    const result = await binanceService.marketData.getKlines(symbol.toUpperCase(), interval, limit);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting klines: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get klines'
    });
  }
});

router.get('/depth', validateParams(['symbol']), async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const result = await binanceService.marketData.getOrderBook(symbol.toUpperCase(), limit);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting order book: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get order book'
    });
  }
});

router.get('/trades', validateParams(['symbol']), async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const result = await binanceService.marketData.getRecentTrades(symbol.toUpperCase(), limit);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting recent trades: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent trades'
    });
  }
});

// Rotas para conta
router.get('/account', async (req, res) => {
  try {
    const result = await binanceService.account.getAccountInfo();
    res.json(result);
  } catch (error) {
    logger.error(`Error getting account info: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get account info'
    });
  }
});

router.get('/account/asset/:asset', async (req, res) => {
  try {
    const asset = req.params.asset.toUpperCase();
    const result = await binanceService.account.getAssetBalance(asset);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting asset balance: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset balance'
    });
  }
});

router.get('/my-trades', validateParams(['symbol']), async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const result = await binanceService.account.getMyTrades(symbol.toUpperCase(), limit);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting my trades: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get my trades'
    });
  }
});

// Rotas para trading
router.post('/order', checkSimulationMode, validateParams(['symbol', 'side', 'type', 'quantity']), async (req, res) => {
  try {
    const result = await binanceService.trading.createOrder(req.body);
    res.json(result);
  } catch (error) {
    logger.error(`Error creating order: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

router.get('/order', validateParams(['symbol', 'orderId']), async (req, res) => {
  try {
    const { symbol, orderId } = req.query;
    const result = await binanceService.trading.getOrderStatus(symbol.toUpperCase(), orderId);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting order status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get order status'
    });
  }
});

router.delete('/order', checkSimulationMode, validateParams(['symbol', 'orderId']), async (req, res) => {
  try {
    const { symbol, orderId } = req.query;
    const result = await binanceService.trading.cancelOrder(symbol.toUpperCase(), orderId);
    res.json(result);
  } catch (error) {
    logger.error(`Error cancelling order: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
});

router.get('/open-orders', async (req, res) => {
  try {
    const { symbol } = req.query;
    const result = await binanceService.trading.getOpenOrders(symbol ? symbol.toUpperCase() : null);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting open orders: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get open orders'
    });
  }
});

router.get('/order-history', validateParams(['symbol']), async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const result = await binanceService.trading.getOrderHistory(symbol.toUpperCase(), limit);
    res.json(result);
  } catch (error) {
    logger.error(`Error getting order history: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get order history'
    });
  }
});

module.exports = router;
