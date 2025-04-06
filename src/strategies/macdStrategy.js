// src/strategies/macdStrategy.js

const BaseStrategy = require('./baseStrategy');
const logger = require('../utils/logger');

/**
 * Estratégia MACD (Moving Average Convergence Divergence)
 * 
 * Utiliza o indicador MACD para identificar oportunidades de entrada e saída.
 * Eficaz em mercados com tendência definida.
 */
class MACDStrategy extends BaseStrategy {
  // Metadados da estratégia para exibição no frontend
  static displayName = 'MACD Strategy';
  static description = 'Utiliza o indicador MACD para identificar oportunidades de entrada e saída. Eficaz em mercados com tendência definida.';
  
  // Parâmetros configuráveis para o frontend
  static parameters = [
    {
      name: 'fastPeriod',
      label: 'Período Rápido',
      type: 'number',
      default: 12,
      min: 2,
      max: 50,
      description: 'Período da média rápida para o cálculo do MACD'
    },
    {
      name: 'slowPeriod',
      label: 'Período Lento',
      type: 'number',
      default: 26,
      min: 5,
      max: 100,
      description: 'Período da média lenta para o cálculo do MACD'
    },
    {
      name: 'signalPeriod',
      label: 'Período do Sinal',
      type: 'number',
      default: 9,
      min: 2,
      max: 30,
      description: 'Período da média do sinal do MACD'
    },
    {
      name: 'investmentAmount',
      label: 'Valor de Investimento por Operação ($)',
      type: 'number',
      default: 100,
      min: 10,
      description: 'Valor a ser investido em cada operação'
    },
    {
      name: 'stopLossPercentage',
      label: 'Stop Loss (%)',
      type: 'number',
      default: 2,
      min: 0.1,
      max: 10,
      description: 'Porcentagem de stop loss abaixo do preço de entrada'
    },
    {
      name: 'takeProfitPercentage',
      label: 'Take Profit (%)',
      type: 'number',
      default: 4,
      min: 0.1,
      max: 20,
      description: 'Porcentagem de take profit acima do preço de entrada'
    },
    {
      name: 'useVolatilityAdjustment',
      label: 'Ajustar por Volatilidade',
      type: 'boolean',
      default: true,
      description: 'Ajustar tamanho da posição com base na volatilidade do mercado'
    },
    {
      name: 'confirmWithRSI',
      label: 'Confirmar com RSI',
      type: 'boolean',
      default: false,
      description: 'Utilizar RSI como confirmação adicional'
    },
    {
      name: 'rsiThreshold',
      label: 'Limite de RSI',
      type: 'number',
      default: 30,
      min: 10,
      max: 40,
      description: 'Limite de RSI para confirmação de compra (venda será 100 - este valor)'
    },
    {
      name: 'timeframe',
      label: 'Timeframe Principal',
      type: 'select',
      options: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
      default: '1h',
      description: 'Timeframe principal para análise MACD'
    }
  ];
  
  /**
   * Construtor da estratégia MACD
   * @param {Object} config - Configuração da estratégia
   */
  constructor(config) {
    super(config);
    
    // Parâmetros específicos do MACD
    this.fastPeriod = config.fastPeriod || 12;
    this.slowPeriod = config.slowPeriod || 26;
    this.signalPeriod = config.signalPeriod || 9;
    this.investmentAmount = config.investmentAmount || 100;
    this.stopLossPercentage = config.stopLossPercentage || 2;
    this.takeProfitPercentage = config.takeProfitPercentage || 4;
    this.useVolatilityAdjustment = config.useVolatilityAdjustment !== undefined ? config.useVolatilityAdjustment : true;
    this.confirmWithRSI = config.confirmWithRSI || false;
    this.rsiThreshold = config.rsiThreshold || 30;
    this.timeframe = config.timeframe || '1h';
    
    // Estado da estratégia
    this.inPosition = false;
    this.positionEntryPrice = 0;
    this.positionSize = 0;
    this.lastMACDSignal = null;
    this.lastSignalTime = null;
    
    // Adicionar todos os timeframes necessários
    this.requiredTimeframes = [this.timeframe];
    if (!this.timeframes.includes(this.timeframe)) {
      this.timeframes.push(this.timeframe);
    }
    
    // Adicionar indicadores
    this.requiredIndicators = {
      [this.timeframe]: ['macd', 'atr']
    };
    
    if (this.confirmWithRSI) {
      this.requiredIndicators[this.timeframe].push('rsi');
    }
    
    logger.info(`Estratégia MACD inicializada para ${this.pair} (Períodos: ${this.fastPeriod}/${this.slowPeriod}/${this.signalPeriod})`);
  }
  
