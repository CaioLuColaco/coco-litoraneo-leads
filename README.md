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

---

## 🐳 **GUIA COMPLETO PARA RODAR LOCALMENTE**

### **📋 Pré-requisitos**
- ✅ **Docker Desktop** instalado e rodando
- ✅ **Git** para clonar o repositório
- ✅ **Node.js 18+** (opcional, para desenvolvimento local)
- ✅ **8GB RAM** disponível (recomendado)

### **🚀 Passo a Passo**

#### **1. Clonar o Repositório**
```bash
git clone <repository-url>
cd coco-litoraneo-leads
```

#### **2. Configurar Variáveis de Ambiente**
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas configurações
nano .env  # ou code .env
```

**Configurações mínimas necessárias:**
```env
# JWT (Autenticação)
JWT_SECRET=coco-litoraneo-secret-key-2024-change-in-production
JWT_EXPIRES_IN=7d

# Google Maps API (opcional - para geocodificação)
GOOGLE_MAPS_API_KEY=sua-api-key-aqui

# Ambiente
NODE_ENV=development

# Tamanho máximo de arquivo (10MB)
MAX_FILE_SIZE=10485760
```

#### **3. Iniciar Todos os Serviços**
```bash
# Iniciar todos os containers
docker-compose up -d

# Verificar status
docker-compose ps
```

**Serviços que serão iniciados:**
- 🗄️ **MySQL** (porta 3306)
- 🔴 **Redis** (porta 6379)
- ⚙️ **Backend** (porta 3000)
- 🎨 **Frontend** (porta 3001)

#### **4. Aguardar Inicialização**
```bash
# Ver logs em tempo real
docker-compose logs -f

# Aguardar mensagem: "🚀 Servidor rodando na porta 3000"
```

#### **5. Acessar as Aplicações**
- 🌐 **Frontend**: http://localhost:3001
- ⚙️ **Backend API**: http://localhost:3000
- 🗄️ **MySQL**: localhost:3306
- 🔴 **Redis**: localhost:6379

#### **6. Primeiro Acesso**
1. **Acesse** http://localhost:3001
2. **Clique** em "Registrar"
3. **Crie** sua conta
4. **Faça login** no sistema

---

## 📚 **ROTAS DA API COMPLETAS**

### **🔐 Autenticação**
| **Método** | **Rota** | **Descrição** | **Body** |
|------------|----------|---------------|----------|
| `POST` | `/api/auth/register` | Registro de usuário | `{name, email, password}` |
| `POST` | `/api/auth/login` | Login de usuário | `{email, password}` |
| `GET` | `/api/auth/me` | Dados do usuário atual | Headers: `Authorization: Bearer <token>` |

### **📊 Leads**
| **Método** | **Rota** | **Descrição** | **Parâmetros** |
|------------|----------|---------------|----------------|
| `GET` | `/api/leads` | Listar todos os leads | Query: `status`, `potentialLevel`, `city`, `state`, `limit`, `offset` |
| `GET` | `/api/leads/:id` | Buscar lead por ID | Params: `id` |
| `GET` | `/api/leads/cnpj/:cnpj` | Buscar lead por CNPJ | Params: `cnpj` |
| `POST` | `/api/leads/upload` | Upload de planilha Excel | Form: `file` |
| `POST` | `/api/leads/export` | Exportar leads para Excel | Body: `{filters, selectedIds}` |
| `PUT` | `/api/leads/:id` | Atualizar lead | Body: dados do lead |
| `DELETE` | `/api/leads/:id` | Deletar lead | Params: `id` |

### **📈 Estatísticas e Monitoramento**
| **Método** | **Rota** | **Descrição** | **Resposta** |
|------------|----------|---------------|--------------|
| `GET` | `/api/leads/stats` | Estatísticas gerais dos leads | `{total, processed, pending, highPotential}` |
| `GET` | `/api/leads/processing-stats` | Status da fila de processamento | `{totalJobs, waitingJobs, processingJobs, completedJobs, failedJobs}` |
| `GET` | `/api/leads/cnpj-api-status` | Status da API de CNPJ | `{rateLimit, status, remainingQueries}` |

### **🔧 Operações Especiais**
| **Método** | **Rota** | **Descrição** | **Body** |
|------------|----------|---------------|----------|
| `POST` | `/api/leads/:id/validate-address` | Revalidar endereço de um lead | - |
| `POST` | `/api/leads/:id/recalculate-confidence` | Recalcular confiança de um lead | - |
| `POST` | `/api/leads/cleanup-duplicates` | Remover leads duplicados por CNPJ | - |

### **🌐 Integração Externa**
| **Método** | **Rota** | **Descrição** | **Acesso** |
|------------|----------|---------------|------------|
| `GET` | `/api/leads/salesforce-webhook` | Webhook para Salesforce | Público (sem autenticação) |

---

## 🧪 **TESTANDO A API**

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

### **2. Fazer Login e Obter Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@coco.com",
    "password": "123456"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id", "name", "email" }
  }
}
```

