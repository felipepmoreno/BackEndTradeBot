// src/hooks/useWebSocket.js

import { useState, useEffect, useRef } from 'react';
import binanceService from '../services/binanceService';

/**
 * Hook para receber atualizações de preço em tempo real via WebSocket
 * @param {string|Array} symbols - Símbolo ou array de símbolos a observar
 * @returns {Object} Dados do ticker em tempo real
 */
export const useTickerWebSocket = (symbols) => {
  const [tickerData, setTickerData] = useState({});
  const wsRef = useRef(null);
  const symbolsRef = useRef(symbols);
  
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);
  
  useEffect(() => {
    // Não continuar se não houver símbolos para observar
    if (!symbols || (Array.isArray(symbols) && symbols.length === 0)) {
      return;
    }
    
    // Normalizar símbolos
    const normalizedSymbols = Array.isArray(symbols) 
      ? symbols.map(s => s.toLowerCase()) 
      : [symbols.toLowerCase()];
    
    // Função para processar mensagens recebidas
    const handleMessage = (data) => {
      if (data.stream) {
        // Formato para múltiplos símbolos
        const streamParts = data.stream.split('@');
        const symbol = streamParts[0].toUpperCase();
        setTickerData(prev => ({
          ...prev,
          [symbol]: data.data
        }));
      } else {
        // Formato para um único símbolo
        const symbol = data.s;
        setTickerData(prev => ({
          ...prev,
          [symbol]: data
        }));
      }
    };
    
    // Inicializar WebSocket
    const initWebSocket = () => {
      // Fechar WebSocket existente
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      // Criar nova conexão WebSocket
      wsRef.current = binanceService.createTickerWebSocket(normalizedSymbols, handleMessage);
      
      // Adicionar handler para reconexão em caso de erro
      wsRef.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setTimeout(initWebSocket, 5000); // Tentar reconectar após 5 segundos
      };
      
      // Adicionar handler para reconexão quando o WebSocket fechar
      wsRef.current.onclose = () => {
        // Verificar se o componente ainda está montado
        setTimeout(() => {
          if (symbolsRef.current && 
              (Array.isArray(symbolsRef.current) ? symbolsRef.current.length > 0 : true)) {
            initWebSocket();
          }
        }, 5000);
      };
    };
    
    // Iniciar WebSocket
    initWebSocket();
    
    // Função de cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbols]);
  
  return tickerData;
};

/**
 * Hook para receber atualizações de candle em tempo real via WebSocket
 * @param {string} symbol - Símbolo a observar
 * @param {string} interval - Intervalo do candle
 * @returns {Object} Dados do candle em tempo real
 */
export const useKlineWebSocket = (symbol, interval) => {
  const [klineData, setKlineData] = useState(null);
  const wsRef = useRef(null);
  const paramsRef = useRef({ symbol, interval });
  
  // Atualizar refs quando os parâmetros mudarem
  useEffect(() => {
    paramsRef.current = { symbol, interval };
  }, [symbol, interval]);
  
  useEffect(() => {
    // Não continuar se não houver símbolo ou intervalo
    if (!symbol || !interval) {
      return;
    }
    
    // Normalizar símbolo
    const normalizedSymbol = symbol.toLowerCase();
    
    // Função para processar mensagens recebidas
    const handleMessage = (data) => {
      setKlineData(data);
    };
    
    // Inicializar WebSocket
    const initWebSocket = () => {
      // Fechar WebSocket existente
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      // Criar nova conexão WebSocket
      wsRef.current = binanceService.createKlineWebSocket(normalizedSymbol, interval, handleMessage);
      
      // Adicionar handler para reconexão em caso de erro
      wsRef.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setTimeout(initWebSocket, 5000); // Tentar reconectar após 5 segundos
      };
      
      // Adicionar handler para reconexão quando o WebSocket fechar
      wsRef.current.onclose = () => {
        // Verificar se o componente ainda está montado e se os parâmetros não mudaram
        setTimeout(() => {
          if (paramsRef.current.symbol && paramsRef.current.interval) {
            initWebSocket();
          }
        }, 5000);
      };
    };
    
    // Iniciar WebSocket
    initWebSocket();
    
    // Função de cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, interval]);
  
  return klineData;
};

/**
 * Hook para receber atualizações do livro de ordens em tempo real via WebSocket
 * @param {string} symbol - Símbolo a observar
 * @param {number} levels - Número de níveis (5, 10 ou 20)
 * @returns {Object} Dados do livro de ordens em tempo real
 */
export const useDepthWebSocket = (symbol, levels = 20) => {
  const [depthData, setDepthData] = useState(null);
  const wsRef = useRef(null);
  const paramsRef = useRef({ symbol, levels });
  
  // Atualizar refs quando os parâmetros mudarem
  useEffect(() => {
    paramsRef.current = { symbol, levels };
  }, [symbol, levels]);
  
  useEffect(() => {
    // Não continuar se não houver símbolo
    if (!symbol) {
      return;
    }
    
    // Normalizar símbolo
    const normalizedSymbol = symbol.toLowerCase();
    
    // Função para processar mensagens recebidas
    const handleMessage = (data) => {
      setDepthData(data);
    };
    
    // Inicializar WebSocket
    const initWebSocket = () => {
      // Fechar WebSocket existente
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      // Criar nova conexão WebSocket
      wsRef.current = binanceService.createDepthWebSocket(normalizedSymbol, handleMessage, levels);
      
      // Adicionar handler para reconexão em caso de erro
      wsRef.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setTimeout(initWebSocket, 5000); // Tentar reconectar após 5 segundos
      };
      
      // Adicionar handler para reconexão quando o WebSocket fechar
      wsRef.current.onclose = () => {
        // Verificar se o componente ainda está montado e se os parâmetros não mudaram
        setTimeout(() => {
          if (paramsRef.current.symbol) {
            initWebSocket();
          }
        }, 5000);
      };
    };
    
    // Iniciar WebSocket
    initWebSocket();
    
    // Função de cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, levels]);
  
  return depthData;
};