const logger = require('../utils/logger');

/**
 * Validate backtest parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateBacktestParams = (req, res, next) => {
  const { strategy, symbol, startDate, endDate, initialCapital } = req.body;
  
  // Check required fields
  if (!strategy || !symbol || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: strategy, symbol, startDate, endDate'
    });
  }
  
  // Validate dates
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }
  } catch (error) {
    logger.error('Date validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid date format'
    });
  }
  
  // Validate initialCapital if provided
  if (initialCapital) {
    const capital = parseFloat(initialCapital);
    if (isNaN(capital) || capital <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Initial capital must be a positive number'
      });
    }
  }
  
  next();
};

/**
 * Validate strategy parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateStrategyParams = (req, res, next) => {
  const { name, type, pair, timeframes } = req.body;
  
  // Check required fields
  if (!name || !type || !pair) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: name, type, pair'
    });
  }
  
  // Validate timeframes if provided
  if (timeframes) {
    if (!Array.isArray(timeframes) || timeframes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Timeframes must be a non-empty array'
      });
    }
    
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
    const invalidTimeframes = timeframes.filter(tf => !validTimeframes.includes(tf));
    
    if (invalidTimeframes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid timeframes: ${invalidTimeframes.join(', ')}`
      });
    }
  }
  
  next();
};
