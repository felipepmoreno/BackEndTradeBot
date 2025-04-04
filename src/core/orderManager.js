// src/core/orderManager.js

const binanceService = require('../services/binanceService');
const logger = require('../utils/logger');
const riskManager = require('./riskManager');

/**
 * Gerenciador de Ordens
 * Responsável por criar, modificar e monitorar ordens na exchange
 */
class OrderManager {
  constructor() {
    this.orders = {
      pending: {}, // Ordens pendentes
      open: {},    // Ordens abertas
      closed: [],  // Ordens fechadas (histórico)
    };
    
    this.orderBookSubscriptions = {}; // Assinaturas ao livro de ordens
    this.statusUpdates = {}; // Intervalo de verificação de status
    
    // Configurações
    this.config = {
      slippageTolerance: 0.1, // Tolerância de slippage em percentual
      retryAttempts: 3,       // Tentativas de envio de ordem
      statusCheckInterval: 5000, // Intervalo de verificação de status em ms
      useWebsocketUpdates: true, // Usar atualizações via WebSocket quando disponível
    };
    
    logger.info('Gerenciador de Ordens inicializado');
  }
  
  /**
   * Inicializa o gerenciador de ordens
   */
  async init() {
    try {
      // Verificar conexão com a Binance
      const connectionTest = await binanceService.testConnection();
      
      if (!connectionTest.success) {
        logger.error('Falha na conexão com a Binance:', connectionTest.error);
        return false;
      }
      
      // Carregar ordens abertas
      await this.loadOpenOrders();
      
      // Configurar verificação periódica de status
      this.startStatusChecks();
      
      logger.info('Gerenciador de Ordens iniciado com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao inicializar Gerenciador de Ordens:', error);
      return false;
    }
  }
  
  /**
   * Carrega ordens abertas da exchange
   */
  async loadOpenOrders() {
    try {
      logger.info('Carregando ordens abertas da Binance');
      
      const response = await binanceService.getOpenOrders();
      
      if (!response.success) {
        logger.error('Erro ao carregar ordens abertas:', response.error);
        return;
      }
      
      const openOrders = response.data;
      
      for (const order of openOrders) {
        this.orders.open[order.orderId] = {
          ...order,
          loadedAtStartup: true
        };
      }
      
      logger.info(`${openOrders.length} ordens abertas carregadas`);
    } catch (error) {
      logger.error('Erro ao carregar ordens abertas:', error);
    }
  }
  
  /**
   * Inicia verificações periódicas de status
   */
  startStatusChecks() {
    // Verificar ordens abertas a cada X segundos
    setInterval(async () => {
      try {
        // Apenas se houver ordens abertas
        if (Object.keys(this.orders.open).length > 0) {
          await this.checkOpenOrdersStatus();
        }
      } catch (error) {
        logger.error('Erro na verificação periódica de ordens:', error);
      }
    }, this.config.statusCheckInterval);
  }
  
