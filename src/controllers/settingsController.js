const fs = require('fs').promises;
const path = require('path');
const settingsService = require('../services/settingsService');
const exchangeService = require('../services/exchangeService');
const logger = require('../utils/logger');

/**
 * Get all settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    
    // Remove sensitive information like API secret
    if (settings.apiKey) {
      settings.apiKey = settings.apiKey.substring(0, 4) + '...' + 
        settings.apiKey.substring(settings.apiKey.length - 4);
    }
    if (settings.apiSecret) {
      settings.apiSecret = '***************';
    }
    
    res.status(200).json(settings);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    next(error);
  }
};

/**
 * Update settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = req.body;
    const result = await settingsService.updateSettings(settings);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Settings updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to update settings'
      });
    }
  } catch (error) {
    logger.error('Error updating settings:', error);
    next(error);
  }
};

/**
 * Test API connection
 */
exports.testConnection = async (req, res, next) => {
  try {
    const { apiKey, apiSecret } = req.body;
    
    // If API credentials are provided, use them for the test
    // Otherwise, use the stored credentials
    const credentials = apiKey && apiSecret ? { apiKey, apiSecret } : null;
    const result = await exchangeService.testConnection(credentials);
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error testing API connection:', error);
    next(error);
  }
};

/**
 * Create backup
 */
exports.createBackup = async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups');
    
    // Create backup directory if it doesn't exist
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      logger.error('Error creating backup directory:', err);
    }
    
    // Get settings and strategies
    const settings = await settingsService.getSettings();
    const strategies = await require('../strategies/strategyManager').getStrategies();
    
    // Create backup data
    const backupData = {
      settings,
      strategies,
      timestamp,
      version: process.env.APP_VERSION || '1.0.0'
    };
    
    // Write backup to file
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    
    logger.info(`Backup created: ${backupFile}`);
    
    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      filename: path.basename(backupFile)
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    next(error);
  }
};

/**
 * Reset settings
 */
exports.resetSettings = async (req, res, next) => {
  try {
    const result = await settingsService.resetSettings();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Settings reset to defaults successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to reset settings'
      });
    }
  } catch (error) {
    logger.error('Error resetting settings:', error);
    next(error);
  }
};
