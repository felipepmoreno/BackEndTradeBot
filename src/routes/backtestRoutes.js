const express = require('express');
const backtestController = require('../controllers/backtestController');
const { validateBacktestParams } = require('../middleware/validation');

const router = express.Router();

// Placeholder for now - can be expanded later
router.get('/', (req, res) => {
  res.json({ message: 'Backtest API ready' });
});

/**
 * @route POST /api/backtest
 * @desc Run backtest on a strategy
 * @access Public
 */
router.post('/', validateBacktestParams, backtestController.runBacktest);

module.exports = router;
