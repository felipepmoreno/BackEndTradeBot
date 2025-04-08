"""
Serviço para executar operações de trading.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any

from app.core.wallet_service import wallet_service
from app.models.exceptions import BinanceAPIException, NotFoundException
from app.models.trading import OrderStatus, OrderSide, OrderType, OrderResponse
from app.core.binance_client import get_binance_client


class TradingService:
    """Serviço para operações de trading."""
    
    def __init__(self):
        """Inicializa o serviço de trading."""
        self._orders: Dict[str, Dict[str, Any]] = {}  # Para armazenar histórico de ordens
    
    def _create_order_response(self, order_data: Dict[str, Any]) -> OrderResponse:
        """
        Converte dados de ordem da Binance em OrderResponse.
        
        Args:
            order_data: Dados da ordem da Binance
        
        Returns:
            OrderResponse: Objeto de resposta formatado
        """
        try:
            # Mapeia campos da ordem da Binance para o modelo OrderResponse
            return OrderResponse(
                order_id=str(order_data.get("orderId")),
                symbol=order_data.get("symbol"),
                side=OrderSide(order_data.get("side")),
                type=OrderType(order_data.get("type")),
                status=OrderStatus(order_data.get("status")),
                quantity=float(order_data.get("origQty")),
                price=float(order_data.get("price", 0)) if order_data.get("price") else None,
                executed_quantity=float(order_data.get("executedQty", 0)),
                cumulative_quote_quantity=float(order_data.get("cummulativeQuoteQty", 0)),
                created_at=datetime.fromtimestamp(order_data.get("time", 0) / 1000).isoformat() if order_data.get("time") else datetime.utcnow().isoformat(),
                updated_at=datetime.fromtimestamp(order_data.get("updateTime", 0) / 1000).isoformat() if order_data.get("updateTime") else None
            )
        except Exception as e:
            # Em caso de erro, cria uma resposta básica
            return OrderResponse(
                order_id=str(order_data.get("orderId", "unknown")),
                symbol=order_data.get("symbol", "unknown"),
                side=OrderSide.BUY,
                type=OrderType.MARKET,
                status=OrderStatus.NEW,
                quantity=float(order_data.get("origQty", 0)),
                created_at=datetime.utcnow().isoformat()
            )
    
    def _get_binance_client_from_wallet(self, wallet_id: str):
        """
        Obtém um cliente Binance a partir de um ID de carteira.
        
        Args:
            wallet_id: ID da carteira
        
        Returns:
            Cliente Binance configurado
        
        Raises:
            NotFoundException: Se a carteira não for encontrada
        """
        # Verifica se a carteira existe
        wallet_info = wallet_service.get_wallet(wallet_id)
        if not wallet_info:
            raise NotFoundException(f"Carteira com ID {wallet_id} não encontrada")
        
        # Obtém as credenciais da carteira
        api_key = wallet_service._decrypt(wallet_service._wallets[wallet_id]["api_key"])
        api_secret = wallet_service._decrypt(wallet_service._wallets[wallet_id]["api_secret"])
        use_testnet = wallet_service._wallets[wallet_id]["use_testnet"]
        
        # Cria e retorna o cliente
        return get_binance_client(api_key, api_secret, use_testnet)
    
    def place_buy_order(self, symbol: str, quantity: float, wallet_id: str, price: Optional[float] = None) -> OrderResponse:
        """
        Coloca uma ordem de compra.
        
        Args:
            symbol: Símbolo de trading (ex: BTCUSDT)
            quantity: Quantidade a ser comprada
            wallet_id: ID da carteira a ser usada
            price: Preço para ordens limit (opcional)
        
        Returns:
            OrderResponse: Resposta da ordem
        
        Raises:
            BinanceAPIException: Se ocorrer um erro na API da Binance
            NotFoundException: Se a carteira não for encontrada
        """
        try:
            client = self._get_binance_client_from_wallet(wallet_id)
            
            # Se price for fornecido, usa uma ordem limit, caso contrário usa uma ordem market
            if price is not None:
                order_result = client.client.create_order(
                    symbol=symbol,
                    side="BUY",
                    type="LIMIT",
                    timeInForce="GTC",
                    quantity=quantity,
                    price=price
                )
            else:
                order_result = client.client.create_order(
                    symbol=symbol,
                    side="BUY",
                    type="MARKET",
                    quantity=quantity
                )
            
            # Armazena a ordem no histórico
            self._orders[str(order_result["orderId"])] = order_result
            
            # Retorna resposta formatada
            return self._create_order_response(order_result)
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao executar ordem de compra: {str(e)}")
    
    def place_sell_order(self, symbol: str, quantity: float, wallet_id: str, price: Optional[float] = None) -> OrderResponse:
        """
        Coloca uma ordem de venda.
        
        Args:
            symbol: Símbolo de trading (ex: BTCUSDT)
            quantity: Quantidade a ser vendida
            wallet_id: ID da carteira a ser usada
            price: Preço para ordens limit (opcional)
        
        Returns:
            OrderResponse: Resposta da ordem
        
        Raises:
            BinanceAPIException: Se ocorrer um erro na API da Binance
            NotFoundException: Se a carteira não for encontrada
        """
        try:
            client = self._get_binance_client_from_wallet(wallet_id)
            
            # Se price for fornecido, usa uma ordem limit, caso contrário usa uma ordem market
            if price is not None:
                order_result = client.client.create_order(
                    symbol=symbol,
                    side="SELL",
                    type="LIMIT",
                    timeInForce="GTC",
                    quantity=quantity,
                    price=price
                )
            else:
                order_result = client.client.create_order(
                    symbol=symbol,
                    side="SELL",
                    type="MARKET",
                    quantity=quantity
                )
            
            # Armazena a ordem no histórico
            self._orders[str(order_result["orderId"])] = order_result
            
            # Retorna resposta formatada
            return self._create_order_response(order_result)
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao executar ordem de venda: {str(e)}")
    
    def get_order(self, order_id: str, wallet_id: str, symbol: str) -> OrderResponse:
        """
        Obtém informações sobre uma ordem específica.
        
        Args:
            order_id: ID da ordem
            wallet_id: ID da carteira
            symbol: Símbolo de trading
        
        Returns:
            OrderResponse: Informações da ordem
        
        Raises:
            NotFoundException: Se a ordem não for encontrada
        """
        try:
            client = self._get_binance_client_from_wallet(wallet_id)
            
            # Consulta a ordem na Binance
            order_info = client.client.get_order(symbol=symbol, orderId=int(order_id))
            
            # Atualiza o histórico local
            self._orders[order_id] = order_info
            
            return self._create_order_response(order_info)
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao obter informações da ordem: {str(e)}")
    
    def get_orders(self, wallet_id: str, symbol: Optional[str] = None) -> List[OrderResponse]:
        """
        Obtém lista de ordens recentes.
        
        Args:
            wallet_id: ID da carteira
            symbol: Símbolo de trading (opcional)
        
        Returns:
            List[OrderResponse]: Lista de ordens
        """
        try:
            client = self._get_binance_client_from_wallet(wallet_id)
            
            # Se symbol for fornecido, filtra por ele
            if symbol:
                orders = client.client.get_all_orders(symbol=symbol)
            else:
                # Se não, tenta obter ordens para diversos símbolos comuns
                symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
                orders = []
                for s in symbols:
                    try:
                        symbol_orders = client.client.get_all_orders(symbol=s)
                        orders.extend(symbol_orders)
                    except:
                        # Ignora erros em símbolos específicos
                        pass
            
            # Ordena por data, mais recentes primeiro
            orders = sorted(orders, key=lambda x: x.get('time', 0), reverse=True)
            
            # Atualiza o histórico local
            for order in orders:
                self._orders[str(order["orderId"])] = order
            
            # Converte para OrderResponse
            return [self._create_order_response(order) for order in orders]
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao obter ordens: {str(e)}")
    
    def cancel_order(self, order_id: str, wallet_id: str, symbol: str) -> OrderResponse:
        """
        Cancela uma ordem específica.
        
        Args:
            order_id: ID da ordem
            wallet_id: ID da carteira
            symbol: Símbolo de trading
        
        Returns:
            OrderResponse: Informações da ordem cancelada
        
        Raises:
            NotFoundException: Se a ordem não for encontrada
        """
        try:
            client = self._get_binance_client_from_wallet(wallet_id)
            
            # Cancela a ordem na Binance
            result = client.client.cancel_order(symbol=symbol, orderId=int(order_id))
            
            # Atualiza o histórico local
            self._orders[order_id] = result
            
            return self._create_order_response(result)
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao cancelar ordem: {str(e)}")


# Instância global do serviço de trading
trading_service = TradingService()