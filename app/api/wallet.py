"""
API para gerenciar carteiras.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, Path
from typing import Dict, List, Optional
from datetime import datetime
import base64

from app.core.wallet_service import wallet_service
from app.models.wallet import WalletCredentials, WalletBalance, WalletConnectionStatus
from app.models.exceptions import BinanceAPIException

# Criação do router
router = APIRouter()


@router.post("/connect", response_model=WalletConnectionStatus, status_code=status.HTTP_201_CREATED)
async def connect_wallet(credentials: WalletCredentials, wallet_name: Optional[str] = None):
    """
    Conecta a uma carteira usando as credenciais fornecidas.
    
    Args:
        credentials: Credenciais da carteira
        wallet_name: Nome opcional para a carteira
    
    Returns:
        WalletConnectionStatus: Status da conexão com a carteira
    """
    try:
        is_connected = wallet_service.connect_wallet(
            api_key=credentials.api_key,
            api_secret=credentials.api_secret,
            wallet_name=wallet_name,
            use_testnet=credentials.use_testnet
        )
        
        wallet_id = base64.b64encode(credentials.api_key[-8:].encode()).decode()
        
        if is_connected:
            wallet_info = wallet_service.get_wallet(wallet_id)
            return WalletConnectionStatus(
                is_connected=True,
                wallet_name=wallet_info["name"],
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível conectar à carteira com as credenciais fornecidas"
            )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao conectar à carteira: {str(e)}"
        )


@router.get("/list", status_code=status.HTTP_200_OK)
async def list_wallets():
    """
    Lista todas as carteiras conectadas.
    
    Returns:
        List[Dict]: Lista de carteiras conectadas
    """
    try:
        wallets = wallet_service.list_wallets()
        return {
            "wallets": wallets,
            "count": len(wallets),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar carteiras: {str(e)}"
        )


@router.get("/{wallet_id}/balance", response_model=WalletBalance, status_code=status.HTTP_200_OK)
async def get_wallet_balance(wallet_id: str = Path(..., description="ID da carteira")):
    """
    Obtém o saldo atual da carteira.
    
    Args:
        wallet_id: ID da carteira
    
    Returns:
        WalletBalance: Saldo atual da carteira
    """
    try:
        if wallet_service.get_wallet(wallet_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Carteira com ID {wallet_id} não encontrada"
            )
        
        balances = wallet_service.get_wallet_balance(wallet_id)
        return WalletBalance(
            balances=balances,
            timestamp=datetime.utcnow().isoformat()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter saldo da carteira: {str(e)}"
        )