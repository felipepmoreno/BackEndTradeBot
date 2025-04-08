"""
Exceções personalizadas para a API do Trading Bot.
"""

from fastapi import HTTPException, status


class BinanceAPIException(HTTPException):
    """Exceção personalizada para erros da API da Binance."""
    
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class UnauthorizedException(HTTPException):
    """Exceção personalizada para erros de autenticação."""
    
    def __init__(self, detail: str = "Credenciais inválidas ou ausentes"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class NotFoundException(HTTPException):
    """Exceção personalizada para recursos não encontrados."""
    
    def __init__(self, detail: str = "Recurso não encontrado"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)