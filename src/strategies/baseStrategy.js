// src/strategies/baseStrategy.js

const logger = require('../utils/logger');
const indicators = require('../utils/indicators');

/**
 * Classe base para todas as estratégias de trading
 */
class BaseStrategy {
  /**
   * Construtor da estratégia base
   * @param {Object} config - Configuração da estratégia
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = this.constructor.name;
    this.description = config.description || '';
    this.pair = config.pair;
    this.timeframes = config.timeframes || ['1h'];
    this.active = config.active !== undefined ? config.active : false;
    this.config = config;
    this.backtesting = config.backtesting || false;
    
    // Dados do mercado
    this.candles = {};
    this.priceData = {};
    this.indicatorValues = {};
    
    // Estatísticas de desempenho
    this.performance = {
      trades: 0,
      winningTrades: 0,
      losingTrades: 0,
      profitFactor: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      lastUpdated: null
    };
    
    logger.info(`Estratégia ${this.name} (${this.type}) inicializada para ${this.pair}`);
  }
  
  /**
   * Inicializa a estratégia
   */
  async init() {
    try {
      // Carregar dados históricos
      await this.loadHistoricalData();
      
      // Calcular indicadores iniciais
      this.updateIndicators();
      
      // Carregar performance histórica se não estiver em backtesting
      if (!this.backtesting) {
        await this.loadPerformance();
      }
      
      return true;
    } catch (error) {
      logger.error(`Erro ao inicializar estratégia ${this.name}:`, error);
      return false;
    }
  }
  
  /**
   * Carrega dados históricos para a estratégia
   */
  async loadHistoricalData() {
    // Esta é uma implementação base que deve ser estendida em estratégias reais
    // para carregar dados da API da Binance ou de um banco de dados
    
    logger.info(`Carregando dados históricos para ${this.name} (${this.pair})`);
    
    // Em uma implementação real, carregaria dados de cada timeframe
    for (const timeframe of this.timeframes) {
      // Inicializa estrutura de candles para o timeframe se não existir
      if (!this.candles[timeframe]) {
        this.candles[timeframe] = [];
      }
    }
  }
  
  /**
   * Atualiza os dados de um candle específico
   * @param {string} timeframe - Timeframe do candle
   * @param {Object} candle - Dados do candle
   */
  updateCandle(timeframe, candle) {
    // Verificar se o timeframe é relevante para esta estratégia
    if (!this.timeframes.includes(timeframe)) {
      return;
    }
    
    // Converter dados do candle para formato padrão
    const formattedCandle = {
      time: candle.t,
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v),
      isClosed: candle.x
    };
    
    // Atualizar array de candles
    if (!this.candles[timeframe]) {
      this.candles[timeframe] = [];
    }
    
    // Verificar se o candle já existe (baseado no timestamp)
    const index = this.candles[timeframe].findIndex(c => c.time === formattedCandle.time);
    
    if (index >= 0) {
      // Atualizar candle existente
      this.candles[timeframe][index] = formattedCandle;
    } else {
      // Adicionar novo candle
      this.candles[timeframe].push(formattedCandle);
      
      // Manter apenas os últimos 1000 candles
      if (this.candles[timeframe].length > 1000) {
        this.candles[timeframe].shift();
      }
    }
    
    // Atualizar dados de preço para o par
    this.priceData = {
      last: formattedCandle.close,
      updated: new Date()
    };
    
