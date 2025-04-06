const EventEmitter = require('events');
const logger = require('../../utils/logger');

class BaseStrategy extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.pair = config.pair;
    this.timeframes = config.timeframes || ['1m', '5m', '15m', '1h'];
    this.config = config;
    this.active = false;
    this.state = {
      lastSignal: null,
      lastUpdate: null,
      indicators: {},
      positions: {},
      errors: []
    };
  }

  async init() {
    try {
      await this.validateConfig();
      await this.initializeIndicators();
      this.active = true;
      logger.info(`Strategy ${this.name} initialized successfully`);
      return true;
    } catch (error) {
      logger.error(`Error initializing strategy ${this.name}:`, error);
      return false;
    }
  }

  async validateConfig() {
    throw new Error('validateConfig must be implemented by child class');
  }

  async initializeIndicators() {
    throw new Error('initializeIndicators must be implemented by child class');
  }

  async execute(data) {
    throw new Error('execute must be implemented by child class');
  }

  async updateState(newState) {
    this.state = { ...this.state, ...newState, lastUpdate: new Date() };
    this.emit('stateUpdate', this.state);
  }

  async handleError(error) {
    const errorDetails = {
      timestamp: new Date(),
      message: error.message,
      stack: error.stack
    };
    
    this.state.errors.push(errorDetails);
    if (this.state.errors.length > 10) {
      this.state.errors.shift();
    }
    
    logger.error(`Strategy ${this.name} error:`, error);
    this.emit('error', errorDetails);
  }

  getState() {
    return { ...this.state };
  }

  static validateTimeframes(timeframes) {
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
    return timeframes.every(t => validTimeframes.includes(t));
  }
}

module.exports = BaseStrategy;
