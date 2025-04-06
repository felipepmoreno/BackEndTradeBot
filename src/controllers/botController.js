const logger = require('../utils/logger');

// In-memory bot state 
let botRunning = false;

exports.getBotStatus = async (req, res, next) => {
  try {
    res.status(200).json({
      running: botRunning,
      lastStartTime: botRunning ? new Date().toISOString() : null,
      activeStrategies: 3,
      status: botRunning ? 'Online' : 'Offline'
    });
  } catch (error) {
    logger.error('Error getting bot status:', error);
    next(error);
  }
};

exports.toggleBot = async (req, res, next) => {
  try {
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Active status must be a boolean'
      });
    }

    botRunning = active;
    
    res.status(200).json({
      success: true,
      running: botRunning,
      status: botRunning ? 'Online' : 'Offline',
      message: botRunning ? 'Bot successfully started' : 'Bot successfully stopped'
    });
  } catch (error) {
    logger.error('Error toggling bot status:', error);
    next(error);
  }
};
