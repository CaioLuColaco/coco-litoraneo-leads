# 🥥 **Coco Litorâneo - Sistema de Validação de Leads**

Sistema completo para automação de validação de leads da Coco Litorâneo, incluindo processamento assíncrono, validação de endereços e análise de potencial.

## 🚀 **Funcionalidades**

### **🔐 Autenticação**
- ✅ Sistema de login/registro com JWT
- ✅ Proteção de rotas com middleware de autenticação
- ✅ Hash seguro de senhas com bcrypt

### **📊 Processamento de Leads**
- ✅ Upload de planilhas Excel (formato Datlo)
- ✅ Sistema de filas assíncrono para processamento
- ✅ Validação automática de endereços via ViaCEP
- ✅ Análise de potencial por CNPJ
- ✅ Classificação automática (alto, médio, baixo)
- ✅ Processamento em lote (suporte a 20.000+ leads)

### **🛡️ Sistema de Filas**
- ✅ Redis para gerenciamento de filas
- ✅ BullMQ para processamento assíncrono
- ✅ Monitoramento de progresso em tempo real
- ✅ Retry automático em caso de falhas
- ✅ Rate limiting para APIs externas

### **🗄️ Banco de Dados**
- ✅ MySQL com Prisma ORM
- ✅ Cache de CEPs para otimização
- ✅ Logs de processamento
- ✅ Histórico de jobs

## 🛠️ **Tecnologias**

### **Backend**
- **Node.js** + **TypeScript**
- **Express.js** para API REST
- **Prisma** como ORM
- **MySQL** como banco de dados
- **Redis** para filas e cache
- **BullMQ** para processamento assíncrono
- **JWT** para autenticação
- **bcrypt** para hash de senhas

### **Frontend**
- **React** + **TypeScript**
- **React Router** para navegação
- **Context API** para estado global
- **Axios** para comunicação com API
- **XLSX** para exportação de dados

### **Infraestrutura**
- **Docker** + **Docker Compose**
- **MySQL 8.0** para dados
- **Redis 7** para filas

## 🐳 **Instalação com Docker**

### **1. Pré-requisitos**
- Docker e Docker Compose instalados
- Git para clonar o repositório

### **2. Clonar e Configurar**
```bash
git clone <repository-url>
cd coco-litoraneo-leads
```

### **3. Configurar Variáveis de Ambiente**
```bash
cp .env.example .env
```

Editar `.env` com suas configurações:
```env
# JWT (Autenticação)
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRES_IN=7d

# Google Maps API (opcional)
GOOGLE_MAPS_API_KEY=sua-api-key-aqui

# Outras configurações
NODE_ENV=development
```

### **4. Iniciar Serviços**
```bash
# Iniciar todos os serviços
npm run docker:up

# Ver logs em tempo real
npm run docker:logs
```

### **5. Inicializar Banco de Dados**
```bash
# Aguardar MySQL estar disponível (pode levar alguns segundos)
npm run db:init
```

### **6. Acessar Aplicações**
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

## 🗄️ **Estrutura do Banco de Dados**

### **Tabelas Principais**
- **`users`**: Usuários do sistema
- **`leads`**: Leads processados
- **`processing_jobs`**: Jobs de processamento
- **`cep_cache`**: Cache de CEPs validados
- **`processing_logs`**: Logs de processamento

### **Status dos Leads**
- **`aguardando`**: Lead criado, aguardando processamento
- **`processando`**: Lead sendo processado
- **`processado`**: Lead processado com sucesso
- **`erro`**: Erro no processamento

## 🔄 **Fluxo de Processamento**

### **1. Upload da Planilha**
```
Usuário → Frontend → Backend → Extração de dados → Fila Redis
```

### **2. Processamento Assíncrono**
```
Fila Redis → Worker → Validação de endereço → Análise de CNPJ → Cálculo de potencial → Banco de dados
```

### **3. Etapas de Processamento**
1. **Validação de Endereço (25%)**
   - Busca no ViaCEP com rate limiting
   - Cache de resultados
   - Fallback para dados originais

2. **Análise de CNPJ (50%)**
   - Busca de dados cadastrais
   - Análise de CNAE, capital social, região
   - Classificação de potencial

3. **Cálculo Final (75%)**
   - Combinação de validações
   - Score de 0-100
   - Classificação (alto, médio, baixo)

4. **Persistência (100%)**
   - Salvamento no banco
   - Atualização de status
   - Logs de processamento

## 📊 **APIs Disponíveis**

### **Autenticação**
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Informações do usuário atual

### **Leads**
- `GET /api/leads` - Listar leads com filtros
- `POST /api/leads/upload` - Upload de planilha
- `GET /api/leads/stats` - Estatísticas dos leads
- `POST /api/leads/export` - Exportar leads para Excel

### **Monitoramento**
- `GET /api/health` - Status da API
- `GET /api/health/detailed` - Status detalhado

## 🧪 **Testando o Sistema**

### **1. Criar Usuário de Teste**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Usuário Teste",
    "email": "teste@coco.com",
    "password": "123456"
  }'
```

### **2. Fazer Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@coco.com",
    "password": "123456"
  }'
```

