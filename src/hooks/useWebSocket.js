import { useState, useEffect, useRef } from 'react';
import { createTickerWebSocket, createKlineWebSocket } from '../services/binanceService';

export const useTickerWebSocket = (symbols) => {
  const [tickerData, setTickerData] = useState({});
  const wsRef = useRef(null);
  
  useEffect(() => {
    const handleMessage = (data) => {
      if (data.stream) {
        const streamParts = data.stream.split('@');
        const symbol = streamParts[0].toUpperCase();
        setTickerData(prev => ({
          ...prev,
          [symbol]: data.data
        }));
      } else {
        const symbol = data.s;
        setTickerData(prev => ({
          ...prev,
          [symbol]: data
        }));
      }
    };
    
    wsRef.current = createTickerWebSocket(symbols, handleMessage);
    
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [symbols]);
  
  return tickerData;
};

export const useKlineWebSocket = (symbol, interval) => {
  const [klineData, setKlineData] = useState(null);
  const wsRef = useRef(null);
  
  useEffect(() => {
    const handleMessage = (data) => {
      if (data.k) {
        const candle = {
          time: data.k.t,
          open: parseFloat(data.k.o),
          high: parseFloat(data.k.h),
          low: parseFloat(data.k.l),
          close: parseFloat(data.k.c),
          volume: parseFloat(data.k.v),
          isClosed: data.k.x,
        };
        setKlineData(candle);
      }
    };
    
    wsRef.current = createKlineWebSocket(symbol, interval, handleMessage);
    
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [symbol, interval]);
  
  return klineData;
};
