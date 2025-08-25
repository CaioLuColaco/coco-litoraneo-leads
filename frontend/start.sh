#!/bin/sh

# Configurar variáveis de ambiente
export HOST=0.0.0.0
export PORT=3001
export REACT_APP_API_URL=http://localhost:3000/api

# Iniciar o React Scripts
echo "🚀 Iniciando frontend na porta 3001..."
echo "🌐 Acesse: http://localhost:3001"
echo "🔗 API: http://localhost:3000/api"

exec npm start
