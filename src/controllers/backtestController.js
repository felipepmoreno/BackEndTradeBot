const strategyManager = require('../strategies/strategyManager');
const dataService = require('../services/dataService');
const logger = require('../utils/logger');

/**
 * Run backtest with provided parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.runBacktest = async (req, res, next) => {
  try {
    const { strategy: strategyType, symbol, startDate, endDate, initialCapital } = req.body;
    
    logger.info(`Starting backtest for ${strategyType} on ${symbol} from ${startDate} to ${endDate}`);
    
    // Fetch historical data
    const historicalData = await dataService.fetchHistoricalData(symbol, startDate, endDate);
    
    if (!historicalData || Object.keys(historicalData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No historical data available for the selected period'
      });
    }
    
    // Create strategy instance for backtesting
    const strategyConfig = {
      type: strategyType,
      name: `${strategyType} Backtest`,
      pair: symbol,
      timeframes: ['1h'], // Default timeframe for backtesting
      active: false
    };
    
    const strategy = await strategyManager.createBacktestStrategy(strategyConfig);
    
    if (!strategy) {
      return res.status(400).json({
        success: false,
        error: `Could not create strategy of type: ${strategyType}`
      });
    }
    
    // Run backtest
    const backtestResults = await strategy.backtest(historicalData, {
      initialCapital: parseFloat(initialCapital)
    });
    
    logger.info(`Backtest completed for ${strategyType} on ${symbol}, profit: ${backtestResults.performance.totalProfit}`);
    
    return res.status(200).json(backtestResults);
  } catch (error) {
    logger.error('Error during backtest:', error);
    next(error);
  }
};
