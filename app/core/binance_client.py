"""
Cliente para interagir com a API da Binance.
"""

from binance.client import Client
from binance.exceptions import BinanceAPIException as BinanceLibException

from app.core.config import settings
from app.models.exceptions import BinanceAPIException


class BinanceClientWrapper:
    """Wrapper para o cliente da Binance."""
    
    def __init__(self, api_key: str = None, api_secret: str = None, testnet: bool = True):
        """
        Inicializa o cliente da Binance.
        
        Args:
            api_key: API Key da Binance
            api_secret: API Secret da Binance
            testnet: Se deve usar o Testnet da Binance
        """
        self.api_key = api_key or settings.BINANCE_API_KEY
        self.api_secret = api_secret or settings.BINANCE_API_SECRET
        self.testnet = testnet if testnet is not None else settings.BINANCE_TESTNET
        
        # Verifica se as credenciais foram fornecidas
        if not self.api_key or not self.api_secret:
            raise ValueError("API Key e API Secret são obrigatórios")
        
        try:
            # Inicializa o cliente da Binance
            self.client = Client(
                api_key=self.api_key,
                api_secret=self.api_secret,
                testnet=self.testnet
            )
        except BinanceLibException as e:
            raise BinanceAPIException(str(e))
    
    def test_connection(self) -> bool:
        """
        Testa a conexão com a API da Binance.
        
        Returns:
            bool: True se a conexão foi bem-sucedida, False caso contrário
        """
        try:
            self.client.ping()
            return True
        except BinanceLibException as e:
            raise BinanceAPIException(f"Erro ao conectar com a Binance: {str(e)}")
    
    def get_server_time(self):
        """
        Obtém o tempo atual do servidor da Binance.
        
        Returns:
            dict: Tempo do servidor em formato de timestamp
        """
        try:
            server_time = self.client.get_server_time()
            return server_time
        except BinanceLibException as e:
            raise BinanceAPIException(f"Erro ao obter o tempo do servidor: {str(e)}")
    
    def get_price(self, symbol: str) -> float:
        """
        Obtém o preço atual de um par de trading.
        
        Args:
            symbol: Par de trading (ex: BTCUSDT)
            
        Returns:
            float: Preço atual do par de trading
        """
        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return float(ticker["price"])
        except BinanceLibException as e:
            raise BinanceAPIException(f"Erro ao obter preço para {symbol}: {str(e)}")
            
    def get_available_symbols(self):
        """
        Obtém a lista de pares de trading disponíveis.
        
        Returns:
            list: Lista com os símbolos disponíveis
        """
        try:
            exchange_info = self.client.get_exchange_info()
            return [s["symbol"] for s in exchange_info["symbols"] if s["status"] == "TRADING"]
        except BinanceLibException as e:
            raise BinanceAPIException(f"Erro ao obter símbolos disponíveis: {str(e)}")


def get_binance_client(api_key: str = None, api_secret: str = None, testnet: bool = True) -> BinanceClientWrapper:
    """
    Factory para obter uma instância do cliente da Binance.
    
    Args:
        api_key: API Key da Binance (opcional, usa a configuração padrão se não for fornecida)
        api_secret: API Secret da Binance (opcional, usa a configuração padrão se não for fornecida)
        testnet: Se deve usar o Testnet da Binance (opcional, usa a configuração padrão se não for fornecida)
        
    Returns:
        BinanceClientWrapper: Instância do wrapper do cliente da Binance
    """
    return BinanceClientWrapper(api_key, api_secret, testnet)