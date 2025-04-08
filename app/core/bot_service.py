"""
Serviço para controlar o bot de trading.
"""

import threading
import time
import logging
from datetime import datetime
from typing import Dict, Optional, Any, List

from app.models.bot import BotConfig, BotStatus, BotStrategy
from app.models.exceptions import BinanceAPIException
from app.core.trading_service import trading_service
from app.core.wallet_service import wallet_service
from app.core.binance_client import get_binance_client


class BotService:
    """Serviço para gerenciar o bot de trading."""
    
    def __init__(self):
        """Inicializa o serviço de bot."""
        self._logger = logging.getLogger(__name__)
        self._bot_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._status = BotStatus.STOPPED
        self._config: Optional[BotConfig] = None
        self._state: Dict[str, Any] = {
            "start_time": None,
            "last_price": None,
            "last_operation": None,
            "error_message": None,
            "wallet_id": None,
            "symbol": None,
            "price_history": []
        }
    
    def start(self, config: BotConfig) -> bool:
        """
        Inicia o bot com a configuração fornecida.
        
        Args:
            config: Configuração do bot
            
        Returns:
            bool: True se o bot foi iniciado com sucesso
            
        Raises:
            ValueError: Se o bot já estiver em execução
        """
        if self._bot_thread and self._bot_thread.is_alive():
            raise ValueError("O bot já está em execução")
        
        # Verifica se a carteira existe
        if not wallet_service.get_wallet(config.wallet_id):
            raise ValueError(f"Carteira com ID {config.wallet_id} não encontrada")
        
        # Verifica se o par de trading é válido
        try:
            # Obtém as credenciais da carteira
            api_key = wallet_service._decrypt(wallet_service._wallets[config.wallet_id]["api_key"])
            api_secret = wallet_service._decrypt(wallet_service._wallets[config.wallet_id]["api_secret"])
            use_testnet = wallet_service._wallets[config.wallet_id]["use_testnet"]
            
            # Testa a conexão e valida o símbolo
            client = get_binance_client(api_key, api_secret, use_testnet)
            price = client.get_price(config.symbol)
            
            # Se chegou aqui, o símbolo é válido
        except Exception as e:
            raise ValueError(f"Símbolo inválido ou erro de conexão: {str(e)}")
        
        # Configura o bot
        self._config = config
        self._state["start_time"] = datetime.utcnow().isoformat()
        self._state["last_price"] = price
        self._state["wallet_id"] = config.wallet_id
        self._state["symbol"] = config.symbol
        self._state["price_history"] = []
        self._state["error_message"] = None
        self._state["last_operation"] = f"Bot iniciado para {config.symbol}"
        
        # Inicia o thread do bot
        self._stop_event.clear()
        self._bot_thread = threading.Thread(target=self._run_bot_loop)
        self._bot_thread.daemon = True
        self._bot_thread.start()
        
        self._status = BotStatus.RUNNING
        
        self._logger.info(f"Bot iniciado para {config.symbol}")
        return True
    
    def stop(self) -> bool:
        """
        Para a execução do bot.
        
        Returns:
            bool: True se o bot foi parado com sucesso
        """
        if not self._bot_thread or not self._bot_thread.is_alive():
            return False
        
        self._stop_event.set()
        self._bot_thread.join(timeout=30)  # Espera até 30 segundos
        
        self._status = BotStatus.STOPPED
        self._state["last_operation"] = "Bot parado pelo usuário"
        self._logger.info("Bot parado pelo usuário")
        
        return True
    
    def get_status(self) -> Dict[str, Any]:
        """
        Obtém o status atual do bot.
        
        Returns:
            Dict[str, Any]: Status atual do bot
        """
        return {
            "status": self._status,
            "symbol": self._state.get("symbol"),
            "wallet_id": self._state.get("wallet_id"),
            "start_time": self._state.get("start_time"),
            "last_operation": self._state.get("last_operation"),
            "error_message": self._state.get("error_message"),
            "config": self._config,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _run_bot_loop(self):
        """Loop principal do bot de trading."""
        try:
            # Continua executando enquanto o evento de parada não for definido
            while not self._stop_event.is_set():
                try:
                    if not self._config:
                        self._logger.error("Configuração do bot não definida")
                        self._state["error_message"] = "Configuração do bot não definida"
                        self._status = BotStatus.ERROR
                        break
                    
                    # Executa uma iteração da estratégia
                    self._execute_strategy()
                    
                    # Aguarda o intervalo configurado
                    self._stop_event.wait(self._config.interval_seconds)
                
                except BinanceAPIException as e:
                    self._logger.error(f"Erro na API da Binance: {str(e)}")
                    self._state["error_message"] = f"Erro na API da Binance: {str(e)}"
                    self._status = BotStatus.ERROR
                    break
                    
                except Exception as e:
                    self._logger.error(f"Erro durante a execução do bot: {str(e)}")
                    self._state["error_message"] = f"Erro durante a execução do bot: {str(e)}"
                    self._status = BotStatus.ERROR
                    break
        
        except Exception as e:
            self._logger.error(f"Erro fatal no loop do bot: {str(e)}")
            self._state["error_message"] = f"Erro fatal no loop do bot: {str(e)}"
            self._status = BotStatus.ERROR
        
        finally:
            if self._status != BotStatus.STOPPED:
                self._status = BotStatus.ERROR
    
    def _execute_strategy(self):
        """
        Executa a estratégia de trading configurada.
        Esta é uma implementação simples para a V1.
        """
        if not self._config:
            return
        
        try:
            # Obtém as credenciais da carteira
            api_key = wallet_service._decrypt(wallet_service._wallets[self._config.wallet_id]["api_key"])
            api_secret = wallet_service._decrypt(wallet_service._wallets[self._config.wallet_id]["api_secret"])
            use_testnet = wallet_service._wallets[self._config.wallet_id]["use_testnet"]
            
            # Conecta ao cliente Binance
            client = get_binance_client(api_key, api_secret, use_testnet)
            
            # Obtém o preço atual
            current_price = client.get_price(self._config.symbol)
            
            # Adiciona ao histórico de preços (máximo 100 pontos)
            self._state["price_history"].append({
                "price": current_price,
                "timestamp": datetime.utcnow().isoformat()
            })
            if len(self._state["price_history"]) > 100:
                self._state["price_history"].pop(0)
            
            # Atualiza o último preço
            last_price = self._state["last_price"]
            self._state["last_price"] = current_price
            
            # Se for a primeira execução, só registra o preço
            if not last_price:
                self._state["last_operation"] = f"Monitorando preço: {current_price}"
                return
            
            # Estratégia básica (para V1)
            if self._config.strategy == BotStrategy.SIMPLE:
                self._execute_simple_strategy(last_price, current_price)
            elif self._config.strategy == BotStrategy.GRID:
                self._execute_grid_strategy(last_price, current_price)
            
        except Exception as e:
            self._logger.error(f"Erro ao executar estratégia: {str(e)}")
            self._state["last_operation"] = f"Erro ao executar estratégia: {str(e)}"
    
    def _execute_simple_strategy(self, last_price: float, current_price: float):
        """
        Executa a estratégia simples de trading.
        Compra quando o preço cai abaixo do threshold e vende quando sobe acima do threshold.
        
        Args:
            last_price: Último preço registrado
            current_price: Preço atual
        """
        # Define thresholds padrão se não estiverem configurados
        buy_threshold = self._config.buy_threshold or 0.5  # 0.5%
        sell_threshold = self._config.sell_threshold or 1.0  # 1.0%
        
        # Calcula a variação percentual
        price_change_percent = ((current_price - last_price) / last_price) * 100
        
        # Registra a análise
        self._state["last_operation"] = f"Análise: Preço atual {current_price}, variação {price_change_percent:.2f}%"
        
        # Em uma implementação real, teríamos verificação de saldo e mais validações
        # Esta é uma versão simplificada para a V1
        
        # Lógica para compra (preço caindo)
        if price_change_percent <= -buy_threshold:
            self._state["last_operation"] = (
                f"Sinal de compra detectado: Preço caiu {abs(price_change_percent):.2f}% "
                f"(de {last_price} para {current_price})"
            )
            self._logger.info(f"Sinal de compra detectado: {self._config.symbol} a {current_price}")
            # Na V1, apenas registramos o sinal sem executar a ordem real
        
        # Lógica para venda (preço subindo)
        elif price_change_percent >= sell_threshold:
            self._state["last_operation"] = (
                f"Sinal de venda detectado: Preço subiu {price_change_percent:.2f}% "
                f"(de {last_price} para {current_price})"
            )
            self._logger.info(f"Sinal de venda detectado: {self._config.symbol} a {current_price}")
            # Na V1, apenas registramos o sinal sem executar a ordem real
    
    def _execute_grid_strategy(self, last_price: float, current_price: float):
        """
        Executa a estratégia de grid trading.
        
        Args:
            last_price: Último preço registrado
            current_price: Preço atual
        """
        # Esta é uma simulação simples da estratégia de grid trading
        self._state["last_operation"] = (
            f"Análise grid trading: Preço atual {current_price}, "
            f"mudança de {((current_price-last_price)/last_price)*100:.2f}%"
        )
        
        # Na V1, apenas simulamos a estratégia sem executar ordens reais


# Instância global do serviço de bot
bot_service = BotService()