// src/core/tradingEngine.js

const binanceService = require('../services/binanceService');
const { getStrategies, getActiveStrategies } = require('../strategies/strategyManager');
const riskManager = require('./riskManager');
const orderManager = require('./orderManager');
const portfolioManager = require('./portfolioManager');
const logger = require('../utils/logger');

class TradingEngine {
  constructor() {
    this.isRunning = false;
    this.tickerData = {};
    this.websockets = {};
    this.intervals = {};
    this.strategies = [];
    this.wss = null; // WebSocket server para comunicação com o frontend
  }

  /**
   * Inicializa o motor de trading
   * @param {WebSocket.Server} wss - Servidor WebSocket para comunicação com o frontend
   */
  async init(wss) {
    this.wss = wss;
    
    // Inicializar gerenciadores
    await portfolioManager.init();
    await orderManager.init();
    await riskManager.init();
    
    // Carregar estratégias
    this.strategies = await getStrategies();
    
    logger.info('Motor de trading inicializado');
    return this;
  }

  /**
   * Inicia o motor de trading
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Motor de trading já está em execução');
      return;
    }
    
    this.isRunning = true;
    logger.info('Iniciando motor de trading');
    
    try {
      // Obter estratégias ativas
      const activeStrategies = await getActiveStrategies();
      
      if (activeStrategies.length === 0) {
        logger.warn('Nenhuma estratégia ativa encontrada');
        return;
      }
      
      // Registrar pares únicos de todas as estratégias ativas
      const pairs = this.getUniquePairs(activeStrategies);
      
      // Iniciar WebSockets para todos os pares
      this.setupWebSockets(pairs);
      
      // Iniciar intervalos de verificação para cada estratégia
      this.setupStrategyIntervals(activeStrategies);
      
      // Notificar frontend
      this.broadcastStatus({ running: true, activeStrategies: activeStrategies.length });
      
      logger.info(`Motor de trading iniciado com ${activeStrategies.length} estratégias`);
    } catch (error) {
      logger.error('Erro ao iniciar motor de trading:', error);
      this.isRunning = false;
      
      // Notificar frontend
      this.broadcastStatus({ running: false, error: error.message });
    }
  }

  /**
   * Para o motor de trading
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Motor de trading já está parado');
      return;
    }
    
    logger.info('Parando motor de trading');
    
    // Fechar todos os WebSockets
    Object.values(this.websockets).forEach(ws => {
      if (ws && ws.readyState === 1) { // OPEN
        ws.close();
      }
    });
    this.websockets = {};
    
    // Limpar todos os intervalos
    Object.values(this.intervals).forEach(interval => {
      clearInterval(interval);
    });
    this.intervals = {};
    
    this.isRunning = false;
    
    // Notificar frontend
    this.broadcastStatus({ running: false });
    
    logger.info('Motor de trading parado');
  }

  /**
   * Configura WebSockets para os pares especificados
   * @param {Array} pairs - Array de pares de trading (ex: ['BTCUSDT', 'ETHUSDT'])
   */
  setupWebSockets(pairs) {
    logger.info(`Configurando WebSockets para ${pairs.length} pares`);
    
    // Ticker WebSocket para todos os pares
    this.websockets.ticker = binanceService.createTickerWebSocket(pairs, (data) => {
      // Atualizar dados do ticker
      if (data.s) {
        this.tickerData[data.s] = data;
        
        // Broadcast para o frontend se necessário
        this.broadcastTickerUpdate(data.s, data);
      }
    });
    
    // WebSockets para candles de diferentes timeframes
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    pairs.forEach(pair => {
      timeframes.forEach(timeframe => {
        const wsKey = `${pair}_${timeframe}`;
        
        this.websockets[wsKey] = binanceService.createKlineWebSocket(pair, timeframe, (data) => {
          if (data.k) {
            // Processar candle para cada estratégia que use este par/timeframe
            this.processCandle(pair, timeframe, data.k);
          }
        });
      });
    });
  }

  /**
   * Configura intervalos de verificação para cada estratégia
   * @param {Array} strategies - Array de estratégias ativas
   */
  setupStrategyIntervals(strategies) {
    strategies.forEach(strategy => {
      const strategyId = strategy.id;
      
      // Intervalo para verificação regular da estratégia
      this.intervals[strategyId] = setInterval(() => {
        this.executeStrategy(strategy);
      }, strategy.checkInterval || 60000); // Default: 1 minuto
      
      logger.info(`Configurado intervalo para estratégia ${strategy.name} (ID: ${strategyId})`);
    });
  }