    // Atualizar indicadores se o candle foi fechado
    if (formattedCandle.isClosed) {
      this.updateIndicators();
    }
  }
  
  /**
   * Atualiza os indicadores técnicos da estratégia
   */
  updateIndicators() {
    // Esta é uma implementação base que deve ser estendida em estratégias específicas
    // para calcular os indicadores relevantes para cada estratégia
    
    try {
      // Para cada timeframe
      for (const timeframe of this.timeframes) {
        if (!this.candles[timeframe] || this.candles[timeframe].length < 10) {
          continue; // Não há dados suficientes
        }
        
        // Extrair arrays de OHLC
        const closes = this.candles[timeframe].map(c => c.close);
        const highs = this.candles[timeframe].map(c => c.high);
        const lows = this.candles[timeframe].map(c => c.low);
        const volumes = this.candles[timeframe].map(c => c.volume);
        
        // Inicializar objeto de indicadores para este timeframe
        if (!this.indicatorValues[timeframe]) {
          this.indicatorValues[timeframe] = {};
        }
        
        // Calcular indicadores comuns (outros podem ser adicionados em subclasses)
        
        // SMA (Média Móvel Simples)
        this.indicatorValues[timeframe].sma = {
          short: indicators.sma(closes, 9),
          medium: indicators.sma(closes, 21),
          long: indicators.sma(closes, 50)
        };
        
        // EMA (Média Móvel Exponencial)
        this.indicatorValues[timeframe].ema = {
          short: indicators.ema(closes, 9),
          medium: indicators.ema(closes, 21),
          long: indicators.ema(closes, 50)
        };
        
        // RSI (Índice de Força Relativa)
        this.indicatorValues[timeframe].rsi = indicators.rsi(closes, 14);
        
        // MACD (Convergência/Divergência de Médias Móveis)
        this.indicatorValues[timeframe].macd = indicators.macd(closes);
        
        // Bollinger Bands
        this.indicatorValues[timeframe].bollinger = indicators.bollingerBands(closes, 20, 2);
        
        // ATR (Average True Range)
        this.indicatorValues[timeframe].atr = indicators.atr(highs, lows, closes, 14);
      }
    } catch (error) {
      logger.error(`Erro ao atualizar indicadores para ${this.name}:`, error);
    }
  }
  
  /**
   * Carrega dados de performance da estratégia
   */
  async loadPerformance() {
    // Esta é uma implementação base que deve ser estendida em estratégias reais
    // para carregar dados de desempenho de um banco de dados
    
    // Em uma implementação real, carregaria dados de desempenho
    // como número de trades, win rate, profit factor etc.
    
    logger.info(`Carregando dados de performance para ${this.name}`);
  }
  
  /**
   * Atualiza estatísticas de desempenho com um novo trade
   * @param {Object} trade - Dados do trade
   */
  updatePerformance(trade) {
    this.performance.trades += 1;
    
    if (trade.profit > 0) {
      this.performance.winningTrades += 1;
      this.performance.totalProfit += trade.profit;
    } else {
      this.performance.losingTrades += 1;
      this.performance.totalProfit += trade.profit; // Profit já é negativo
    }
    
    // Calcular win rate
    this.performance.winRate = (this.performance.winningTrades / this.performance.trades) * 100;
    
    // Outros cálculos de desempenho seriam feitos aqui...
    
    this.performance.lastUpdated = new Date();
  }
  
  /**
   * Executa a estratégia nos dados atuais do mercado
   * @param {Object} data - Dados do mercado
   * @returns {Array} Sinais de trading gerados
   */
  async execute(data) {
    // Este método deve ser implementado em cada estratégia específica
    throw new Error('O método execute() deve ser implementado na classe filha');
  }
  
  /**
   * Executa backtesting da estratégia em dados históricos
   * @param {Object} historicalData - Dados históricos
   * @param {Object} options - Opções de backtesting
   * @returns {Object} Resultados do backtesting
   */
  async backtest(historicalData, options = {}) {
    // Este método fornece uma base para backtesting,
    // mas subclasses podem estendê-lo com lógicas específicas
    
    logger.info(`Iniciando backtesting para ${this.name} (${this.pair})`);
    
    const results = {
      trades: [],
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        sharpeRatio: 0
      },
      equity: []
    };
    
    // Configuração inicial
    const initialCapital = options.initialCapital || 10000;
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDrawdown = 0;
    let position = null;
    
    // Para cada timeframe nos dados históricos
    for (const timeframe in historicalData) {
      if (!this.timeframes.includes(timeframe)) continue;
      
      const candles = historicalData[timeframe];
      
      // Simular trading em ordem cronológica
      for (let i = 50; i < candles.length; i++) { // Começamos em 50 para ter dados suficientes para indicadores
        // Definir candles atuais
        this.candles[timeframe] = candles.slice(0, i + 1);
        
        // Atualizar indicadores
        this.updateIndicators();
        
        // Executar estratégia
        const data = {
          pair: this.pair,
          ticker: { close: candles[i].close },
          klines: { [timeframe]: this.candles[timeframe] },
          indicators: this.indicatorValues
        };
        
        const signals = await this.execute(data);
        
        // Processar sinais
        if (signals && signals.length > 0) {
          for (const signal of signals) {
            // Simular execução do sinal
            const price = candles[i].close;
            
            // Gerenciar posição
            if (signal.type === 'BUY' && !position) {
              // Abrir posição
              const size = options.positionSize || 0.1; // 10% do capital
              const amount = equity * size;
              const quantity = amount / price;
              
              position = {
                entryPrice: price,
                quantity,
                entryTime: candles[i].time,
                stopLoss: signal.stopLoss,
                takeProfit: signal.takeProfit
              };
              
              logger.debug(`[Backtest] Abrindo posição em ${this.pair} @ ${price}`);
            } 
            else if (signal.type === 'SELL' && position) {
              // Fechar posição
              const exitPrice = price;
              const profit = (exitPrice - position.entryPrice) * position.quantity;
              const profitPct = ((exitPrice / position.entryPrice) - 1) * 100;
              
              // Registrar trade
              results.trades.push({
                pair: this.pair,
                entryTime: position.entryTime,
                entryPrice: position.entryPrice,
                exitTime: candles[i].time,
                exitPrice,
                quantity: position.quantity,
                profit,
                profitPct
              });
              
              // Atualizar equity
              equity += profit;
              
              // Atualizar drawdown
              if (equity > peak) {
                peak = equity;
              } else {
                const drawdown = (peak - equity) / peak * 100;
                if (drawdown > maxDrawdown) {
                  maxDrawdown = drawdown;
                }
              }
              
              // Registrar equity point
              results.equity.push({
                time: candles[i].time,
                equity
              });
              
              logger.debug(`[Backtest] Fechando posição em ${this.pair} @ ${price} (P&L: ${profit.toFixed(2)} / ${profitPct.toFixed(2)}%)`);
              
              // Limpar posição
              position = null;
            }
          }
        }
        
        // Verificar stop loss e take profit
        if (position) {
          const currentPrice = candles[i].close;
          
          // Stop loss
          if (position.stopLoss && currentPrice <= position.stopLoss) {
            // Simular fechamento por stop loss
            const profit = (position.stopLoss - position.entryPrice) * position.quantity;
            const profitPct = ((position.stopLoss / position.entryPrice) - 1) * 100;
            
            results.trades.push({
              pair: this.pair,
              entryTime: position.entryTime,
              entryPrice: position.entryPrice,
              exitTime: candles[i].time,
              exitPrice: position.stopLoss,
              quantity: position.quantity,
              profit,
              profitPct,
              type: 'STOP_LOSS'
            });
            
            equity += profit;
            
            if (equity > peak) {
              peak = equity;
            } else {
              const drawdown = (peak - equity) / peak * 100;
              if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
              }
            }
            
            results.equity.push({
              time: candles[i].time,
              equity
            });
            
            logger.debug(`[Backtest] Stop loss atingido em ${this.pair} @ ${position.stopLoss} (P&L: ${profit.toFixed(2)} / ${profitPct.toFixed(2)}%)`);
            
            position = null;
          }
          // Take profit
          else if (position.takeProfit && currentPrice >= position.takeProfit) {
            // Simular fechamento por take profit
            const profit = (position.takeProfit - position.entryPrice) * position.quantity;
            const profitPct = ((position.takeProfit / position.entryPrice) - 1) * 100;
            
            results.trades.push({
              pair: this.pair,
              entryTime: position.entryTime,
              entryPrice: position.entryPrice,
              exitTime: candles[i].time,
              exitPrice: position.takeProfit,
              quantity: position.quantity,
              profit,
              profitPct,
              type: 'TAKE_PROFIT'
            });
            
            equity += profit;
            
            if (equity > peak) {
              peak = equity;
            } else {
              const drawdown = (peak - equity) / peak * 100;
              if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
              }
            }
            
            results.equity.push({
              time: candles[i].time,
              equity
            });
            
            logger.debug(`[Backtest] Take profit atingido em ${this.pair} @ ${position.takeProfit} (P&L: ${profit.toFixed(2)} / ${profitPct.toFixed(2)}%)`);
            
            position = null;
          }
        }
      }
    }
    
    // Calcular métricas de desempenho
    results.performance.totalTrades = results.trades.length;
    results.performance.winningTrades = results.trades.filter(t => t.profit > 0).length;
    results.performance.losingTrades = results.trades.filter(t => t.profit <= 0).length;
    results.performance.winRate = results.performance.totalTrades > 0 
      ? (results.performance.winningTrades / results.performance.totalTrades) * 100 
      : 0;
    
    results.performance.totalProfit = equity - initialCapital;
    results.performance.totalProfitPct = (results.performance.totalProfit / initialCapital) * 100;
    results.performance.maxDrawdown = maxDrawdown;
    
    // Calcular profit factor (soma dos lucros / soma das perdas)
    const totalWins = results.trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const totalLosses = Math.abs(results.trades.filter(t => t.profit <= 0).reduce((sum, t) => sum + t.profit, 0));
    results.performance.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
    
    // Calcular Sharpe Ratio
    if (results.equity.length > 1) {
      const returns = [];
      for (let i = 1; i < results.equity.length; i++) {
        returns.push((results.equity[i].equity / results.equity[i-1].equity) - 1);
      }
      
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
      
      results.performance.sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0; // Anualized
    }
    
    logger.info(`Backtesting concluído para ${this.name}. Resultado: ${results.performance.totalProfit.toFixed(2)} (${results.performance.totalProfitPct.toFixed(2)}%)`);
    
    return results;
  }
  
  /**
   * Retorna os parâmetros da estratégia para o frontend
   * @returns {Object} Parâmetros da estratégia
   */
  getParameters() {
    // Este método deve ser implementado em cada estratégia específica
    // para fornecer os parâmetros configuráveis
    return this.config;
  }
  
  /**
   * Valida parâmetros de configuração
   * @param {Object} params - Parâmetros a serem validados
   * @returns {Object} Resultado da validação (isValid, errors)
   */
  validateParameters(params) {
    // Este método deve ser implementado em cada estratégia específica
    // para validar parâmetros
    return { isValid: true, errors: [] };
  }
}

module.exports = BaseStrategy;