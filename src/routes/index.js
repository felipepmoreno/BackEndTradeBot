const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const dashboardController = require('../controllers/dashboardController');
const botController = require('../controllers/botController');
const binanceRoutes = require('./binanceRoutes');

// Rota de status da API
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboardData);

// Bot status routes
router.get('/bot/status', botController.getBotStatus);
router.post('/bot/toggle', botController.toggleBot);

// Strategy routes
router.get('/strategies', strategyController.getStrategies);
router.get('/strategies/:id', strategyController.getStrategyById);
router.post('/strategies', strategyController.createStrategy);
router.put('/strategies/:id', strategyController.updateStrategy);
router.delete('/strategies/:id', strategyController.deleteStrategy);
router.get('/strategies/types/all', strategyController.getStrategyTypes);

// Usar rotas da Binance no prefixo /binance
router.use('/binance', binanceRoutes);

module.exports = router;
