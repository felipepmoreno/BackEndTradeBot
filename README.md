# Trading Bot Binance - Backend Python

Backend em Python para um trading bot que se conecta à Binance TestNet, implementando uma API RESTful para interações com o frontend.

## Requisitos

- Python 3.8+
- pip (gerenciador de pacotes do Python)

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
pip install -r requirements.txt
```
3. Configure as variáveis de ambiente:
   - Existe um arquivo `.env` com as chaves da TestNet da Binance
   - Você pode modificar as variáveis conforme necessário

## Execução

Para iniciar o servidor de desenvolvimento:

```bash
uvicorn main:app --reload
```

O servidor estará disponível em `http://127.0.0.1:8000`.

## Documentação da API

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Endpoints Disponíveis

- `GET /`: Página inicial com informações sobre a API
- `GET /api/health`: Endpoint de health check
- Outros endpoints serão implementados conforme desenvolvimento

## Integração com Binance TestNet

Este backend utiliza a biblioteca `python-binance` para conectar à Binance TestNet, fornecendo uma interface simples para operações de trading.

## Ambientes

- **Desenvolvimento**: Configurado para usar a Binance TestNet
- **Produção**: Será configurado posteriormente para usar a Binance real

## Segurança

- As credenciais da API são armazenadas em variáveis de ambiente
- HTTPS é recomendado para produção
- Validação de entradas implementada usando Pydantic