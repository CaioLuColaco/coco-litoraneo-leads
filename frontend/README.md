# 🥥 Frontend - Coco Litorâneo Leads

Frontend React para o sistema de automação de validação de leads da Coco Litorâneo.

## 🚀 **Funcionalidades**

### **🔐 Autenticação**
- **Login/Registro**: Sistema de autenticação simples
- **Proteção de rotas**: Apenas usuários autenticados podem acessar
- **Persistência**: Token salvo no localStorage

### **📤 Leads Enviados**
- **Upload de planilhas**: Drag & drop ou seleção manual
- **Validação de arquivos**: Apenas Excel (.xlsx, .xls)
- **Feedback visual**: Progresso e resultados do upload
- **Instruções**: Guia para formato correto da planilha

### **✅ Leads Processados**
- **Visualização**: Tabela com todos os leads processados
- **Estatísticas**: Cards com métricas importantes
- **Exportação**: Download em formato XLSX
- **Filtros**: Por potencial, status, etc.

## 🛠️ **Tecnologias**

- **React 18** com TypeScript
- **React Router** para navegação
- **Tailwind CSS** para estilização
- **Axios** para requisições HTTP
- **Context API** para gerenciamento de estado

## 📁 **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── AppRouter.tsx   # Roteamento principal
│   ├── AuthForm.tsx    # Formulário de login/registro
│   └── Navigation.tsx  # Navegação superior
├── contexts/           # Contextos React
│   └── AuthContext.tsx # Contexto de autenticação
├── pages/              # Páginas da aplicação
│   ├── LeadsEnviados.tsx      # Upload de planilhas
│   └── LeadsProcessados.tsx   # Visualização de leads
├── services/           # Serviços e APIs
│   └── api.ts         # Cliente HTTP e endpoints
├── types/              # Definições TypeScript
│   └── index.ts       # Interfaces e tipos
├── App.tsx            # Componente principal
└── index.tsx          # Ponto de entrada
```

## 🚀 **Como Executar**

### **1. Instalar dependências**
```bash
npm install
```

### **2. Configurar variáveis de ambiente**
Criar arquivo `.env.local`:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

### **3. Executar em desenvolvimento**
```bash
npm start
```

### **4. Build para produção**
```bash
npm run build
```

## 🔧 **Configuração**

### **API Backend**
- **URL padrão**: `http://localhost:3000/api`
- **Configurável**: Via variável de ambiente `REACT_APP_API_URL`

### **Endpoints utilizados**
- `POST /auth/login` - Login do usuário
- `POST /auth/register` - Registro de usuário
- `GET /leads` - Listar leads processados
- `POST /leads/upload` - Upload de planilha
- `POST /leads/export` - Exportar leads em XLSX
- `GET /leads/stats` - Estatísticas dos leads

## 🎨 **Design System**

### **Cores**
- **Primária**: Indigo (#4F46E5)
- **Sucesso**: Green (#059669)
- **Aviso**: Yellow (#D97706)
- **Erro**: Red (#DC2626)
- **Neutro**: Gray (#6B7280)

### **Componentes**
- **Botões**: Estilo consistente com estados hover/focus
- **Formulários**: Validação visual e feedback
- **Tabelas**: Responsivas com hover states
- **Cards**: Sombras sutis e bordas arredondadas

## 📱 **Responsividade**

- **Mobile-first**: Design otimizado para dispositivos móveis
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Navegação**: Menu mobile com toggle automático
- **Tabelas**: Scroll horizontal em telas pequenas

## 🔒 **Segurança**

- **Autenticação**: Token JWT no localStorage
- **Interceptors**: Tratamento automático de erros 401
- **Validação**: Validação de tipos de arquivo
- **Sanitização**: Inputs protegidos contra XSS

## 🚀 **Deploy**

### **Build de produção**
```bash
npm run build
```

### **Arquivos gerados**
- `build/` - Arquivos otimizados para produção
- `build/index.html` - HTML principal
- `build/static/` - CSS e JavaScript minificados

### **Servidor web**
- **Nginx**: Configuração para SPA
- **Apache**: Arquivo `.htaccess` incluído
- **Vercel/Netlify**: Deploy automático

## 📊 **Performance**

- **Code splitting**: Lazy loading de componentes
- **Bundle optimization**: Tree shaking automático
- **Image optimization**: SVGs inline para ícones
- **Caching**: Headers de cache configurados

## 🧪 **Testes**

### **Executar testes**
```bash
npm test
```

### **Testes em modo watch**
```bash
npm run test:watch
```

### **Cobertura de testes**
```bash
npm run test:coverage
```

## 🔍 **Debug**

### **React DevTools**
- Instalar extensão do navegador
- Inspecionar componentes e estado

### **Console logs**
- Logs detalhados para desenvolvimento
- Removidos automaticamente em produção

## 📝 **Contribuição**

### **Padrões de código**
- **TypeScript**: Tipagem estrita
- **ESLint**: Regras de qualidade
- **Prettier**: Formatação automática
- **Conventional Commits**: Padrão de commits

### **Estrutura de commits**
```
feat: adicionar nova funcionalidade
fix: corrigir bug
docs: atualizar documentação
style: formatação de código
refactor: refatorar código
test: adicionar testes
chore: tarefas de manutenção
```

## 🎯 **Roadmap**

### **Versão 1.1**
- [ ] Filtros avançados para leads
- [ ] Paginação de tabelas
- [ ] Busca por CNPJ/nome
- [ ] Histórico de uploads

### **Versão 1.2**
- [ ] Dashboard com gráficos
- [ ] Relatórios personalizados
- [ ] Notificações em tempo real
- ** ] Integração com CRM

### **Versão 2.0**
- [ ] PWA (Progressive Web App)
- [ ] Offline mode
- [ ] Sincronização automática
- [ ] Múltiplos usuários/permissões

## 📞 **Suporte**

- **Issues**: GitHub Issues
- **Documentação**: README.md
- **Contato**: Equipe de desenvolvimento

---

**Desenvolvido com ❤️ para Coco Litorâneo** 🥥🇧🇷
