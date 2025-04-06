const strategyManager = require('../strategies/strategyManager');
const logger = require('../utils/logger');

/**
 * Get all strategies
 */
exports.getStrategies = async (req, res, next) => {
  try {
    const strategies = await strategyManager.getStrategies();
    res.status(200).json(strategies);
  } catch (error) {
    logger.error('Error fetching strategies:', error);
    next(error);
  }
};

/**
 * Get strategy by ID
 */
exports.getStrategyById = async (req, res, next) => {
  try {
    const strategy = await strategyManager.getStrategyById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    res.status(200).json(strategy);
  } catch (error) {
    logger.error('Error fetching strategy by ID:', error);
    next(error);
  }
};

/**
 * Create a new strategy
 */
exports.createStrategy = async (req, res, next) => {
  try {
    const strategyConfig = req.body;
    
    // Add ID if not provided
    if (!strategyConfig.id) {
      strategyConfig.id = Date.now().toString();
    }
    
    const result = await strategyManager.saveStrategyConfiguration(strategyConfig);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        strategy: result.strategy
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to create strategy'
      });
    }
  } catch (error) {
    logger.error('Error creating strategy:', error);
    next(error);
  }
};

/**
 * Update a strategy
 */
exports.updateStrategy = async (req, res, next) => {
  try {
    const strategyConfig = {
      ...req.body,
      id: req.params.id
    };
    
    const result = await strategyManager.saveStrategyConfiguration(strategyConfig);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        strategy: result.strategy
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to update strategy'
      });
    }
  } catch (error) {
    logger.error('Error updating strategy:', error);
    next(error);
  }
};

/**
 * Delete a strategy
 */
exports.deleteStrategy = async (req, res, next) => {
  try {
    const result = await strategyManager.removeStrategyConfiguration(req.params.id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Strategy deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete strategy'
      });
    }
  } catch (error) {
    logger.error('Error deleting strategy:', error);
    next(error);
  }
};

/**
 * Get available strategy types
 */
exports.getStrategyTypes = async (req, res, next) => {
  try {
    const types = await strategyManager.getStrategyTypes();
    res.status(200).json(types);
  } catch (error) {
    logger.error('Error fetching strategy types:', error);
    next(error);
  }
};

/**
 * Set strategy active status
 */
exports.setStrategyActive = async (req, res, next) => {
  try {
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Active status must be a boolean'
      });
    }
    
    const result = await strategyManager.setStrategyActive(req.params.id, active);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        strategy: result.strategy
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to update strategy active status'
      });
    }
  } catch (error) {
    logger.error('Error setting strategy active status:', error);
    next(error);
  }
};
