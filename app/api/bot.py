"""
API para controle do bot de trading.
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
from datetime import datetime

from app.core.bot_service import bot_service
from app.models.bot import BotConfig, BotStatusResponse, BotStatus
from app.models.exceptions import BinanceAPIException

# Criação do router
router = APIRouter()


@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_bot(config: BotConfig) -> Dict[str, Any]:
    """
    Inicia o bot de trading com as configurações fornecidas.
    
    Args:
        config: Configuração do bot
    
    Returns:
        Dict[str, Any]: Status do bot após inicialização
    """
    try:
        is_started = bot_service.start(config)
        
        if is_started:
            bot_status = bot_service.get_status()
            return {
                "status": "started",
                "config": config.dict(),
                "start_time": bot_status.get("start_time"),
                "symbol": config.symbol,
                "wallet_id": config.wallet_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao iniciar o bot"
            )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
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
            detail=f"Erro ao iniciar o bot: {str(e)}"
        )


@router.post("/stop", status_code=status.HTTP_200_OK)
async def stop_bot() -> Dict[str, Any]:
    """
    Para a execução do bot de trading.
    
    Returns:
        Dict[str, Any]: Status do bot após parada
    """
    try:
        is_stopped = bot_service.stop()
        
        if is_stopped:
            return {
                "status": "stopped",
                "message": "Bot parado com sucesso",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "not_running",
                "message": "O bot não estava em execução",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao parar o bot: {str(e)}"
        )


@router.get("/status", response_model=BotStatusResponse, status_code=status.HTTP_200_OK)
async def get_bot_status() -> BotStatusResponse:
    """
    Obtém o status atual do bot de trading.
    
    Returns:
        BotStatusResponse: Status atual do bot
    """
    try:
        status_data = bot_service.get_status()
        
        return BotStatusResponse(
            status=status_data.get("status", BotStatus.STOPPED),
            symbol=status_data.get("symbol"),
            wallet_id=status_data.get("wallet_id"),
            start_time=status_data.get("start_time"),
            last_operation=status_data.get("last_operation"),
            error_message=status_data.get("error_message"),
            config=status_data.get("config"),
            timestamp=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do bot: {str(e)}"
        )