  /**
   * Inicializa a estratégia
   */
  async init() {
    await super.init();
    logger.info(`Inicialização da estratégia MACD concluída para ${this.pair}`);
    return true;
  }
  
  /**
   * Calcula o valor de MACD, linha de sinal e histograma
   * @param {Array} closes - Array de preços de fechamento
   * @returns {Object} Valores MACD calculados
   */
  calculateMACD(closes) {
    // Esta é uma implementação simplificada - em produção, use biblioteca técnica
    // Calcular EMA rápida
    const fastEMA = this.calculateEMA(closes, this.fastPeriod);
    
    // Calcular EMA lenta
    const slowEMA = this.calculateEMA(closes, this.slowPeriod);
    
    // MACD Line = fastEMA - slowEMA
    const macdLine = fastEMA.map((fast, i) => 
      i < this.slowPeriod - 1 ? null : fast - slowEMA[i]
    ).filter(val => val !== null);
    
    // Calcular linha de sinal (EMA do MACD)
    const signalLine = this.calculateEMA(macdLine, this.signalPeriod);
    
    // Histograma = MACD Line - Signal Line
    const histogram = macdLine.slice(-signalLine.length).map((macd, i) => 
      macd - signalLine[i]
    );
    
    return {
      macdLine: macdLine.slice(-histogram.length),
      signalLine,
      histogram
    };
  }
  
