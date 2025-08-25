#!/bin/bash

echo "🚀 Inicializando banco de dados..."

# Aguardar MySQL estar disponível
echo "⏳ Aguardando MySQL..."
until mysql -h localhost -P 3306 -u coco_user -pcoco_password_2024 -e "SELECT 1" >/dev/null 2>&1; do
  sleep 2
done

echo "✅ MySQL está disponível"

# Executar migrações do Prisma
echo "📊 Executando migrações do Prisma..."
npx prisma migrate dev --name init

# Gerar cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

echo "✅ Banco de dados inicializado com sucesso!"
