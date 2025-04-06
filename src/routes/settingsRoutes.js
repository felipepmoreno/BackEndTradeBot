const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

/**
 * @route GET /api/settings
 * @desc Get all settings
 * @access Public
 */
router.get('/', settingsController.getSettings);

/**
 * @route PUT /api/settings
 * @desc Update settings
 * @access Public
 */
router.put('/', settingsController.updateSettings);

/**
 * @route POST /api/settings/test-connection
 * @desc Test API connection
 * @access Public
 */
router.post('/test-connection', settingsController.testConnection);

/**
 * @route POST /api/settings/backup
 * @desc Create backup
 * @access Public
 */
router.post('/backup', settingsController.createBackup);

/**
 * @route POST /api/settings/reset
 * @desc Reset settings
 * @access Public
 */
router.post('/reset', settingsController.resetSettings);

module.exports = router;
