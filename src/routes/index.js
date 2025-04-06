const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const dashboardController = require('../controllers/dashboardController');
const botController = require('../controllers/botController');

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

module.exports = router;
