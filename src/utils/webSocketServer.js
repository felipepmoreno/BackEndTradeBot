const WebSocket = require('ws');

const initWsServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received:', data);
        
        // Handle different message types
        switch(data.type) {
          case 'subscribe':
            // Handle subscription requests
            break;
          case 'unsubscribe':
            // Handle unsubscription requests
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
};

module.exports = { initWsServer };
