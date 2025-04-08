"""
Serviço para gerenciar carteiras.
"""

import base64
from cryptography.fernet import Fernet
import os
from datetime import datetime
from typing import Dict, List, Optional

from app.core.binance_client import get_binance_client
from app.models.exceptions import BinanceAPIException
from app.models.wallet import AssetBalance


class WalletService:
    """Serviço para gerenciar carteiras de criptomoedas."""
    
    def __init__(self):
        """Inicializa o serviço de carteira."""
        # Gera uma chave de criptografia se não existir
        self._encryption_key = os.getenv("WALLET_ENCRYPTION_KEY")
        if not self._encryption_key:
            self._encryption_key = Fernet.generate_key().decode()
            os.environ["WALLET_ENCRYPTION_KEY"] = self._encryption_key
        
        self._cipher_suite = Fernet(self._encryption_key.encode())
        self._wallets: Dict[str, Dict] = {}  # Armazena credenciais criptografadas
    
    def _encrypt(self, data: str) -> str:
        """Criptografa dados."""
        return self._cipher_suite.encrypt(data.encode()).decode()
    
    def _decrypt(self, encrypted_data: str) -> str:
        """Descriptografa dados."""
        return self._cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    def connect_wallet(self, api_key: str, api_secret: str, wallet_name: str = None, use_testnet: bool = True) -> bool:
        """
        Conecta à carteira usando credenciais da Binance.
        
        Args:
            api_key: API Key da Binance
            api_secret: API Secret da Binance
            wallet_name: Nome opcional para a carteira
            use_testnet: Se deve usar o testnet
            
        Returns:
            bool: True se a conexão foi bem-sucedida
            
        Raises:
            BinanceAPIException: Se ocorrer um erro na conexão
        """
        try:
            # Verifica se é possível se conectar com essas credenciais
            client = get_binance_client(api_key, api_secret, use_testnet)
            is_connected = client.test_connection()
            
            if is_connected:
                # Gera um ID para a carteira baseado na chave API
                wallet_id = base64.b64encode(api_key[-8:].encode()).decode()
                
                # Criptografa as credenciais
                encrypted_api_key = self._encrypt(api_key)
                encrypted_api_secret = self._encrypt(api_secret)
                
                # Armazena as credenciais
                self._wallets[wallet_id] = {
                    "api_key": encrypted_api_key,
                    "api_secret": encrypted_api_secret,
                    "name": wallet_name or f"Wallet-{wallet_id[:6]}",
                    "use_testnet": use_testnet,
                    "connected_at": datetime.utcnow().isoformat()
                }
                
                return True
            
            return False
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao conectar à carteira: {str(e)}")
    
    def get_wallet(self, wallet_id: str) -> Optional[Dict]:
        """
        Obtém informações da carteira pelo ID.
        
        Args:
            wallet_id: ID da carteira
            
        Returns:
            Dict: Informações da carteira ou None se não encontrada
        """
        if wallet_id not in self._wallets:
            return None
        
        wallet_info = self._wallets[wallet_id].copy()
        # Não retorna as credenciais criptografadas
        wallet_info.pop("api_key")
        wallet_info.pop("api_secret")
        return wallet_info
    
    def list_wallets(self) -> List[Dict]:
        """
        Lista todas as carteiras conectadas.
        
        Returns:
            List[Dict]: Lista de informações das carteiras
        """
        result = []
        for wallet_id, wallet_info in self._wallets.items():
            # Cria uma cópia sem as credenciais
            wallet_data = {
                "id": wallet_id,
                "name": wallet_info["name"],
                "use_testnet": wallet_info["use_testnet"],
                "connected_at": wallet_info["connected_at"]
            }
            result.append(wallet_data)
        return result
    
    def get_wallet_balance(self, wallet_id: str) -> List[AssetBalance]:
        """
        Obtém o saldo da carteira.
        
        Args:
            wallet_id: ID da carteira
            
        Returns:
            List[AssetBalance]: Lista de saldos por ativo
            
        Raises:
            BinanceAPIException: Se ocorrer um erro na obtenção do saldo
            ValueError: Se a carteira não estiver conectada
        """
        if wallet_id not in self._wallets:
            raise ValueError("Carteira não encontrada ou não conectada")
        
        try:
            # Obtém as credenciais
            wallet_info = self._wallets[wallet_id]
            api_key = self._decrypt(wallet_info["api_key"])
            api_secret = self._decrypt(wallet_info["api_secret"])
            use_testnet = wallet_info["use_testnet"]
            
            # Conecta ao cliente Binance
            client = get_binance_client(api_key, api_secret, use_testnet)
            
            # Obtém o saldo da conta
            account_info = client.client.get_account()
            
            # Filtra apenas ativos com saldo
            balances = []
            for balance in account_info["balances"]:
                free = float(balance["free"])
                locked = float(balance["locked"])
                
                if free > 0 or locked > 0:
                    balances.append(
                        AssetBalance(
                            asset=balance["asset"],
                            free=free,
                            locked=locked
                        )
                    )
            
            return balances
            
        except Exception as e:
            raise BinanceAPIException(f"Erro ao obter saldo da carteira: {str(e)}")


# Instância global do serviço de carteira
wallet_service = WalletService()