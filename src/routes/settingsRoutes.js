const express = require('express');
const router = express.Router();

// Placeholder for now - can be expanded later
router.get('/', (req, res) => {
  res.json({ message: 'Settings API ready' });
});

module.exports = router;