### **3. Upload de Planilha**
```bash
curl -X POST http://localhost:3000/api/leads/upload \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "file=@planilha_exemplo.xlsx"
```

### **4. Verificar Status**
```bash
curl -X GET http://localhost:3000/api/leads/stats \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 📁 **Estrutura do Projeto**

```
coco-litoraneo-leads/
├── src/
│   ├── config/           # Configurações (DB, Redis)
│   ├── middleware/       # Middlewares (auth, error handling)
│   ├── routes/           # Rotas da API
│   ├── services/         # Lógica de negócio
│   └── types/            # Tipos TypeScript
├── frontend/             # Aplicação React
├── prisma/               # Schema e migrações do banco
├── scripts/              # Scripts de inicialização
├── docker-compose.yml    # Configuração Docker
├── Dockerfile.backend    # Docker do backend
└── README.md             # Este arquivo
```

## 🔧 **Comandos Úteis**

### **Desenvolvimento**
```bash
# Iniciar em modo desenvolvimento
npm run dev

# Compilar TypeScript
npm run build

# Linting e formatação
npm run lint
npm run format
```

### **Banco de Dados**
```bash
# Inicializar banco
npm run db:init

# Executar migrações
npm run db:migrate

# Gerar cliente Prisma
npm run db:generate

# Abrir Prisma Studio
npm run db:studio
```

### **Docker**
```bash
# Iniciar serviços
npm run docker:up

# Parar serviços
npm run docker:down

# Ver logs
npm run docker:logs

# Reiniciar
npm run docker:restart
```

## 📈 **Monitoramento e Logs**

### **Logs do Sistema**
- **Backend**: Console + arquivos de log
- **Frontend**: Console do navegador
- **MySQL**: Logs do container Docker
- **Redis**: Logs do container Docker

### **Métricas Disponíveis**
- Total de leads processados
- Status de processamento
- Estatísticas da fila
- Tempo de processamento
- Taxa de sucesso/erro

## 🚨 **Troubleshooting**

### **Problemas Comuns**

#### **1. MySQL não conecta**
```bash
# Verificar se o container está rodando
docker ps | grep mysql

# Ver logs do MySQL
docker logs coco-mysql

# Reiniciar serviço
npm run docker:restart
```

#### **2. Redis não conecta**
```bash
# Verificar status do Redis
docker logs coco-redis

# Testar conexão
docker exec -it coco-redis redis-cli ping
```

#### **3. Erro de migração**
```bash
# Limpar e recriar banco
docker-compose down -v
docker-compose up -d
npm run db:init
```

#### **4. Frontend não carrega**
```bash
# Verificar logs do frontend
docker logs coco-frontend

# Verificar se a API está rodando
curl http://localhost:3000/api/health
```

## 🔒 **Segurança**

### **Implementado**
- ✅ Hash de senhas com bcrypt (12 rounds)
- ✅ JWT com expiração configurável
- ✅ Rate limiting para APIs externas
- ✅ Validação de entrada em todas as rotas
- ✅ CORS configurado adequadamente

### **Recomendações para Produção**
- 🔐 Alterar `JWT_SECRET` para chave única e segura
- 🔐 Configurar HTTPS
- 🔐 Implementar rate limiting para APIs internas
- 🔐 Configurar backup automático do banco
- 🔐 Monitoramento de segurança

## 📊 **Performance**

### **Capacidades**
- **Processamento**: 5 leads simultâneos
- **Fila**: Suporte a 20.000+ leads
- **Cache**: CEPs validados por 24 horas
- **Rate Limiting**: 1 segundo entre requisições ViaCEP

### **Otimizações**
- Cache de CEPs no banco de dados
- Processamento assíncrono com filas
- Rate limiting inteligente
- Batch processing para grandes volumes

## 🚀 **Deploy para Produção**

### **1. Configurações de Produção**
```env
NODE_ENV=production
JWT_SECRET=chave-super-secreta-e-unica
DATABASE_URL=mysql://user:pass@host:3306/database
REDIS_URL=redis://host:6379
```

### **2. Comandos de Deploy**
```bash
# Build de produção
npm run build

# Migrações do banco
npm run db:migrate

# Iniciar serviços
npm run docker:up
```

### **3. Monitoramento**
- Configurar logs estruturados
- Implementar métricas de negócio
- Configurar alertas de erro
- Monitorar performance da fila

## 🤝 **Contribuição**

### **Como Contribuir**
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### **Padrões de Código**
- TypeScript strict mode
- ESLint + Prettier
- Commits semânticos
- Testes para novas funcionalidades

## 📄 **Licença**

Este projeto é propriedade da **Coco Litorâneo** e é destinado ao uso interno da empresa.

## 📞 **Suporte**

Para suporte técnico ou dúvidas:
- **Equipe de Desenvolvimento**: dev@cocolitoraneo.com
- **Documentação**: Este README
- **Issues**: Repositório interno

---

**🥥 Coco Litorâneo - Sistema de Validação de Leads**
**🚀 Versão 2.0 - Com Docker, MySQL e Filas Assíncronas**
**📅 Última atualização: Agosto 2024** 