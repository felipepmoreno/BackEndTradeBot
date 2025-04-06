const WebSocket = require('ws');
const logger = require('./logger');

/**
 * Inicializa o servidor WebSocket
 * @param {http.Server} server - Servidor HTTP
 * @returns {WebSocket.Server} Servidor WebSocket
 */
function initWsServer(server) {
  // Criar servidor WebSocket
  const wss = new WebSocket.Server({ server });
  
  // Counter para IDs de clientes
  let nextClientId = 1;
  
  // Map para armazenar assinaturas de clientes
  const subscriptions = new Map();
  
  wss.on('connection', (ws) => {
    // Atribuir ID único ao cliente
    const clientId = nextClientId++;
    ws.clientId = clientId;
    
    logger.info(`Cliente WebSocket #${clientId} conectado`);
    
    // Inicializar lista de assinaturas para este cliente
    subscriptions.set(clientId, new Set());
    
    // Enviar mensagem de boas-vindas
    ws.send(JSON.stringify({
      type: 'connection',
      data: {
        message: 'Conexão estabelecida com o servidor de trading',
        clientId
      }
    }));
    
    // Processar mensagens recebidas
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        
        switch (msg.action) {
          case 'subscribe':
            handleSubscribe(ws, msg.channel, msg.params);
            break;
            
          case 'unsubscribe':
            handleUnsubscribe(ws, msg.channel);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
            
          default:
            logger.warn(`Ação desconhecida recebida de cliente #${clientId}:`, msg);
            ws.send(JSON.stringify({
              type: 'error',
              data: {
                message: `Ação desconhecida: ${msg.action}`
              }
            }));
        }
      } catch (error) {
        logger.error(`Erro ao processar mensagem de cliente #${clientId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          data: {
            message: 'Erro ao processar mensagem'
          }
        }));
      }
    });
    
    // Lidar com desconexão
    ws.on('close', () => {
      logger.info(`Cliente WebSocket #${clientId} desconectado`);
      
      // Limpar assinaturas
      subscriptions.delete(clientId);
    });
    
    // Lidar com erros
    ws.on('error', (error) => {
      logger.error(`Erro em cliente WebSocket #${clientId}:`, error);
    });
  });
  
  /**
   * Manipula assinatura de canal
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {string} channel - Canal a assinar
   * @param {Object} params - Parâmetros adicionais
   */
  function handleSubscribe(ws, channel, params = {}) {
    const clientId = ws.clientId;
    const clientSubs = subscriptions.get(clientId);
    
    // Adicionar à lista de assinaturas do cliente
    clientSubs.add(channel);
    
    logger.info(`Cliente #${clientId} assinou o canal: ${channel}`);
    
    // Confirmar assinatura
    ws.send(JSON.stringify({
      type: 'subscribed',
      data: {
        channel,
        params
      }
    }));
  }
  
  /**
   * Manipula cancelamento de assinatura
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {string} channel - Canal a cancelar assinatura
   */
  function handleUnsubscribe(ws, channel) {
    const clientId = ws.clientId;
    const clientSubs = subscriptions.get(clientId);
    
    // Remover da lista de assinaturas
    clientSubs.delete(channel);
    
    logger.info(`Cliente #${clientId} cancelou assinatura do canal: ${channel}`);
    
    // Confirmar cancelamento
    ws.send(JSON.stringify({
      type: 'unsubscribed',
      data: {
        channel
      }
    }));
  }
  
  /**
   * Transmite uma mensagem para os clientes inscritos em um canal
   * @param {string} channel - Canal alvo
   * @param {Object} data - Dados a serem enviados
   */
  function broadcast(channel, data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const clientId = client.clientId;
        const clientSubs = subscriptions.get(clientId);
        
        // Verificar se cliente está inscrito neste canal
        if (clientSubs && clientSubs.has(channel)) {
          client.send(JSON.stringify({
            type: 'update',
            channel,
            data
          }));
        }
      }
    });
  }
  
  /**
   * Transmite uma mensagem para todos os clientes conectados
   * @param {Object} data - Dados a serem enviados
   */
  function broadcastAll(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
  
  // Adicionar métodos de transmissão ao objeto wss
  wss.broadcast = broadcast;
  wss.broadcastAll = broadcastAll;
  
  // Manter conexões ativas (ping/pong)
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    });
  }, 30000);
  
  logger.info('Servidor WebSocket inicializado');
  
  return wss;
}

module.exports = { initWsServer };
