// src/strategies/gridTrading.js

const BaseStrategy = require('./baseStrategy');
const logger = require('../utils/logger');

/**
 * Estratégia de Grid Trading
 * 
 * Cria uma grade de ordens de compra e venda em intervalos regulares.
 * Funciona bem em mercados laterais (sideways).
 */
class GridTradingStrategy extends BaseStrategy {
  // Metadados da estratégia para exibição no frontend
  static displayName = 'Grid Trading';
  static description = 'Cria uma grade de ordens de compra e venda em intervalos regulares. Ideal para mercados laterais.';
  
  // Parâmetros configuráveis para o frontend
  static parameters = [
    {
      name: 'upperLimit',
      label: 'Limite Superior ($)',
      type: 'number',
      default: 40000,
      min: 0,
      description: 'Preço máximo da grade'
    },
    {
      name: 'lowerLimit',
      label: 'Limite Inferior ($)',
      type: 'number',
      default: 35000,
      min: 0,
      description: 'Preço mínimo da grade'
    },
    {
      name: 'levels',
      label: 'Número de Níveis',
      type: 'number',
      default: 5,
      min: 2,
      max: 50,
      description: 'Número de níveis na grade'
    },
    {
      name: 'totalInvestment',
      label: 'Investimento Total ($)',
      type: 'number',
      default: 1000,
      min: 10,
      description: 'Valor total a ser investido na estratégia'
    },
    {
      name: 'profitPerGrid',
      label: 'Lucro por Grade (%)',
      type: 'number',
      default: 1,
      min: 0.1,
      max: 10,
      description: 'Alvo de lucro percentual para cada nível da grade'
    },
    {
      name: 'useVolatilityAdjustment',
      label: 'Ajustar por Volatilidade',
      type: 'boolean',
      default: true,
      description: 'Ajustar espaçamento da grade com base na volatilidade do mercado'
    },
    {
      name: 'rebalanceGrid',
      label: 'Rebalancear Grade',
      type: 'boolean',
      default: false,
      description: 'Recriar a grade periodicamente com base nas condições atuais de mercado'
    },
    {
      name: 'rebalanceInterval',
      label: 'Intervalo de Rebalanceamento (horas)',
      type: 'number',
      default: 24,
      min: 1,
      description: 'Intervalo em horas para rebalancear a grade (se ativado)'
    }
  ];
  
  /**
   * Construtor da estratégia de Grid Trading
   * @param {Object} config - Configuração da estratégia
   */
  constructor(config) {
    super(config);
    
    // Parâmetros específicos do Grid Trading
    this.upperLimit = config.upperLimit || 40000;
    this.lowerLimit = config.lowerLimit || 35000;
    this.levels = config.levels || 5;
    this.totalInvestment = config.totalInvestment || 1000;
    this.profitPerGrid = config.profitPerGrid || 1;
    this.useVolatilityAdjustment = config.useVolatilityAdjustment !== undefined ? config.useVolatilityAdjustment : true;
    this.rebalanceGrid = config.rebalanceGrid || false;
    this.rebalanceInterval = config.rebalanceInterval || 24;
    
    // Estado da grade
    this.grid = [];
    this.lastRebalance = new Date();
    this.activeOrders = {};
    this.gridPositions = {};
    
    logger.info(`Estratégia Grid Trading inicializada para ${this.pair} (${this.lowerLimit}-${this.upperLimit}, ${this.levels} níveis)`);
  }
  
  /**
   * Inicializa a estratégia
   */
  async init() {
    await super.init();
    
    // Calcular pontos da grade inicial
    this.calculateGridLevels();
    
    return true;
  }
  
  /**
   * Calcula os níveis da grade
   */
  calculateGridLevels() {
    const interval = (this.upperLimit - this.lowerLimit) / (this.levels - 1);
    const investmentPerLevel = this.totalInvestment / this.levels;
    
    this.grid = [];
    
    // Ajustar espaçamento com base na volatilidade se necessário
    let adjustedInterval = interval;
    if (this.useVolatilityAdjustment && this.indicatorValues['1h'] && this.indicatorValues['1h'].atr) {
      const atr = this.indicatorValues['1h'].atr;
      const latestAtr = atr[atr.length - 1];
      const percentAtr = latestAtr / this.lowerLimit * 100;
      
      // Ajustar intervalo com base na ATR
      // Se ATR for alta, aumentar o espaçamento
      if (percentAtr > 5) {
        adjustedInterval = interval * 1.5;
      } else if (percentAtr < 1) {
        adjustedInterval = interval * 0.7;
      }
      
      logger.info(`Ajustando espaçamento da grade de ${interval.toFixed(2)} para ${adjustedInterval.toFixed(2)} baseado em ATR (${percentAtr.toFixed(2)}%)`);
    }
    
    // Criar níveis da grade
    for (let i = 0; i < this.levels; i++) {
      const price = this.lowerLimit + (i * adjustedInterval);
      const buyPrice = price;
      const sellPrice = price * (1 + this.profitPerGrid / 100);
      
      this.grid.push({
        level: i,
        buyPrice,
        sellPrice,
        investment: investmentPerLevel,
        quantity: investmentPerLevel / buyPrice,
        active: false,
        filledBuy: false,
        filledSell: false,
        buyOrderId: null,
        sellOrderId: null
      });
    }
    
    logger.info(`Grade calculada com ${this.levels} níveis de ${this.lowerLimit} a ${this.upperLimit}`);
  }
  
