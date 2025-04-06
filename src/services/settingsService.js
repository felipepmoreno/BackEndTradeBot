const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Settings file path
const settingsFilePath = path.join(__dirname, '../../data/settings.json');

// Default settings
const defaultSettings = {
  apiKey: '',
  apiSecret: '',
  exchange: 'binance',
  riskManagement: {
    maxDrawdown: 10,
    maxPositions: 3,
    maxPositionSize: 20
  },
  notifications: {
    email: false,
    telegram: false,
    emailAddress: '',
    telegramChatId: ''
  }
};

/**
 * Get settings
 * @returns {Object} Settings object
 */
exports.getSettings = async () => {
  try {
    // Create settings directory if it doesn't exist
    const settingsDir = path.dirname(settingsFilePath);
    await fs.mkdir(settingsDir, { recursive: true });
    
    // Try to read settings file
    try {
      const data = await fs.readFile(settingsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, create with default settings
        await fs.writeFile(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
        return defaultSettings;
      }
      throw err;
    }
  } catch (error) {
    logger.error('Error getting settings:', error);
    throw error;
  }
};

/**
 * Update settings
 * @param {Object} newSettings - New settings object
 * @returns {Object} Result with success status
 */
exports.updateSettings = async (newSettings) => {
  try {
    const currentSettings = await this.getSettings();
    
    // Merge current settings with new settings
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      // Merge nested objects separately
      riskManagement: {
        ...currentSettings.riskManagement,
        ...(newSettings.riskManagement || {})
      },
      notifications: {
        ...currentSettings.notifications,
        ...(newSettings.notifications || {})
      }
    };
    
    await fs.writeFile(settingsFilePath, JSON.stringify(updatedSettings, null, 2));
    
    return { success: true };
  } catch (error) {
    logger.error('Error updating settings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset settings to defaults
 * @returns {Object} Result with success status
 */
exports.resetSettings = async () => {
  try {
    await fs.writeFile(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
    return { success: true };
  } catch (error) {
    logger.error('Error resetting settings:', error);
    return { success: false, error: error.message };
  }
};
