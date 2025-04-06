// src/strategies/strategyManager.js

const GridTradingStrategy = require('./gridTrading');
const logger = require('../utils/logger');

// In-memory strategy storage (would use a database in production)
const strategies = [];
let nextId = 1;

// Available strategy types
const strategyTypes = [
  {
    id: 'GridTradingStrategy',
    name: 'Grid Trading',
    description: 'Creates a grid of buy and sell orders at regular intervals, ideal for sideways markets',
    parameters: GridTradingStrategy.parameters || []
  }
];

// Initialize with a sample strategy
strategies.push({
  id: String(nextId++),
  name: 'BTC Grid Trading',
  type: 'GridTradingStrategy', 
  pair: 'BTCUSDT',
  active: false,
  config: {
    upperLimit: 40000,
    lowerLimit: 35000,
    levels: 5,
    totalInvestment: 1000,
    profitPerGrid: 1,
    useVolatilityAdjustment: true,
    rebalanceGrid: false,
    rebalanceInterval: 24
  },
  createdAt: new Date().toISOString()
});

/**
 * Get all configured strategies
 */
exports.getStrategies = async () => {
  return strategies;
};

/**
 * Get a strategy by ID
 */
exports.getStrategyById = async (id) => {
  return strategies.find(strategy => strategy.id === id) || null;
};

/**
 * Save a strategy configuration (create or update)
 */
exports.saveStrategyConfiguration = async (config) => {
  try {
    const strategyType = strategyTypes.find(type => type.id === config.type);
    
    if (!strategyType) {
      return { success: false, error: 'Invalid strategy type' };
    }

    const existingIndex = strategies.findIndex(s => s.id === config.id);
    
    if (existingIndex >= 0) {
      // Update
      strategies[existingIndex] = {
        ...strategies[existingIndex],
        ...config,
        updatedAt: new Date().toISOString()
      };
      return { success: true, strategy: strategies[existingIndex] };
    } else {
      // Create
      const newStrategy = {
        ...config,
        id: String(nextId++),
        createdAt: new Date().toISOString()
      };
      strategies.push(newStrategy);
      return { success: true, strategy: newStrategy };
    }
  } catch (error) {
    logger.error('Error saving strategy configuration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a strategy configuration
 */
exports.removeStrategyConfiguration = async (id) => {
  try {
    const index = strategies.findIndex(strategy => strategy.id === id);
    if (index === -1) {
      return { success: false, error: 'Strategy not found' };
    }
    
    strategies.splice(index, 1);
    return { success: true };
  } catch (error) {
    logger.error('Error removing strategy configuration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get available strategy types
 */
exports.getStrategyTypes = async () => {
  return strategyTypes;
};

/**
 * Set strategy active status
 */
exports.setStrategyActive = async (id, active) => {
  try {
    const strategy = strategies.find(s => s.id === id);
    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }
    
    strategy.active = active;
    return { success: true, strategy };
  } catch (error) {
    logger.error('Error setting strategy active status:', error);
    return { success: false, error: error.message };
  }
};