### **3. Usar Token para Acessar Rotas Protegidas**
```bash
# Listar leads
curl -X GET http://localhost:3000/api/leads \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Ver estatísticas
curl -X GET http://localhost:3000/api/leads/stats \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### **4. Upload de Planilha**
```bash
curl -X POST http://localhost:3000/api/leads/upload \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "file=@planilha_exemplo.xlsx"
```

---

## 🔧 **COMANDOS ÚTEIS**

### **🐳 Docker**
```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker logs coco-backend
docker logs coco-frontend

# Reiniciar um serviço
docker restart coco-backend

# Rebuild de um serviço
docker-compose up -d --build backend
```

### **🗄️ Banco de Dados**
```bash
# Acessar MySQL
docker exec -it coco-mysql mysql -u coco_user -p coco_litoraneo

# Abrir Prisma Studio
docker exec coco-backend npx prisma studio --port 5555

# Executar migrações
docker exec coco-backend npx prisma db push

# Reset completo do banco
docker exec coco-backend npx prisma migrate reset --force
```

### **📊 Monitoramento**
```bash
# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats

# Ver logs da fila Redis
docker exec coco-redis redis-cli monitor
```

---

## 🚨 **TROUBLESHOOTING**

### **❌ Problemas Comuns e Soluções**

#### **1. Container não inicia**
```bash
# Verificar logs
docker logs coco-backend

# Verificar se as portas estão livres
lsof -i :3000
lsof -i :3001

# Reiniciar Docker Desktop
```

#### **2. Erro de conexão com banco**
```bash
# Verificar se MySQL está rodando
docker ps | grep mysql

# Ver logs do MySQL
docker logs coco-mysql

# Aguardar inicialização completa
docker-compose logs -f mysql
```

#### **3. Erro de Prisma**
```bash
# Regenerar cliente Prisma
docker exec coco-backend npx prisma generate

# Sincronizar banco
docker exec coco-backend npx prisma db push
```

#### **4. Frontend não carrega**
```bash
# Verificar se backend está rodando
curl http://localhost:3000/api/health

# Ver logs do frontend
docker logs coco-frontend

# Verificar variáveis de ambiente
docker exec coco-frontend env | grep REACT_APP
```

#### **5. Rate limiting das APIs**
```bash
# Ver status da API CNPJ
curl http://localhost:3000/api/leads/cnpj-api-status