  /**
   * Executa uma estratégia específica
   * @param {Object} strategy - Estratégia a ser executada
   */
  async executeStrategy(strategy) {
    logger.info(`Executando estratégia: ${strategy.name}`);
    
    try {
      // Verificar se o mercado está em condições favoráveis
      const marketConditions = await this.getMarketConditions(strategy.pair);
      
      // Verificar limites de risco
      const riskCheck = riskManager.checkRiskLimits(strategy, marketConditions);
      
      if (!riskCheck.allowed) {
        logger.warn(`Execução da estratégia ${strategy.name} bloqueada pelo gerenciador de risco: ${riskCheck.reason}`);
        return;
      }
      
      // Obter sinais da estratégia
      const strategyInstance = this.strategies.find(s => s.id === strategy.id);
      
      if (!strategyInstance) {
        logger.error(`Estratégia com ID ${strategy.id} não encontrada`);
        return;
      }
      
      // Obter dados necessários para a estratégia
      const strategyData = await this.getStrategyData(strategy);
      
      // Executar lógica da estratégia
      const signals = await strategyInstance.execute(strategyData);
      
      if (!signals || signals.length === 0) {
        logger.info(`Nenhum sinal gerado pela estratégia ${strategy.name}`);
        return;
      }
      
      // Processar sinais
      for (const signal of signals) {
        await this.processSignal(strategy, signal);
      }
      
      // Atualizar status da estratégia
      this.broadcastStrategyUpdate(strategy.id, { lastRun: new Date(), signals });
      
    } catch (error) {
      logger.error(`Erro ao executar estratégia ${strategy.name}:`, error);
      
      // Notificar frontend
      this.broadcastStrategyUpdate(strategy.id, { error: error.message });
    }
  }

  /**
   * Processa um sinal de trading
   * @param {Object} strategy - Estratégia que gerou o sinal
   * @param {Object} signal - Sinal de trading
   */
  async processSignal(strategy, signal) {
    logger.info(`Processando sinal para ${strategy.name}: ${signal.type} ${signal.pair} - ${JSON.stringify(signal.params)}`);
    
    try {
      // Verificar risco para este sinal específico
      const riskAssessment = riskManager.assessSignalRisk(strategy, signal);
      
      if (!riskAssessment.allowed) {
        logger.warn(`Sinal bloqueado pelo gerenciador de risco: ${riskAssessment.reason}`);
        return;
      }
      
      // Calcular tamanho da ordem baseado no gerenciamento de risco
      const orderSize = riskManager.calculatePositionSize(strategy, signal);
      
      // Criar parâmetros da ordem
      const orderParams = {
        symbol: signal.pair,
        side: signal.type, // BUY ou SELL
        type: signal.orderType || 'LIMIT',
        quantity: orderSize,
        ...signal.params
      };
      
      // Adicionar stop loss e take profit se necessário
      if (signal.stopLoss) {
        orderParams.stopPrice = signal.stopLoss;
      }
      
      if (signal.takeProfit) {
        // Em produção, isso seria implementado como uma ordem OCO
        // ou como uma ordem separada após a execução da ordem principal
      }
      
      // Enviar ordem
      const order = await orderManager.placeOrder(orderParams);
      
      // Registrar ordem no histórico
      await portfolioManager.recordTrade({
        strategyId: strategy.id,
        strategyName: strategy.name,
        symbol: signal.pair,
        type: signal.type,
        price: signal.params.price,
        quantity: orderSize,
        orderId: order.orderId,
        time: new Date()
      });
      
      // Notificar frontend
      this.broadcastTradeUpdate({
        strategyId: strategy.id,
        strategyName: strategy.name,
        symbol: signal.pair,
        type: signal.type,
        price: signal.params.price,
        quantity: orderSize,
        time: new Date()
      });
      
      logger.info(`Ordem ${signal.type} enviada para ${signal.pair}: ${order.orderId}`);
    } catch (error) {
      logger.error(`Erro ao processar sinal de trading:`, error);
    }
  }

  /**
   * Processa um novo candle
   * @param {string} pair - Par de trading
   * @param {string} timeframe - Timeframe do candle
   * @param {Object} candle - Dados do candle
   */
  processCandle(pair, timeframe, candle) {
    if (this.isRunning) {
      // Encontrar estratégias que usam este par e timeframe
      const relevantStrategies = this.strategies.filter(strategy => 
        strategy.pair === pair && strategy.timeframes.includes(timeframe)
      );
      
      // Processar candle para cada estratégia relevante
      relevantStrategies.forEach(strategy => {
        strategy.updateCandle(timeframe, candle);
        
        // Se o candle está fechado, verificar por sinais
        if (candle.x) { // x = candle fechado
          this.executeStrategy(strategy);
        }
      });
    }
  }

  /**
   * Obtém dados de mercado necessários para uma estratégia
   * @param {Object} strategy - Estratégia
   * @returns {Object} Dados para a estratégia
   */
  async getStrategyData(strategy) {
    // Obter preços atuais
    const tickerData = this.tickerData[strategy.pair] || 
                       (await binanceService.getTickerPrice(strategy.pair)).data;
    
    // Obter dados históricos para cada timeframe
    const klines = {};
    
    for (const timeframe of strategy.timeframes) {
      const klinesData = await binanceService.getKlines(strategy.pair, timeframe, { limit: 100 });
      klines[timeframe] = klinesData.data;
    }
    
    // Obter saldo da conta
    const accountInfo = await binanceService.getAccountInfo();
    
    // Obter ordens abertas
    const openOrders = await binanceService.getOpenOrders(strategy.pair);
    
    return {
      pair: strategy.pair,
      ticker: tickerData,
      klines,
      account: accountInfo.data,
      openOrders: openOrders.data || [],
      portfolio: await portfolioManager.getPortfolio()
    };
  }

