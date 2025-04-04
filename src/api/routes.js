const express = require('express');
const router = express.Router();

// Rotas de API
router.get('/test', (req, res) => {
  res.json({ message: 'API está funcionando!' });
});

// Exporte o router
module.exports = router;