# Aguardar reset do rate limit (5 consultas/minuto)
```

---

## 📊 **SISTEMA DE PONTUAÇÃO**

### **🎯 Como Funciona**
O sistema utiliza uma **hierarquia de priorização inteligente**:

1. **🥇 Prioridade 1**: Análise completa com dados da API CNPJ
2. **🥈 Prioridade 2**: Análise básica por palavras-chave (fallback)

### **📊 Fatores de Pontuação**
- **🏢 CNAE**: 45-25 pontos (fator mais importante)
- **💰 Capital Social**: 3-8 pontos
- **🌍 Região**: 10-20 pontos
- **📅 Data de Fundação**: 5-15 pontos
- **🏠 Endereço Validado**: 12 pontos
- **📝 Nome da Empresa**: 5-25 pontos (apenas fallback)

### **📚 Documentação Completa**
Veja `DOCUMENTACAO_SISTEMA_PONTUACAO.md` para detalhes completos do algoritmo.

---

## 🚀 **CHECKLIST DE MELHORIAS FUTURAS**

### **🔥 Prioridade Alta**
- [ ] **Sistema de Notificações**
  - [ ] Email para leads de alto potencial
  - [ ] Push notifications no frontend
  - [ ] Webhooks para sistemas externos

- [ ] **Dashboard Avançado**
  - [ ] Gráficos de performance
  - [ ] Métricas de conversão
  - [ ] Análise de ROI por lead

- [ ] **Integração com CRM**
  - [ ] Salesforce nativo

### **⚡ Prioridade Média**
- [ ] **Machine Learning**
  - [ ] Predição de conversão
  - [ ] Otimização automática de pesos
  - [ ] Detecção de padrões

- [ ] **Sistema de Workflow**
  - [ ] Etapas de qualificação
  - [ ] Aprovações em múltiplos níveis
  - [ ] Automação de follow-up

- [ ] **Relatórios Avançados**
  - [ ] Exportação em PDF
  - [ ] Relatórios agendados
  - [ ] Templates personalizáveis

### **🎨 Prioridade Baixa**
- [ ] **Interface Mobile**
  - [ ] App React Native
  - [ ] PWA responsiva

- [ ] **Integrações Adicionais**
  - [ ] WhatsApp Business API
  - [ ] LinkedIn Sales Navigator

- [ ] **Funcionalidades Avançadas**
  - [ ] Sistema de tags
  - [ ] Histórico de interações
  - [ ] Score de engajamento

### **🔒 Segurança e Performance**
- [ ] **Auditoria e Compliance**
  - [ ] Logs de auditoria
  - [ ] LGPD compliance
  - [ ] Backup automático

- [ ] **Escalabilidade**
  - [ ] Load balancing
  - [ ] Cache distribuído
  - [ ] Microserviços

- [ ] **Monitoramento**
  - [ ] APM (Application Performance Monitoring)
  - [ ] Alertas automáticos
  - [ ] Métricas de negócio

### **📱 Experiência do Usuário**
- [ ] **Onboarding**
  - [ ] Tutorial interativo
  - [ ] Vídeos explicativos
  - [ ] Documentação contextual

- [ ] **Personalização**
  - [ ] Temas customizáveis
  - [ ] Dashboard personalizável
  - [ ] Preferências de usuário

- [ ] **Acessibilidade**
  - [ ] Suporte a leitores de tela
  - [ ] Navegação por teclado
  - [ ] Alto contraste

---

## 📁 **ESTRUTURA DO PROJETO**

```
coco-litoraneo-leads/
├── 📁 src/                    # Código fonte do backend
│   ├── 📁 config/            # Configurações (DB, Redis)
│   ├── 📁 middleware/        # Middlewares (auth, error handling)
│   ├── 📁 routes/            # Rotas da API
│   ├── 📁 services/          # Lógica de negócio
│   └── 📁 types/             # Tipos TypeScript
├── 📁 frontend/              # Aplicação React
├── 📁 prisma/                # Schema e migrações do banco
├── 📁 scripts/               # Scripts de inicialização
├── 📁 uploads/               # Arquivos temporários
├── 📁 mysql/                 # Dados do MySQL
├── 📁 dist/                  # Build do TypeScript
├── 📄 docker-compose.yml     # Configuração Docker
├── 📄 Dockerfile.backend     # Docker do backend
├── 📄 package.json           # Dependências do projeto
├── 📄 .env.example           # Exemplo de variáveis de ambiente
├── 📄 DOCUMENTACAO_SISTEMA_PONTUACAO.md  # Documentação do sistema de pontuação
└── 📄 README.md              # Este arquivo
```

---

## 🔒 **Segurança**

### **✅ Implementado**
- Hash de senhas com bcrypt (12 rounds)
- JWT com expiração configurável
- Rate limiting para APIs externas
- Validação de entrada em todas as rotas
- CORS configurado adequadamente

### **🔐 Recomendações para Produção**
- Alterar `JWT_SECRET` para chave única e segura
- Configurar HTTPS
- Implementar rate limiting para APIs internas
- Configurar backup automático do banco
- Monitoramento de segurança

---

## 📊 **Performance**

### **🚀 Capacidades Atuais**
- **Processamento**: 5 leads simultâneos
- **Fila**: Suporte a 20.000+ leads
- **Cache**: CEPs validados por 24 horas
- **Rate Limiting**: 1 segundo entre requisições ViaCEP

### **⚡ Otimizações Implementadas**
- Cache de CEPs no banco de dados
- Processamento assíncrono com filas
- Rate limiting inteligente
- Batch processing para grandes volumes
- Automação de `prisma generate` no startup

---

## 🤝 **Contribuição**

### **📝 Como Contribuir**
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### **🎯 Padrões de Código**
- TypeScript strict mode
- ESLint + Prettier
- Commits semânticos
- Testes para novas funcionalidades

---

## 📞 **Suporte**

Para suporte técnico ou dúvidas:
- **Documentação**: Este README + DOCUMENTACAO_SISTEMA_PONTUACAO.md
- **Issues**: Repositório interno

---

**🥥 Coco Litorâneo - Sistema de Validação de Leads**
**🚀 Versão 1.0 - Com Docker, MySQL e Filas Assíncronas**
**📅 Última atualização: Agosto 2025**
**📚 Documentação completa atualizada** 