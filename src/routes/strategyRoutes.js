const express = require('express');
const strategyController = require('../controllers/strategyController');

const router = express.Router();

/**
 * @route GET /api/strategies
 * @desc Get all strategies
 * @access Public
 */
router.get('/', strategyController.getStrategies);

/**
 * @route GET /api/strategies/:id
 * @desc Get strategy by ID
 * @access Public
 */
router.get('/:id', strategyController.getStrategyById);

/**
 * @route POST /api/strategies
 * @desc Create a new strategy
 * @access Public
 */
router.post('/', strategyController.createStrategy);

/**
 * @route PUT /api/strategies/:id
 * @desc Update a strategy
 * @access Public
 */
router.put('/:id', strategyController.updateStrategy);

/**
 * @route DELETE /api/strategies/:id
 * @desc Delete a strategy
 * @access Public
 */
router.delete('/:id', strategyController.deleteStrategy);

/**
 * @route GET /api/strategies/types
 * @desc Get available strategy types
 * @access Public
 */
router.get('/types/all', strategyController.getStrategyTypes);

/**
 * @route PUT /api/strategies/:id/active
 * @desc Set strategy active status
 * @access Public
 */
router.put('/:id/active', strategyController.setStrategyActive);

module.exports = router;
