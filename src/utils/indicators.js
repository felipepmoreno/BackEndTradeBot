// src/utils/indicators.js

/**
 * Biblioteca de indicadores técnicos para análise de mercado
 */

/**
 * Calcula a Média Móvel Simples (SMA)
 * @param {Array} data - Array de preços
 * @param {number} period - Período da média móvel
 * @returns {Array} - Array com os valores da SMA
 */
function sma(data, period) {
    const result = [];
    
    if (data.length < period) {
      return result;
    }
    
    let sum = 0;
    
    // Calcular a primeira SMA
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    
    result.push(sum / period);
    
    // Calcular o restante das SMAs
    for (let i = period; i < data.length; i++) {
      sum = sum - data[i - period] + data[i];
      result.push(sum / period);
    }
    
    return result;
  }
  
  /**
   * Calcula a Média Móvel Exponencial (EMA)
   * @param {Array} data - Array de preços
   * @param {number} period - Período da média móvel
   * @returns {Array} - Array com os valores da EMA
   */
  function ema(data, period) {
    const result = [];
    
    if (data.length < period) {
      return result;
    }
    
    // Calcular o multiplicador
    const multiplier = 2 / (period + 1);
    
    // Calcular a primeira EMA (usando SMA como base)
    let emaValue = data.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    result.push(emaValue);
    
    // Calcular o restante das EMAs
    for (let i = period; i < data.length; i++) {
      emaValue = (data[i] - emaValue) * multiplier + emaValue;
      result.push(emaValue);
    }
    
    return result;
  }
  
  /**
   * Calcula o Índice de Força Relativa (RSI)
   * @param {Array} data - Array de preços
   * @param {number} period - Período do RSI
   * @returns {Array} - Array com os valores do RSI
   */
  function rsi(data, period) {
    const result = [];
    
    if (data.length < period + 1) {
      return result;
    }
    
    // Calcular mudanças nos preços
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }
    
    // Separar ganhos e perdas
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
    
    // Calcular médias iniciais de ganhos e perdas
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // Calcular primeiro RSI
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Evitar divisão por zero
    result.push(100 - (100 / (1 + rs)));
    
    // Calcular resto dos valores de RSI
    for (let i = period; i < changes.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      result.push(100 - (100 / (1 + rs)));
    }
    
    return result;
  }
  
  /**
   * Calcula as Bandas de Bollinger
   * @param {Array} data - Array de preços
   * @param {number} period - Período para a média móvel
   * @param {number} stdDev - Número de desvios padrão (geralmente 2)
   * @returns {Object} - Objeto com upper, middle e lower bands
   */
  function bollingerBands(data, period = 20, stdDev = 2) {
    if (data.length < period) {
      return { upper: [], middle: [], lower: [] };
    }
    
    // Calcular SMA (linha do meio)
    const middle = sma(data, period);
    const upper = [];
    const lower = [];
    
    // Calcular bandas superior e inferior
    for (let i = 0; i < middle.length; i++) {
      // Obter os preços para o período atual
      const slice = data.slice(i, i + period);
      
      // Calcular desvio padrão
      const squaredDiffs = slice.map(price => Math.pow(price - middle[i], 2));
      const avgSquaredDiff = squaredDiffs.reduce((sum, value) => sum + value, 0) / period;
      const standardDeviation = Math.sqrt(avgSquaredDiff);
      
      // Calcular bandas
      upper.push(middle[i] + (standardDeviation * stdDev));
      lower.push(middle[i] - (standardDeviation * stdDev));
    }
    
    return { upper, middle, lower };
  }
  
  /**
   * Calcula o MACD (Moving Average Convergence Divergence)
   * @param {Array} data - Array de preços
   * @param {number} fastPeriod - Período da EMA rápida (geralmente 12)
   * @param {number} slowPeriod - Período da EMA lenta (geralmente 26)
   * @param {number} signalPeriod - Período da linha de sinal (geralmente 9)
   * @returns {Object} - Objeto com os valores de MACD, Signal e Histogram
   */
  function macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // Calcular EMAs
    const fastEMA = ema(data, fastPeriod);
    const slowEMA = ema(data, slowPeriod);
    
    // Ajustar o comprimento da EMA rápida para corresponder à lenta
    const diff = slowPeriod - fastPeriod;
    const adjustedFastEMA = fastEMA.slice(diff);
    
    // Calcular a linha MACD
    const macdLine = [];
    for (let i = 0; i < adjustedFastEMA.length; i++) {
      macdLine.push(adjustedFastEMA[i] - slowEMA[i]);
    }
    
    // Calcular a linha de sinal (EMA da linha MACD)
    const signalLine = ema(macdLine, signalPeriod);
    
    // Calcular o histograma (MACD - Signal)
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + macdLine.length - signalLine.length] - signalLine[i]);
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram
    };
  }
  
  /**
   * Calcula o Average True Range (ATR)
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {Array} closes - Array de preços de fechamento
   * @param {number} period - Período do ATR
   * @returns {Array} - Array com os valores do ATR
   */
  function atr(highs, lows, closes, period = 14) {
    if (highs.length !== lows.length || highs.length !== closes.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    if (highs.length < period + 1) {
      return [];
    }
    
    // Calcular True Range
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Calcular primeiro ATR usando média simples
    let atrValue = 0;
    for (let i = 0; i < period; i++) {
      atrValue += trueRanges[i];
    }
    atrValue /= period;
    
    const result = [atrValue];
    
    // Calcular ATR usando smoothing
    for (let i = period; i < trueRanges.length; i++) {
      atrValue = ((atrValue * (period - 1)) + trueRanges[i]) / period;
      result.push(atrValue);
    }
    
    return result;
  }
  
  /**
   * Calcula o Stochastic Oscillator
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {Array} closes - Array de preços de fechamento
   * @param {number} period - Período do %K (geralmente 14)
   * @param {number} smoothK - Suavização para %K (geralmente 1)
   * @param {number} smoothD - Suavização para %D (geralmente 3)
   * @returns {Object} - Objeto com valores de %K e %D
   */
  function stochastic(highs, lows, closes, period = 14, smoothK = 1, smoothD = 3) {
    if (highs.length !== lows.length || highs.length !== closes.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    if (highs.length < period) {
      return { k: [], d: [] };
    }
    
    // Calcular %K
    const rawK = [];
    for (let i = period - 1; i < closes.length; i++) {
      const currentClose = closes[i];
      
      // Encontrar o maior alto e o menor baixo no período
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      
      for (let j = i - period + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, highs[j]);
        lowestLow = Math.min(lowestLow, lows[j]);
      }
      
      // Calcular %K
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      rawK.push(k);
    }
    
    // Suavizar %K
    const k = smoothK > 1 ? sma(rawK, smoothK) : rawK;
    
    // Calcular %D (SMA de %K)
    const d = sma(k, smoothD);
    
    return { k, d };
  }
  
  /**
   * Calcula o Parabolic SAR
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {number} acceleration - Fator de aceleração inicial (geralmente 0.02)
   * @param {number} maxAcceleration - Aceleração máxima (geralmente 0.2)
   * @returns {Array} - Array com os valores do Parabolic SAR
   */
  function parabolicSAR(highs, lows, acceleration = 0.02, maxAcceleration = 0.2) {
    if (highs.length !== lows.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    if (highs.length < 2) {
      return [];
    }
    
    const result = [];
    
    // Determinar tendência inicial (assumimos alta)
    let trend = true;
    let sar = lows[0];
    let extremePoint = highs[0];
    let af = acceleration;
    
    // Precisamos calcular o primeiro valor de SAR separadamente
    sar = sar + af * (extremePoint - sar);
    
    // Limitamos o SAR para que não ultrapasse os preços anteriores
    sar = Math.min(sar, lows[0]);
    result.push(sar);
    
    // Calcular o restante dos valores de SAR
    for (let i = 1; i < highs.length; i++) {
      // Atualizar SAR atual com base no anterior
      sar = sar + af * (extremePoint - sar);
      
      // Verificar se houve inversão de tendência
      if ((trend && lows[i] < sar) || (!trend && highs[i] > sar)) {
        // Mudar tendência
        trend = !trend;
        sar = trend ? extremePoint : extremePoint;
        extremePoint = trend ? highs[i] : lows[i];
        af = acceleration;
      } else {
        // Continuar na mesma tendência
        if (trend) {
          if (highs[i] > extremePoint) {
            extremePoint = highs[i];
            af = Math.min(af + acceleration, maxAcceleration);
          }
        } else {
          if (lows[i] < extremePoint) {
            extremePoint = lows[i];
            af = Math.min(af + acceleration, maxAcceleration);
          }
        }
      }
      
      // Limitamos o SAR para que não ultrapasse os preços anteriores
      if (trend) {
        sar = Math.min(sar, lows[i - 1], lows[i]);
      } else {
        sar = Math.max(sar, highs[i - 1], highs[i]);
      }
      
      result.push(sar);
    }
    
    return result;
  }
  
  /**
   * Calcula o Ichimoku Cloud
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {Array} closes - Array de preços de fechamento
   * @param {number} tenkanPeriod - Período do Tenkan-sen (geralmente 9)
   * @param {number} kijunPeriod - Período do Kijun-sen (geralmente 26)
   * @param {number} senkouBPeriod - Período do Senkou Span B (geralmente 52)
   * @param {number} displacement - Deslocamento (geralmente 26)
   * @returns {Object} - Componentes do Ichimoku Cloud
   */
  function ichimoku(highs, lows, closes, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52, displacement = 26) {
    if (highs.length !== lows.length || highs.length !== closes.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    // Função auxiliar para calcular (highest high + lowest low) / 2
    const donchian = (highs, lows, start, period) => {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      
      for (let i = start; i < start + period; i++) {
        if (i < highs.length) {
          highestHigh = Math.max(highestHigh, highs[i]);
          lowestLow = Math.min(lowestLow, lows[i]);
        }
      }
      
      return (highestHigh + lowestLow) / 2;
    };
    
    // Calcular Tenkan-sen (Conversion Line)
    const tenkan = [];
    for (let i = 0; i < highs.length; i++) {
      tenkan.push(donchian(highs, lows, Math.max(0, i - tenkanPeriod + 1), tenkanPeriod));
    }
    
    // Calcular Kijun-sen (Base Line)
    const kijun = [];
    for (let i = 0; i < highs.length; i++) {
      kijun.push(donchian(highs, lows, Math.max(0, i - kijunPeriod + 1), kijunPeriod));
    }
    
    // Calcular Senkou Span A (Leading Span A)
    const senkouA = [];
    for (let i = 0; i < highs.length + displacement; i++) {
      if (i < tenkan.length && i < kijun.length) {
        senkouA.push((tenkan[i] + kijun[i]) / 2);
      } else {
        // Previsão futura usando valores atuais
        senkouA.push((tenkan[tenkan.length - 1] + kijun[kijun.length - 1]) / 2);
      }
    }
    
    // Calcular Senkou Span B (Leading Span B)
    const senkouB = [];
    for (let i = 0; i < highs.length + displacement; i++) {
      senkouB.push(donchian(highs, lows, Math.max(0, i - senkouBPeriod + 1), senkouBPeriod));
    }
    
    // Calcular Chikou Span (Lagging Span)
    const chikou = [];
    for (let i = displacement; i < closes.length + displacement; i++) {
      if (i - displacement < closes.length) {
        chikou.push(closes[i - displacement]);
      }
    }
    
    // Ajustar Senkou Spans para o deslocamento
    const displcaedSenkouA = senkouA.slice(displacement);
    const displcaedSenkouB = senkouB.slice(displacement);
    
    return {
      tenkan,
      kijun,
      senkouA: displcaedSenkouA,
      senkouB: displcaedSenkouB,
      chikou
    };
  }
  
  /**
   * Calcula o On-Balance Volume (OBV)
   * @param {Array} closes - Array de preços de fechamento
   * @param {Array} volumes - Array de volumes
   * @returns {Array} - Array com os valores do OBV
   */
  function obv(closes, volumes) {
    if (closes.length !== volumes.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    if (closes.length === 0) {
      return [];
    }
    
    const result = [volumes[0]]; // Iniciar com o primeiro volume
    
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        // Preço subiu - adicionar volume
        result.push(result[i - 1] + volumes[i]);
      } else if (closes[i] < closes[i - 1]) {
        // Preço caiu - subtrair volume
        result.push(result[i - 1] - volumes[i]);
      } else {
        // Preço não mudou - manter OBV
        result.push(result[i - 1]);
      }
    }
    
    return result;
  }
  
  /**
   * Calcula o Volume Weighted Average Price (VWAP)
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {Array} closes - Array de preços de fechamento
   * @param {Array} volumes - Array de volumes
   * @returns {Array} - Array com os valores do VWAP
   */
  function vwap(highs, lows, closes, volumes) {
    if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    const typicalPrices = [];
    const cumulativeTPV = []; // Typical Price * Volume
    const cumulativeVolume = [];
    const result = [];
    
    for (let i = 0; i < highs.length; i++) {
      // Calcular Typical Price: (High + Low + Close) / 3
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      typicalPrices.push(typicalPrice);
      
      // Calcular o Typical Price * Volume
      const tpv = typicalPrice * volumes[i];
      
      // Calcular valores cumulativos
      if (i === 0) {
        cumulativeTPV.push(tpv);
        cumulativeVolume.push(volumes[i]);
      } else {
        cumulativeTPV.push(cumulativeTPV[i - 1] + tpv);
        cumulativeVolume.push(cumulativeVolume[i - 1] + volumes[i]);
      }
      
      // Calcular VWAP
      result.push(cumulativeTPV[i] / cumulativeVolume[i]);
    }
    
    return result;
  }
  
  /**
   * Calcula o Support e Resistance
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {number} period - Período para procurar extremos
   * @param {number} sensitivity - Sensibilidade (quanto menor, mais pontos) (default: 0.1)
   * @returns {Object} - Níveis de suporte e resistência
   */
  function supportResistance(highs, lows, period = 14, sensitivity = 0.1) {
    if (highs.length !== lows.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    if (highs.length < period) {
      return { support: [], resistance: [] };
    }
    
    const supports = [];
    const resistances = [];
    
    // Função auxiliar para verificar se é um mínimo local
    const isLocalMin = (index) => {
      if (index < period || index >= lows.length - period) {
        return false;
      }
      
      const current = lows[index];
      
      // Verificar se o preço atual é o menor no período
      for (let i = index - period; i <= index + period; i++) {
        if (i !== index && lows[i] < current) {
          return false;
        }
      }
      
      return true;
    };
    
    // Função auxiliar para verificar se é um máximo local
    const isLocalMax = (index) => {
      if (index < period || index >= highs.length - period) {
        return false;
      }
      
      const current = highs[index];
      
      // Verificar se o preço atual é o maior no período
      for (let i = index - period; i <= index + period; i++) {
        if (i !== index && highs[i] > current) {
          return false;
        }
      }
      
      return true;
    };
    
    // Encontrar pontos de suporte e resistência
    for (let i = period; i < highs.length - period; i++) {
      if (isLocalMin(i)) {
        const support = lows[i];
        
        // Verificar se já existe um suporte próximo
        const exists = supports.some(s => Math.abs(s - support) / support < sensitivity);
        
        if (!exists) {
          supports.push(support);
        }
      }
      
      if (isLocalMax(i)) {
        const resistance = highs[i];
        
        // Verificar se já existe uma resistência próxima
        const exists = resistances.some(r => Math.abs(r - resistance) / resistance < sensitivity);
        
        if (!exists) {
          resistances.push(resistance);
        }
      }
    }
    
    // Ordenar níveis
    supports.sort((a, b) => a - b);
    resistances.sort((a, b) => a - b);
    
    return { supports, resistances };
  }
  
  /**
   * Calcula o Relative Vigor Index (RVI)
   * @param {Array} opens - Array de preços de abertura
   * @param {Array} highs - Array de preços máximos
   * @param {Array} lows - Array de preços mínimos
   * @param {Array} closes - Array de preços de fechamento
   * @param {number} period - Período do RVI (default: 10)
   * @returns {Object} - Valores do RVI e sua linha de sinal
   */
  function rvi(opens, highs, lows, closes, period = 10) {
    if (opens.length !== highs.length || highs.length !== lows.length || lows.length !== closes.length) {
      throw new Error('Input arrays must have the same length');
    }
    
    if (closes.length < period) {
      return { rvi: [], signal: [] };
    }
    
    const numeratorValues = [];
    const denominatorValues = [];
    
    // Calcular valores para numerador e denominador
    for (let i = 0; i < closes.length; i++) {
      // Numerador: Close - Open
      numeratorValues.push(closes[i] - opens[i]);
      
      // Denominador: High - Low
      denominatorValues.push(highs[i] - lows[i]);
    }
    
    // Calcular médias móveis de 4 períodos
    const numerator = [];
    const denominator = [];
    
    for (let i = 3; i < numeratorValues.length; i++) {
      let numSum = 0;
      let denomSum = 0;
      
      // Soma ponderada dos últimos 4 valores
      for (let j = 0; j < 4; j++) {
        const weight = 4 - j;
        numSum += numeratorValues[i - j] * weight;
        denomSum += denominatorValues[i - j] * weight;
      }
      
      numerator.push(numSum);
      denominator.push(denomSum);
    }
    
    // Calcular RVI: média móvel de numerador / média móvel de denominador
    const rviValues = [];
    for (let i = 0; i < numerator.length; i++) {
      if (denominator[i] === 0) {
        rviValues.push(0); // Evitar divisão por zero
      } else {
        rviValues.push(numerator[i] / denominator[i]);
      }
    }
    
    // Calcular linha de sinal (média móvel de 4 períodos do RVI)
    const signal = [];
    for (let i = 3; i < rviValues.length; i++) {
      let sum = 0;
      
      // Soma ponderada dos últimos 4 valores
      for (let j = 0; j < 4; j++) {
        const weight = 4 - j;
        sum += rviValues[i - j] * weight;
      }
      
      signal.push(sum / 10); // 10 é a soma dos pesos (4+3+2+1)
    }
    
    return { rvi: rviValues, signal };
  }
  
  /**
   * Calcula a Convergence Divergence of Moving Average Ribbons (CDMAR)
   * Indicador personalizado que compara múltiplas médias móveis para avaliar a força da tendência
   * @param {Array} data - Array de preços
   * @param {Array} periods - Array de períodos para as médias móveis
   * @returns {Object} - Ribbon de médias móveis e indicador de convergência/divergência
   */
  function movingAverageRibbon(data, periods = [5, 10, 20, 50, 100, 200]) {
    const ribbon = {};
    
    // Calcular as médias móveis para cada período
    for (const period of periods) {
      ribbon[`sma${period}`] = sma(data, period);
    }
    
    // Calcular a convergência/divergência entre as médias móveis
    const cdValues = [];
    
    // Começar do ponto onde todas as médias móveis estão disponíveis
    const startIndex = Math.max(...periods) - Math.min(...periods);
    
    for (let i = startIndex; i < data.length - startIndex; i++) {
      const idx = {};
      
      // Mapear índices relativos para cada período
      for (const period of periods) {
        const relativeSmaIndex = i - (Math.max(...periods) - period);
        if (relativeSmaIndex >= 0 && relativeSmaIndex < ribbon[`sma${period}`].length) {
          idx[period] = relativeSmaIndex;
        }
      }
      
      // Verificar se todas as médias têm valores disponíveis para este índice
      if (Object.keys(idx).length !== periods.length) {
        continue;
      }
      
      // Calcular a diferença máxima entre quaisquer duas médias móveis (divergência)
      let maxDiff = -Infinity;
      let minDiff = Infinity;
      
      for (let j = 0; j < periods.length; j++) {
        for (let k = j + 1; k < periods.length; k++) {
          const diff = Math.abs(
            ribbon[`sma${periods[j]}`][idx[periods[j]]] - 
            ribbon[`sma${periods[k]}`][idx[periods[k]]]
          );
          
          maxDiff = Math.max(maxDiff, diff);
          minDiff = Math.min(minDiff, diff);
        }
      }
      
      // Normalizar a diferença baseada no preço atual
      const currentPrice = data[i];
      const normalizedDiff = (maxDiff / currentPrice) * 100; // Em percentual
      
      cdValues.push(normalizedDiff);
    }
    
    return { ribbon, convergenceDivergence: cdValues };
  }
  
  /**
   * Calcula os níveis de Fibonacci Retracement
   * @param {number} high - Preço máximo
   * @param {number} low - Preço mínimo
   * @param {boolean} uptrend - Se a tendência é de alta (true) ou baixa (false)
   * @returns {Object} - Níveis de Fibonacci
   */
  function fibonacciLevels(high, low, uptrend = true) {
    const range = high - low;
    
    // Níveis padrão de Fibonacci
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618];
    
    const result = {};
    
    if (uptrend) {
      // Para tendência de alta, os níveis são calculados do baixo para o alto
      for (const level of levels) {
        result[level] = low + range * level;
      }
    } else {
      // Para tendência de baixa, os níveis são calculados do alto para o baixo
      for (const level of levels) {
        result[level] = high - range * level;
      }
    }
    
    return result;
  }
  
  module.exports = {
    sma,
    ema,
    rsi,
    bollingerBands,
    macd,
    atr,
    stochastic,
    parabolicSAR,
    ichimoku,
    obv,
    vwap,
    supportResistance,
    rvi,
    movingAverageRibbon,
    fibonacciLevels
  };