  /**
   * Rebalanceia a grade com base nas condições atuais de mercado
   * @param {number} currentPrice - Preço atual do ativo
   */
  rebalanceGridLevels(currentPrice) {
    // Calcular novos limites centrados no preço atual
    const range = this.upperLimit - this.lowerLimit;
    const halfRange = range / 2;
    
    const newLowerLimit = Math.max(currentPrice - halfRange, 0);
    const newUpperLimit = currentPrice + halfRange;
    
    logger.info(`Rebalanceando grade para ${this.pair}. Novos limites: ${newLowerLimit.toFixed(2)}-${newUpperLimit.toFixed(2)}`);
    
    this.lowerLimit = newLowerLimit;
    this.upperLimit = newUpperLimit;
    
    // Recalcular grade
    this.calculateGridLevels();
    this.lastRebalance = new Date();
  }
  
  /**
   * Executa a estratégia nos dados atuais do mercado
   * @param {Object} data - Dados do mercado
   * @returns {Array} Sinais de trading gerados
   */
  async execute(data) {
    const signals = [];
    
    try {
      // Obter preço atual
      const currentPrice = data.ticker.close;
      
      logger.info(`Executando Grid Trading para ${this.pair} @ ${currentPrice}`);
      
      // Verificar se é necessário rebalancear a grade
      if (this.rebalanceGrid) {
        const hoursElapsed = (new Date() - this.lastRebalance) / (1000 * 60 * 60);
        
        if (hoursElapsed >= this.rebalanceInterval) {
          this.rebalanceGridLevels(currentPrice);
        }
      }
      
      // Verificar cada nível da grade
      for (let i = 0; i < this.grid.length; i++) {
        const level = this.grid[i];
        
        // Verificar se o preço está abaixo do preço de compra e não temos posição
        if (currentPrice <= level.buyPrice && !level.filledBuy) {
          signals.push({
            type: 'BUY',
            pair: this.pair,
            params: {
              price: level.buyPrice,
              quantity: level.quantity
            },
            metadata: {
              level: i,
              gridAction: 'BUY',
              buyPrice: level.buyPrice,
              sellTarget: level.sellPrice
            }
          });
          
          logger.info(`Sinal de COMPRA gerado no nível ${i} @ ${level.buyPrice}`);
          
          // Marcar nível como comprado
          this.grid[i].filledBuy = true;
        }
        // Verificar se o preço está acima do preço de venda e temos posição
        else if (currentPrice >= level.sellPrice && level.filledBuy && !level.filledSell) {
          signals.push({
            type: 'SELL',
            pair: this.pair,
            params: {
              price: level.sellPrice,
              quantity: level.quantity
            },
            metadata: {
              level: i,
              gridAction: 'SELL',
              buyPrice: level.buyPrice,
              sellPrice: level.sellPrice,
              profit: ((level.sellPrice - level.buyPrice) * level.quantity)
            }
          });
          
          logger.info(`Sinal de VENDA gerado no nível ${i} @ ${level.sellPrice}`);
          
          // Marcar nível como vendido
          this.grid[i].filledSell = true;
          
          // Resetar o nível para uma nova compra
          setTimeout(() => {
            this.grid[i].filledBuy = false;
            this.grid[i].filledSell = false;
          }, 1000); // Pequeno delay para evitar múltiplos sinais
        }
      }
      
      return signals;
    } catch (error) {
      logger.error(`Erro na execução de Grid Trading: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Processa o resultado de uma ordem
   * @param {Object} order - Dados da ordem executada
   */
  processOrderResult(order) {
    // Atualizar estado da grade com base na ordem executada
    const level = this.grid.find(g => g.buyOrderId === order.orderId || g.sellOrderId === order.orderId);
    
    if (level) {
      if (order.side === 'BUY') {
        level.filledBuy = true;
        level.active = true;
        
        // Criar ordem de venda correspondente
        const sellParams = {
          symbol: this.pair,
          side: 'SELL',
          type: 'LIMIT',
          price: level.sellPrice,
          quantity: order.executedQty,
          timeInForce: 'GTC'
        };
        
        // Em um cenário real, aqui enviaríamos a ordem de venda para a exchange
        // e atualizaríamos level.sellOrderId
      } else if (order.side === 'SELL') {
        level.filledSell = true;
        level.active = false;
        
        // Calcular lucro
        const profit = (level.sellPrice - level.buyPrice) * level.quantity;
        
        logger.info(`Grid Trading: Lucro realizado no nível ${level.level}: ${profit.toFixed(2)} USD`);
        
        // Resetar o nível para uma nova compra
        setTimeout(() => {
          level.filledBuy = false;
          level.filledSell = false;
          level.buyOrderId = null;
          level.sellOrderId = null;
        }, 1000);
      }
    }
  }
  
  /**
   * Valida parâmetros de configuração
   * @param {Object} params - Parâmetros a serem validados
   * @returns {Object} Resultado da validação
   */
  validateParameters(params) {
    const errors = [];
    
    if (params.upperLimit <= params.lowerLimit) {
      errors.push('O limite superior deve ser maior que o limite inferior');
    }
    
    if (params.levels < 2) {
      errors.push('A grade deve ter pelo menos 2 níveis');
    }
    
    if (params.totalInvestment <= 0) {
      errors.push('O investimento total deve ser maior que zero');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = GridTradingStrategy;