  /**
   * Verifica status das ordens abertas
   */
  async checkOpenOrdersStatus() {
    for (const orderId in this.orders.open) {
      try {
        const order = this.orders.open[orderId];
        const response = await binanceService.getOrder(order.symbol, orderId);
        
        if (!response.success) {
          logger.warn(`Erro ao verificar status da ordem ${orderId}:`, response.error);
          continue;
        }
        
        const updatedOrder = response.data;
        
        // Atualizar status interno
        this.orders.open[orderId] = updatedOrder;
        
        // Se a ordem foi executada ou cancelada, mover para histórico
        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(updatedOrder.status)) {
          this.moveOrderToHistory(orderId, updatedOrder);
        }
      } catch (error) {
        logger.error(`Erro ao verificar status da ordem ${orderId}:`, error);
      }
    }
  }
  
  /**
   * Move uma ordem para o histórico
   * @param {string} orderId - ID da ordem
   * @param {Object} orderData - Dados da ordem
   */
  moveOrderToHistory(orderId, orderData) {
    // Adicionar ao histórico
    this.orders.closed.push({
      ...orderData,
      closedTime: new Date()
    });
    
    // Remover das ordens abertas
    delete this.orders.open[orderId];
    
    // Emitir evento se necessário (em uma implementação completa)
    logger.info(`Ordem ${orderId} movida para histórico com status ${orderData.status}`);
    
    // Limitar tamanho do histórico
    if (this.orders.closed.length > 1000) {
      this.orders.closed = this.orders.closed.slice(-1000);
    }
  }
  
  /**
   * Envia uma ordem para a exchange
   * @param {Object} orderParams - Parâmetros da ordem
   * @returns {Object} Resultado da operação
   */
  async placeOrder(orderParams) {
    try {
      if (process.env.SIMULATION_MODE === 'true') {
        logger.info(`[SIMULAÇÃO] Ordem ${orderParams.side} para ${orderParams.symbol} seria executada`);
        return { success: true, orderId: `sim_${Date.now()}`, data: orderParams };
      }

      // Validar parâmetros
      if (!orderParams.symbol || !orderParams.side || !orderParams.type) {
        throw new Error('Parâmetros incompletos: são necessários symbol, side e type');
      }
      
      // Adicionar timeInForce para ordens limit
      if (orderParams.type === 'LIMIT' && !orderParams.timeInForce) {
        orderParams.timeInForce = 'GTC'; // Good Till Canceled
      }
      
      // Log da ordem
      logger.info(`Enviando ordem: ${orderParams.side} ${orderParams.symbol} @ ${orderParams.price || 'MARKET'}`);
      
      // Adicionar à lista de ordens pendentes
      const pendingId = `pending_${Date.now()}`;
      this.orders.pending[pendingId] = {
        ...orderParams,
        status: 'SENDING',
        createdTime: new Date()
      };
      
      // Enviar ordem para a Binance
      const response = await binanceService.createOrder(orderParams);
      
      // Remover da lista de pendentes
      delete this.orders.pending[pendingId];
      
      if (!response.success) {
        logger.error('Erro ao enviar ordem:', response.error);
        
        // Registrar erro de API
        riskManager.registerApiError('ORDER_PLACEMENT');
        
        return {
          success: false,
          error: response.error
        };
      }
      
      // Resetar contador de erros
      riskManager.resetApiErrorCount();
      
      const orderData = response.data;
      
      // Adicionar à lista de ordens abertas
      this.orders.open[orderData.orderId] = {
        ...orderData,
        originalParams: orderParams,
        createdTime: new Date()
      };
      
      logger.info(`Ordem ${orderData.orderId} enviada com sucesso: ${orderParams.side} ${orderParams.symbol}`);
      
      // Para ordens com MARKET, verificar execução imediatamente
      if (orderParams.type === 'MARKET') {
        setTimeout(() => {
          this.checkOrderStatus(orderData.symbol, orderData.orderId);
        }, 1000);
      }
      
      return {
        success: true,
        orderId: orderData.orderId,
        data: orderData
      };
    } catch (error) {
      logger.error('Erro ao enviar ordem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verifica o status de uma ordem específica
   * @param {string} symbol - Símbolo da moeda
   * @param {string} orderId - ID da ordem
   */
  async checkOrderStatus(symbol, orderId) {
    try {
      const response = await binanceService.getOrder(symbol, orderId);
      
      if (!response.success) {
        logger.error(`Erro ao verificar status da ordem ${orderId}:`, response.error);
        return null;
      }
      
      const orderData = response.data;
      
      // Atualizar status interno
      if (this.orders.open[orderId]) {
        this.orders.open[orderId] = {
          ...this.orders.open[orderId],
          ...orderData
        };
        
        // Se a ordem foi executada ou cancelada, mover para histórico
        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(orderData.status)) {
          this.moveOrderToHistory(orderId, orderData);
        }
      }
      
      return orderData;
    } catch (error) {
      logger.error(`Erro ao verificar status da ordem ${orderId}:`, error);
      return null;
    }
  }
  
  /**
   * Cancela uma ordem específica
   * @param {string} symbol - Símbolo da moeda
   * @param {string} orderId - ID da ordem
   * @returns {Object} Resultado da operação
   */
  async cancelOrder(symbol, orderId) {
    try {
      logger.info(`Cancelando ordem ${orderId} para ${symbol}`);
      
      const response = await binanceService.cancelOrder(symbol, orderId);
      
      if (!response.success) {
        logger.error(`Erro ao cancelar ordem ${orderId}:`, response.error);
        return {
          success: false,
          error: response.error
        };
      }
      
      const orderData = response.data;
      
      // Atualizar status interno
      if (this.orders.open[orderId]) {
        // Mover para histórico
        this.moveOrderToHistory(orderId, {
          ...this.orders.open[orderId],
          ...orderData,
          status: 'CANCELED'
        });
      }
      
      logger.info(`Ordem ${orderId} cancelada com sucesso`);
      
      return {
        success: true,
        data: orderData
      };
    } catch (error) {
      logger.error(`Erro ao cancelar ordem ${orderId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Cancela todas as ordens abertas para um símbolo
   * @param {string} symbol - Símbolo da moeda
   * @returns {Object} Resultado da operação
   */
  async cancelAllOrders(symbol) {
    try {
      logger.info(`Cancelando todas as ordens para ${symbol}`);
      
      const response = await binanceService.cancelAllOrders(symbol);
      
      if (!response.success) {
        logger.error(`Erro ao cancelar ordens para ${symbol}:`, response.error);
        return {
          success: false,
          error: response.error
        };
      }
      
      // Atualizar status interno
      for (const orderId in this.orders.open) {
        const order = this.orders.open[orderId];
        
        if (order.symbol === symbol) {
          // Mover para histórico
          this.moveOrderToHistory(orderId, {
            ...order,
            status: 'CANCELED'
          });
        }
      }
      
      logger.info(`Todas as ordens para ${symbol} canceladas com sucesso`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao cancelar ordens para ${symbol}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Modifica uma ordem existente (cancelando a antiga e criando uma nova)
   * @param {string} symbol - Símbolo da moeda
   * @param {string} orderId - ID da ordem
   * @param {Object} newParams - Novos parâmetros
   * @returns {Object} Resultado da operação
   */
  async modifyOrder(symbol, orderId, newParams) {
    try {
      logger.info(`Modificando ordem ${orderId} para ${symbol}`);
      
      // Verificar se a ordem existe
      if (!this.orders.open[orderId]) {
        throw new Error(`Ordem ${orderId} não encontrada`);
      }
      
      const originalOrder = this.orders.open[orderId];
      
      // Cancelar ordem existente
      const cancelResult = await this.cancelOrder(symbol, orderId);
      
      if (!cancelResult.success) {
        throw new Error(`Falha ao cancelar ordem original: ${cancelResult.error}`);
      }
      
      // Criar nova ordem com parâmetros atualizados
      const newOrderParams = {
        ...originalOrder.originalParams,
        ...newParams
      };
      
      const newOrderResult = await this.placeOrder(newOrderParams);
      
      if (!newOrderResult.success) {
        throw new Error(`Falha ao criar nova ordem: ${newOrderResult.error}`);
      }
      
      logger.info(`Ordem ${orderId} modificada com sucesso. Nova ordem: ${newOrderResult.orderId}`);
      
      return {
        success: true,
        originalOrderId: orderId,
        newOrderId: newOrderResult.orderId,
        data: newOrderResult.data
      };
    } catch (error) {
      logger.error(`Erro ao modificar ordem ${orderId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Cria uma ordem OCO (One Cancels Other) com take profit e stop loss
   * @param {Object} orderParams - Parâmetros da ordem
   * @returns {Object} Resultado da operação
   */
  async placeOcoOrder(orderParams) {
    try {
      // Validar parâmetros
      if (!orderParams.symbol || !orderParams.quantity || !orderParams.price || 
          !orderParams.stopPrice || !orderParams.stopLimitPrice) {
        throw new Error('Parâmetros incompletos para ordem OCO');
      }
      
      logger.info(`Enviando ordem OCO para ${orderParams.symbol}`);
      
      const response = await binanceService.createOcoOrder(orderParams);
      
      if (!response.success) {
        logger.error('Erro ao enviar ordem OCO:', response.error);
        return {
          success: false,
          error: response.error
        };
      }
      
      const orderData = response.data;
      
      // OCO retorna múltiplas ordens (limit e stop)
      if (orderData.orderListId) {
        // Adicionar à lista de ordens abertas
        if (orderData.orders) {
          for (const order of orderData.orders) {
            this.orders.open[order.orderId] = {
              ...order,
              originalParams: orderParams,
              createdTime: new Date(),
              orderListId: orderData.orderListId
            };
          }
        }
      }
      
      logger.info(`Ordem OCO ${orderData.orderListId} enviada com sucesso para ${orderParams.symbol}`);
      
      return {
        success: true,
        orderListId: orderData.orderListId,
        data: orderData
      };
    } catch (error) {
      logger.error('Erro ao enviar ordem OCO:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Obtém todas as ordens abertas
   * @param {string} symbol - Símbolo opcional para filtrar
   * @returns {Array} Lista de ordens abertas
   */
  getOpenOrders(symbol = null) {
    const openOrders = Object.values(this.orders.open);
    
    if (symbol) {
      return openOrders.filter(order => order.symbol === symbol);
    }
    
    return openOrders;
  }
  
  /**
   * Obtém histórico de ordens
   * @param {Object} filters - Filtros para o histórico
   * @returns {Array} Histórico de ordens
   */
  getOrderHistory(filters = {}) {
    let history = [...this.orders.closed];
    
    // Aplicar filtros
    if (filters.symbol) {
      history = history.filter(order => order.symbol === filters.symbol);
    }
    
    if (filters.side) {
      history = history.filter(order => order.side === filters.side);
    }
    
    if (filters.status) {
      history = history.filter(order => order.status === filters.status);
    }
    
    if (filters.startTime) {
      history = history.filter(order => new Date(order.createdTime) >= new Date(filters.startTime));
    }
    
    if (filters.endTime) {
      history = history.filter(order => new Date(order.createdTime) <= new Date(filters.endTime));
    }
    
    // Ordenar por tempo (mais recente primeiro)
    history.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    
    // Limitar quantidade se necessário
    if (filters.limit && filters.limit > 0) {
      history = history.slice(0, filters.limit);
    }
    
    return history;
  }
  
  /**
   * Inscreve-se para atualizações do livro de ordens para um símbolo
   * @param {string} symbol - Par de trading
   * @param {Function} callback - Função de callback
   */
  subscribeOrderBook(symbol, callback) {
    if (this.orderBookSubscriptions[symbol]) {
      // Já existe uma assinatura para este símbolo
      this.orderBookSubscriptions[symbol].callbacks.push(callback);
      return;
    }
    
    // Criar nova assinatura
    const ws = binanceService.createDepthWebSocket(symbol, (data) => {
      // Notificar todos os callbacks
      this.orderBookSubscriptions[symbol].callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          logger.error(`Erro em callback de orderbook para ${symbol}:`, err);
        }
      });
    });
    
    this.orderBookSubscriptions[symbol] = {
      ws,
      callbacks: [callback]
    };
    
    logger.info(`Inscrito em atualizações do livro de ordens para ${symbol}`);
  }
  
  /**
   * Cancela assinatura do livro de ordens
   * @param {string} symbol - Par de trading
   * @param {Function} callback - Função de callback (opcional, se não especificada, cancela todas)
   */
  unsubscribeOrderBook(symbol, callback = null) {
    if (!this.orderBookSubscriptions[symbol]) {
      return;
    }
    
    if (callback) {
      // Remover apenas este callback
      const index = this.orderBookSubscriptions[symbol].callbacks.indexOf(callback);
      if (index >= 0) {
        this.orderBookSubscriptions[symbol].callbacks.splice(index, 1);
      }
      
      // Se não houver mais callbacks, cancelar totalmente
      if (this.orderBookSubscriptions[symbol].callbacks.length === 0) {
        this.closeOrderBookSubscription(symbol);
      }
    } else {
      // Cancelar completamente
      this.closeOrderBookSubscription(symbol);
    }
  }
  
  /**
   * Fecha uma assinatura do livro de ordens
   * @param {string} symbol - Par de trading
   */
  closeOrderBookSubscription(symbol) {
    if (this.orderBookSubscriptions[symbol]) {
      const { ws } = this.orderBookSubscriptions[symbol];
      
      if (ws && ws.readyState === 1) { // OPEN
        ws.close();
      }
      
      delete this.orderBookSubscriptions[symbol];
      logger.info(`Assinatura do livro de ordens para ${symbol} cancelada`);
    }
  }
}

// Singleton
const orderManager = new OrderManager();

module.exports = orderManager;