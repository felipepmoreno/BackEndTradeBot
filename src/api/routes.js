const express = require('express');
const router = express.Router();
const binanceService = require('../services/binanceService');
const tradingEngine = require('../core/tradingEngine');
const portfolioManager = require('../core/portfolioManager');
const riskManager = require('../core/riskManager');
const orderManager = require('../core/orderManager');
const strategyManager = require('../core/strategyManager');
const logger = require('../utils/logger');

// Status da API
router.get('/status', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Dados da conta
router.get('/account', async (req, res) => {
  try {
    const accountInfo = await binanceService.getAccountInfo();
    res.json(accountInfo);
  } catch (error) {
    logger.error('Erro ao obter informações da conta:', error);
    res.status(500).json({ error: 'Erro ao obter informações da conta' });
  }
});

// Saldo do portfólio
router.get('/portfolio', (req, res) => {
  try {
    const portfolio = portfolioManager.getPortfolio();
    res.json(portfolio);
  } catch (error) {
    logger.error('Erro ao obter dados do portfólio:', error);
    res.status(500).json({ error: 'Erro ao obter dados do portfólio' });
  }
});

// Histórico de operações
router.get('/trades', (req, res) => {
  try {
    const filters = req.query;
    const trades = portfolioManager.getTradeHistory(filters);
    res.json(trades);
  } catch (error) {
    logger.error('Erro ao obter histórico de operações:', error);
    res.status(500).json({ error: 'Erro ao obter histórico de operações' });
  }
});

// Ordens abertas
router.get('/orders', (req, res) => {
  try {
    const symbol = req.query.symbol;
    const orders = orderManager.getOpenOrders(symbol);
    res.json(orders);
  } catch (error) {
    logger.error('Erro ao obter ordens abertas:', error);
    res.status(500).json({ error: 'Erro ao obter ordens abertas' });
  }
});

// Estatísticas de risco
router.get('/risk/stats', (req, res) => {
  try {
    const stats = riskManager.getRiskStats();
    res.json(stats);
  } catch (error) {
    logger.error('Erro ao obter estatísticas de risco:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas de risco' });
  }
});

// Configurações de risco
router.get('/risk/settings', (req, res) => {
  try {
    res.json(riskManager.settings);
  } catch (error) {
    logger.error('Erro ao obter configurações de risco:', error);
    res.status(500).json({ error: 'Erro ao obter configurações de risco' });
  }
});

// Atualizar configurações de risco
router.post('/risk/settings', async (req, res) => {
  try {
    const success = await riskManager.updateSettings(req.body);
    if (success) {
      res.json({ success: true, settings: riskManager.settings });
    } else {
      res.status(400).json({ success: false, error: 'Falha ao atualizar configurações' });
    }
  } catch (error) {
    logger.error('Erro ao atualizar configurações de risco:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações de risco' });
  }
});

// Lista de estratégias
router.get('/strategies', (req, res) => {
  try {
    const strategies = strategyManager.getStrategies();
    res.json(strategies);
  } catch (error) {
    logger.error('Erro ao obter lista de estratégias:', error);
    res.status(500).json({ error: 'Erro ao obter lista de estratégias' });
  }
});

// Obter estratégia específica
router.get('/strategies/:id', (req, res) => {
  try {
    const strategy = strategyManager.getStrategy(req.params.id);
    if (strategy) {
      res.json(strategy);
    } else {
      res.status(404).json({ error: 'Estratégia não encontrada' });
    }
  } catch (error) {
    logger.error('Erro ao obter estratégia:', error);
    res.status(500).json({ error: 'Erro ao obter estratégia' });
  }
});

// Criar nova estratégia
router.post('/strategies', async (req, res) => {
  try {
    const result = await strategyManager.createStrategy(req.body);
    if (result.success) {
      res.status(201).json(result.strategy);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao criar estratégia:', error);
    res.status(500).json({ error: 'Erro ao criar estratégia' });
  }
});

// Atualizar estratégia
router.put('/strategies/:id', async (req, res) => {
  try {
    const result = await strategyManager.updateStrategy(req.params.id, req.body);
    if (result.success) {
      res.json(result.strategy);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao atualizar estratégia:', error);
    res.status(500).json({ error: 'Erro ao atualizar estratégia' });
  }
});

// Remover estratégia
router.delete('/strategies/:id', async (req, res) => {
  try {
    const result = await strategyManager.deleteStrategy(req.params.id);
    if (result.success) {
      res.status(204).send();
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao remover estratégia:', error);
    res.status(500).json({ error: 'Erro ao remover estratégia' });
  }
});

// Iniciar/Parar estratégia
router.post('/strategies/:id/toggle', async (req, res) => {
  try {
    const { active } = req.body;
    const result = await strategyManager.toggleStrategy(req.params.id, active);
    if (result.success) {
      res.json({ id: req.params.id, active });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao alternar estado da estratégia:', error);
    res.status(500).json({ error: 'Erro ao alternar estado da estratégia' });
  }
});

// Iniciar/Parar trading
router.post('/trading/toggle', (req, res) => {
  try {
    const { active } = req.body;
    
    if (active) {
      tradingEngine.startTrading();
      riskManager.enableTrading();
      res.json({ status: 'Trading ativado' });
    } else {
      tradingEngine.stopTrading();
      riskManager.disableTrading('Desativado manualmente pelo usuário');
      res.json({ status: 'Trading desativado' });
    }
  } catch (error) {
    logger.error('Erro ao alternar estado do trading:', error);
    res.status(500).json({ error: 'Erro ao alternar estado do trading' });
  }
});

// Status do trading
router.get('/trading/status', (req, res) => {
  try {
    const status = {
      isActive: tradingEngine.isRunning(),
      tradingEnabled: riskManager.state.tradingEnabled,
      lastUpdate: new Date()
    };
    res.json(status);
  } catch (error) {
    logger.error('Erro ao obter status do trading:', error);
    res.status(500).json({ error: 'Erro ao obter status do trading' });
  }
});

// Preço atual de um par
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const response = await binanceService.getTickerPrice(req.params.symbol);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(400).json({ error: response.error });
    }
  } catch (error) {
    logger.error(`Erro ao obter preço para ${req.params.symbol}:`, error);
    res.status(500).json({ error: `Erro ao obter preço para ${req.params.symbol}` });
  }
});

module.exports = router;