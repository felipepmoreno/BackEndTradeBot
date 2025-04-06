const logger = require('../../utils/logger');

class StrategyValidator {
  static validateGridStrategy(config) {
    const requiredFields = ['upperLimit', 'lowerLimit', 'levels', 'totalInvestment'];
    const errors = [];

    requiredFields.forEach(field => {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    if (config.upperLimit <= config.lowerLimit) {
      errors.push('Upper limit must be greater than lower limit');
    }

    if (config.levels < 2) {
      errors.push('Minimum of 2 levels required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateDCAStrategy(config) {
    const requiredFields = ['interval', 'amount', 'maxOrders'];
    const errors = [];

    requiredFields.forEach(field => {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = StrategyValidator;