  /**
   * Calcula EMA (Exponential Moving Average)
   * @param {Array} data - Array de preços
   * @param {number} period - Período para EMA
   * @returns {Array} Array de valores EMA
   */
  calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }
  
  /**
   * Calcula tamanho da posição com base na volatilidade
   * @param {number} price - Preço atual
   * @param {number} atr - Valor ATR atual
   * @returns {number} Tamanho da posição ajustado
   */
  calculatePositionSize(price, atr) {
    if (!this.useVolatilityAdjustment || !atr) {
      return this.investmentAmount / price;
    }
    
    // Calcular volatilidade como percentual do preço
    const volatilityPercent = (atr / price) * 100;
    
    // Ajustar tamanho da posição inversamente à volatilidade
    let adjustment = 1;
    
    if (volatilityPercent > 5) {
      // Alta volatilidade - reduzir posição
      adjustment = 0.5;
    } else if (volatilityPercent > 3) {
      // Volatilidade média - reduzir um pouco
      adjustment = 0.75;
    } else if (volatilityPercent < 1) {
      // Baixa volatilidade - aumentar posição
      adjustment = 1.25;
    }
    
    const adjustedAmount = this.investmentAmount * adjustment;
    return adjustedAmount / price;
  }
  
  /**
   * Verifica se o RSI confirma o sinal MACD
   * @param {string} signal - Sinal MACD ('BUY' ou 'SELL')
   * @param {number} rsi - Valor atual do RSI
   * @returns {boolean} Se o RSI confirma o sinal
   */
  checkRSIConfirmation(signal, rsi) {
    if (!this.confirmWithRSI || rsi === undefined) {
      return true; // Se não usar RSI, sempre confirma
    }
    
    if (signal === 'BUY' && rsi <= this.rsiThreshold) {
      return true; // RSI confirma sobrevendido para compra
    }
    
    if (signal === 'SELL' && rsi >= (100 - this.rsiThreshold)) {
      return true; // RSI confirma sobrecomprado para venda
    }
    
    return false;
  }
  
  /**
   * Executa a estratégia nos dados atuais do mercado
   * @param {Object} data - Dados do mercado
   * @returns {Array} Sinais de trading gerados
   */
  async execute(data) {
    const signals = [];
    
    try {
      // Verificar se temos dados suficientes
      if (!data.klines || !data.klines[this.timeframe] || data.klines[this.timeframe].length < this.slowPeriod + this.signalPeriod) {
        logger.warn(`Dados insuficientes para executar estratégia MACD para ${this.pair}`);
        return signals;
      }
      
      // Obter preço atual
      const currentPrice = data.ticker.close;
      
      // Extrair preços de fechamento
      const closes = data.klines[this.timeframe].map(candle => candle.close);
      
      // Obter indicadores calculados se disponíveis
      let macdValues;
      let atr;
      let rsi;
      
      if (this.indicatorValues && this.indicatorValues[this.timeframe]) {
        if (this.indicatorValues[this.timeframe].macd) {
          macdValues = {
            macdLine: this.indicatorValues[this.timeframe].macd,
            signalLine: this.indicatorValues[this.timeframe].macdSignal,
            histogram: this.indicatorValues[this.timeframe].macdHistogram
          };
        } else {
          macdValues = this.calculateMACD(closes);
        }
        
        atr = this.indicatorValues[this.timeframe].atr ? 
            this.indicatorValues[this.timeframe].atr[this.indicatorValues[this.timeframe].atr.length - 1] : null;
        
        if (this.confirmWithRSI) {
          rsi = this.indicatorValues[this.timeframe].rsi ? 
              this.indicatorValues[this.timeframe].rsi[this.indicatorValues[this.timeframe].rsi.length - 1] : null;
        }
      } else {
        macdValues = this.calculateMACD(closes);
      }
      
      // Obter os valores mais recentes
      const macd = macdValues.macdLine[macdValues.macdLine.length - 1];
      const signal = macdValues.signalLine[macdValues.signalLine.length - 1];
      const histogram = macdValues.histogram[macdValues.histogram.length - 1];
      const prevHistogram = macdValues.histogram[macdValues.histogram.length - 2];
      
      logger.info(`MACD atual para ${this.pair}: MACD=${macd.toFixed(6)}, Signal=${signal.toFixed(6)}, Histogram=${histogram.toFixed(6)}`);
      
      // Detectar cruzamento (histograma muda de sinal)
      const crossover = (histogram > 0 && prevHistogram <= 0); // Cruzamento para cima (sinal de compra)
      const crossunder = (histogram < 0 && prevHistogram >= 0); // Cruzamento para baixo (sinal de venda)
      
      // Evitar sinais repetidos em curto período
      const now = new Date();
      const signalThrottle = 1 * 60 * 60 * 1000; // 1 hora em milissegundos
      const canEmitSignal = !this.lastSignalTime || (now - this.lastSignalTime > signalThrottle);
      
      // Se estamos em posição, verificar saída
      if (this.inPosition) {
        // Verificar se atingiu stop loss ou take profit
        const stopLossPrice = this.positionEntryPrice * (1 - this.stopLossPercentage / 100);
        const takeProfitPrice = this.positionEntryPrice * (1 + this.takeProfitPercentage / 100);
        
        if (currentPrice <= stopLossPrice) {
          // Stop loss atingido
          signals.push({
            type: 'SELL',
            pair: this.pair,
            params: {
              price: currentPrice,
              quantity: this.positionSize
            },
            metadata: {
              reason: 'STOP_LOSS',
              entryPrice: this.positionEntryPrice,
              stopLossPrice,
              profit: ((currentPrice - this.positionEntryPrice) * this.positionSize)
            }
          });
          
          logger.info(`MACD: Stop Loss atingido para ${this.pair} @ ${currentPrice}`);
          this.inPosition = false;
          this.lastSignalTime = now;
        }
        else if (currentPrice >= takeProfitPrice) {
          // Take profit atingido
          signals.push({
            type: 'SELL',
            pair: this.pair,
            params: {
              price: currentPrice,
              quantity: this.positionSize
            },
            metadata: {
              reason: 'TAKE_PROFIT',
              entryPrice: this.positionEntryPrice,
              takeProfitPrice,
              profit: ((currentPrice - this.positionEntryPrice) * this.positionSize)
            }
          });
          
          logger.info(`MACD: Take Profit atingido para ${this.pair} @ ${currentPrice}`);
          this.inPosition = false;
          this.lastSignalTime = now;
        }
        // Sinal de venda do MACD
        else if (crossunder && canEmitSignal) {
          signals.push({
            type: 'SELL',
            pair: this.pair,
            params: {
              price: currentPrice,
              quantity: this.positionSize
            },
            metadata: {
              reason: 'MACD_SIGNAL',
              entryPrice: this.positionEntryPrice,
              macd: macd,
              signal: signal,
              histogram: histogram,
              profit: ((currentPrice - this.positionEntryPrice) * this.positionSize)
            }
          });
          
          logger.info(`Sinal de VENDA MACD gerado para ${this.pair} @ ${currentPrice}`);
          this.inPosition = false;
          this.lastSignalTime = now;
          this.lastMACDSignal = 'SELL';
        }
      }
      // Se não estamos em posição, verificar entrada
      else if (crossover && canEmitSignal) {
        // Verificar confirmação RSI se necessário
        if (this.checkRSIConfirmation('BUY', rsi)) {
          // Calcular tamanho da posição
          const positionSize = this.calculatePositionSize(currentPrice, atr);
          
          signals.push({
            type: 'BUY',
            pair: this.pair,
            params: {
              price: currentPrice,
              quantity: positionSize
            },
            metadata: {
              reason: 'MACD_SIGNAL',
              macd: macd,
              signal: signal,
              histogram: histogram,
              stopLossPrice: currentPrice * (1 - this.stopLossPercentage / 100),
              takeProfitPrice: currentPrice * (1 + this.takeProfitPercentage / 100)
            }
          });
          
          logger.info(`Sinal de COMPRA MACD gerado para ${this.pair} @ ${currentPrice}`);
          
          this.inPosition = true;
          this.positionEntryPrice = currentPrice;
          this.positionSize = positionSize;
          this.lastSignalTime = now;
          this.lastMACDSignal = 'BUY';
        } else {
          logger.info(`Sinal MACD não confirmado pelo RSI (${rsi}) para ${this.pair}`);
        }
      }
      
      return signals;
    } catch (error) {
      logger.error(`Erro na execução de MACD Strategy: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Processa o resultado de uma ordem
   * @param {Object} order - Dados da ordem executada
   */
  processOrderResult(order) {
    try {
      if (order.side === 'BUY' && order.status === 'FILLED') {
        this.inPosition = true;
        this.positionEntryPrice = parseFloat(order.price);
        this.positionSize = parseFloat(order.executedQty);
        
        logger.info(`MACD: Posição aberta para ${this.pair} @ ${this.positionEntryPrice}`);
      } 
      else if (order.side === 'SELL' && order.status === 'FILLED') {
        this.inPosition = false;
        
        // Calcular lucro
        const entryValue = this.positionEntryPrice * this.positionSize;
        const exitValue = parseFloat(order.price) * parseFloat(order.executedQty);
        const profit = exitValue - entryValue;
        
        logger.info(`MACD: Posição fechada para ${this.pair} com lucro de ${profit.toFixed(2)} USD`);
        
        this.positionEntryPrice = 0;
        this.positionSize = 0;
      }
    } catch (error) {
      logger.error(`Erro ao processar resultado da ordem MACD: ${error.message}`);
    }
  }
  
  /**
   * Valida parâmetros de configuração
   * @param {Object} params - Parâmetros a serem validados
   * @returns {Object} Resultado da validação
   */
  validateParameters(params) {
    const errors = [];
    
    if (params.fastPeriod >= params.slowPeriod) {
      errors.push('O período rápido deve ser menor que o período lento');
    }
    
    if (params.signalPeriod > params.slowPeriod / 2) {
      errors.push('O período do sinal deve ser menor ou igual à metade do período lento');
    }
    
    if (params.investmentAmount <= 0) {
      errors.push('O valor de investimento deve ser maior que zero');
    }
    
    if (params.confirmWithRSI && (params.rsiThreshold < 10 || params.rsiThreshold > 40)) {
      errors.push('O limite de RSI deve estar entre 10 e 40');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = MACDStrategy;