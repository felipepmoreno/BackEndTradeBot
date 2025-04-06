const express = require('express');
const router = express.Router();

// Import route modules
const apiRoutes = require('./apiRoutes');

// Note: If these routes don't exist yet, create basic placeholder exports for them
let strategyRoutes;
let backtestRoutes;
let settingsRoutes;

try {
  strategyRoutes = require('./strategyRoutes');
} catch (err) {
  strategyRoutes = express.Router();
}

try {
  backtestRoutes = require('./backtestRoutes');
} catch (err) {
  backtestRoutes = express.Router();
}

try {
  settingsRoutes = require('./settingsRoutes');
} catch (err) {
  settingsRoutes = express.Router();
}

// Mount routes
router.use('/v1', apiRoutes);
router.use('/strategies', strategyRoutes);
router.use('/backtest', backtestRoutes);
router.use('/settings', settingsRoutes);

// Add a basic health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

module.exports = router;