  /**
   * Obtém condições gerais do mercado
   * @param {string} pair - Par de trading
   * @returns {Object} Condições do mercado
   */
  async getMarketConditions(pair) {
    try {
      // Obter dados de mercado de diferentes timeframes
      const klines1h = await binanceService.getKlines(pair, '1h', { limit: 24 });
      const klines1d = await binanceService.getKlines(pair, '1d', { limit: 7 });
      
      // Calcular volatilidade
      const pricesHourly = klines1h.data.map(k => k.close);
      const pricesDaily = klines1d.data.map(k => k.close);
      
      const volatilityHourly = this.calculateVolatility(pricesHourly);
      const volatilityDaily = this.calculateVolatility(pricesDaily);
      
      // Determinar tendência
      const trendHourly = this.determineTrend(pricesHourly);
      const trendDaily = this.determineTrend(pricesDaily);
      
      // Volume médio
      const volumeHourly = klines1h.data.reduce((sum, k) => sum + k.volume, 0) / klines1h.data.length;
      const volumeDaily = klines1d.data.reduce((sum, k) => sum + k.volume, 0) / klines1d.data.length;
      
      return {
        pair,
        volatility: {
          hourly: volatilityHourly,
          daily: volatilityDaily
        },
        trend: {
          hourly: trendHourly,
          daily: trendDaily
        },
        volume: {
          hourly: volumeHourly,
          daily: volumeDaily
        },
        currentPrice: pricesHourly[pricesHourly.length - 1]
      };
    } catch (error) {
      logger.error(`Erro ao obter condições de mercado para ${pair}:`, error);
      return null;
    }
  }

  /**
   * Calcula a volatilidade de uma série de preços
   * @param {Array} prices - Série de preços
   * @returns {number} Volatilidade (desvio padrão percentual)
   */
  calculateVolatility(prices) {
    if (!prices || prices.length < 2) return 0;
    
    // Calcular retornos
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    // Calcular média
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    
    // Calcular desvio padrão
    const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Determina a tendência de uma série de preços
   * @param {Array} prices - Série de preços
   * @returns {string} Tendência ('up', 'down', 'sideways')
   */
  determineTrend(prices) {
    if (!prices || prices.length < 2) return 'sideways';
    
    // Método simples: comparar primeiro e último preço
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const changePct = (lastPrice - firstPrice) / firstPrice * 100;
    
    if (changePct > 3) return 'up';
    if (changePct < -3) return 'down';
    return 'sideways';
  }

  /**
   * Obtém pares únicos de um conjunto de estratégias
   * @param {Array} strategies - Array de estratégias
   * @returns {Array} Array de pares únicos
   */
  getUniquePairs(strategies) {
    return [...new Set(strategies.map(strategy => strategy.pair))];
  }

  /**
   * Envia status do motor para o frontend
   * @param {Object} status - Status do motor
   */
  broadcastStatus(status) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            type: 'ENGINE_STATUS',
            data: {
              ...status,
              timestamp: new Date()
            }
          }));
        }
      });
    }
  }

  /**
   * Envia atualização de ticker para o frontend
   * @param {string} symbol - Símbolo do par
   * @param {Object} data - Dados do ticker
   */
  broadcastTickerUpdate(symbol, data) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            type: 'TICKER_UPDATE',
            data: {
              symbol,
              price: data.c || data.close,
              change: data.p || data.priceChange,
              volume: data.v || data.volume,
              timestamp: new Date()
            }
          }));
        }
      });
    }
  }

  /**
   * Envia atualização de estratégia para o frontend
   * @param {string} strategyId - ID da estratégia
   * @param {Object} data - Dados da atualização
   */
  broadcastStrategyUpdate(strategyId, data) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            type: 'STRATEGY_UPDATE',
            data: {
              strategyId,
              ...data,
              timestamp: new Date()
            }
          }));
        }
      });
    }
  }

  /**
   * Envia atualização de trade para o frontend
   * @param {Object} trade - Dados do trade
   */
  broadcastTradeUpdate(trade) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            type: 'TRADE_UPDATE',
            data: trade
          }));
        }
      });
    }
  }
}

// Singleton
const tradingEngine = new TradingEngine();

/**
 * Inicializa o motor de trading
 * @param {WebSocket.Server} wss - Servidor WebSocket para comunicação com o frontend
 */
const initTradingEngine = async (wss) => {
  await tradingEngine.init(wss);
  return tradingEngine;
};

module.exports = {
  initTradingEngine,
  getTradingEngine: () => tradingEngine
};