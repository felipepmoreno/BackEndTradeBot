const express = require('express');
const backtestController = require('../controllers/backtestController');
const { validateBacktestParams } = require('../middleware/validation');

const router = express.Router();

/**
 * @route POST /api/backtest
 * @desc Run backtest on a strategy
 * @access Public
 */
router.post('/', validateBacktestParams, backtestController.runBacktest);

module.exports = router;
