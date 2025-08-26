# 📊 SISTEMA DE PONTUAÇÃO DE LEADS - COCO LITORÂNEO

## 🎯 VISÃO GERAL

O sistema de pontuação de leads do **Coco Litorâneo** é um algoritmo inteligente que avalia o potencial de cada lead baseado em múltiplos fatores. A pontuação final varia de **0 a 100 pontos**, determinando a classificação como **Baixo**, **Médio** ou **Alto** potencial.

**🔑 CARACTERÍSTICA FUNDAMENTAL:** O sistema utiliza uma **hierarquia de priorização inteligente**, priorizando dados precisos da API CNPJ sobre análises por palavras-chave.

---

## 🏆 SISTEMA DE CLASSIFICAÇÃO

| **Pontuação** | **Classificação** | **Descrição** |
|---------------|-------------------|---------------|
| **0-39** | **Baixo** | Leads com potencial limitado |
| **40-69** | **Médio** | Leads com potencial moderado |
| **70-100** | **Alto** | Leads com alto potencial comercial |

---

## 🎯 HIERARQUIA DE ANÁLISE (LÓGICA DE PRIORIZAÇÃO)

### **🥇 PRIORIDADE 1: ANÁLISE COMPLETA (API CNPJ)**
**Usado quando a API CNPJ retorna dados completos e estruturados.**

#### **Condição de Ativação:**
```typescript
if (companyData.cnae || companyData.capitalSocial || companyData.marketSegment) {
  // Usa análise completa com dados da API
}
```

#### **Fatores Analisados (Prioritários):**
1. **🏢 CNAE** (45-25 pontos) - **FATOR MAIS IMPORTANTE**
2. **💰 Capital Social** (3-8 pontos)
3. **🌍 Região** (10-20 pontos)
4. **🏪 Segmento de Mercado** (15-25 pontos)
5. **📅 Data de Fundação** (5-15 pontos)

#### **Vantagens:**
- ✅ **Dados precisos** e validados
- ✅ **Informações estruturadas** da Receita Federal
- ✅ **Análise baseada em CNAE** (padrão oficial)
- ✅ **Confiança alta** nos resultados

---

### **🥈 PRIORIDADE 2: ANÁLISE BÁSICA (Fallback)**
**Usado APENAS quando a API CNPJ falha ou retorna dados insuficientes.**

#### **Condição de Ativação:**
```typescript
if (!companyData.cnae && !companyData.capitalSocial && !companyData.marketSegment) {
  return this.analyzeBasicPotential(companyData); // Fallback
}
```

#### **Fatores Analisados (Complementares):**
1. **📝 Nome da Empresa** (5-25 pontos) - **ANÁLISE POR PALAVRAS-CHAVE**
2. **🌍 Região** (peso aumentado 1.5x)
3. **📊 Score base** (20 pontos)

#### **Características:**
- ⚠️ **Menos preciso** que dados da API
- 🔄 **Usado como fallback** quando necessário
- 📚 **Análise por palavras-chave** no nome
- 🎯 **Complementar** aos dados principais

---

## 📊 FATORES DE PONTUAÇÃO DETALHADOS

### **1. 🏢 CNAE (Classificação Nacional de Atividades Econômicas)**
**Peso: 45 pontos (Alto) / 25 pontos (Médio)**

#### **CNAEs de Alto Potencial (45 pontos):**
- **4721100**: Comércio varejista de produtos de padaria, laticínio, doces
- **4721102**: Padaria e confeitaria com predominância de revenda
- **4721104**: Comércio varejista de doces, balas, bombons
- **4724500**: Comércio varejista de hortifrutigranjeiros
- **1091102**: Padaria e confeitaria com predominância de produção própria
- **5611203**: Lanchonetes, casas de chá, de sucos
- **1053800**: Fabricação de sorvetes e gelados
- **1092900**: Fabricação de biscoitos e bolachas
- **1093701**: Fabricação de chocolates e derivados do cacau

#### **CNAEs Relacionados ao Setor (25 pontos):**
- Códigos que começam com **47** (Comércio varejista)
- Códigos que começam com **10** (Fabricação de produtos alimentícios)

---

### **2. 💰 Capital Social**
**Peso: 3-8 pontos**

| **Faixa de Capital** | **Pontos** | **Descrição** |
|----------------------|-------------|---------------|
| **> R$ 1.000.000** | **8 pontos** | Capital social alto |
| **R$ 100.000 - 1.000.000** | **5 pontos** | Capital social médio |
| **R$ 10.000 - 100.000** | **3 pontos** | Capital social baixo |

---

### **3. 🌍 Região Geográfica**
**Peso: 10-20 pontos**

| **Região** | **Pontos** | **Descrição** |
|------------|-------------|---------------|
| **Sudeste/Sul** | **20 pontos** | Alto potencial de consumo |
| **Centro-Oeste/Nordeste** | **15 pontos** | Médio potencial de consumo |
| **Norte** | **10 pontos** | Baixo potencial de consumo |

---

### **4. 📅 Data de Fundação**
**Peso: 5-15 pontos**

| **Tempo de Atividade** | **Pontos** | **Descrição** |
|------------------------|-------------|---------------|
| **> 10 anos** | **15 pontos** | Empresa estabelecida e consolidada |
| **5-10 anos** | **10 pontos** | Empresa em crescimento |
| **2-5 anos** | **5 pontos** | Empresa em desenvolvimento |

---

### **5. 🏪 Segmento de Mercado**
**Peso: 15-25 pontos**

| **Segmento** | **Pontos** | **Descrição** |
|--------------|-------------|---------------|
| **Varejo/Supermercado** | **25 pontos** | Segmento varejista de alto potencial |
| **Indústria Alimentícia** | **20 pontos** | Produção de alimentos |
| **Restaurante/Lanchonete** | **15 pontos** | Estabelecimento de alimentação |

---

## 🔄 ANÁLISE BÁSICA (FALLBACK) - DETALHAMENTO

### **📝 Análise do Nome da Empresa**
**Peso: 5-25 pontos (USADO APENAS COMO FALLBACK)**

#### **Alto Potencial (25 pontos):**
```typescript
const highPotentialKeywords = [
  'supermercado', 'hipermercado', 'mercado', 'varejo',
  'padaria', 'panificadora', 'confeitaria', 'doces', 'bolos',
  'restaurante', 'lanchonete', 'alimentacao', 'alimentos',
  'industria', 'fabrica', 'producao',
  'distribuidora', 'atacado', 'comercio'
];
```

#### **Médio Potencial (15 pontos):**
```typescript
const mediumPotentialKeywords = [
  'cafe', 'bar', 'sorveteria', 'pizzaria',
  'hotel', 'pousada', 'catering',
  'mercearia', 'quitanda', 'emporio'
];
```

#### **Baixo Potencial (5 pontos):**
- Nome não identificado como relacionado ao setor

---

## 🎯 CÁLCULO DA PONTUAÇÃO FINAL

### **Fórmula para Análise Completa:**
```
Pontuação Total = CNAE + Capital Social + Região + Segmento + Data de Fundação
Pontuação Final = Math.min(100, Math.max(0, Pontuação Total))
```

### **Fórmula para Análise Básica (Fallback):**
```
Pontuação Total = Score Base (20) + Nome da Empresa + (Região × 1.5)
Pontuação Final = Math.min(100, Math.max(0, Pontuação Total))
```

---

## 📋 EXEMPLOS PRÁTICOS

### **Exemplo 1: API CNPJ Funciona (Análise Completa)**
```
🏢 CNAE: 4721102 (Padaria) → 45 pontos
💰 Capital: R$ 500.000 → 5 pontos  
🌍 Região: Sudeste → 20 pontos
🏪 Segmento: Varejo → 25 pontos
📅 Fundação: 7 anos → 10 pontos
📊 TOTAL: 105 pontos → LIMITADO A 100 → ALTO potencial

❌ Nome da empresa: NÃO analisado (não necessário - dados da API suficientes)
```

### **Exemplo 2: API CNPJ Falha (Análise Básica - Fallback)**
```
📊 Score Base: 20 pontos
📝 Nome: "Padaria Doce Sabor" → 25 pontos
🌍 Região: Sudeste → 30 pontos (20 × 1.5)
📊 TOTAL: 75 pontos → ALTO potencial

✅ Nome da empresa: ANALISADO (necessário - dados da API insuficientes)
```

---

## 🔍 SISTEMA DE CONFIANÇA

### **Cálculo da Confiança:**
```
Confiança = (Campos Disponíveis / Total de Campos) × 100
```

### **Campos Avaliados (8 total):**
1. **CNPJ** - Identificação da empresa
2. **CNAE** - Atividade econômica
3. **Capital Social** - Recursos financeiros
4. **Data de Fundação** - Tempo de mercado
5. **Sócios** - Estrutura societária
6. **Região** - Localização geográfica
7. **Endereço Validado** - Confirmação de endereço
8. **Coordenadas** - Localização GPS

---

## ⚡ OTIMIZAÇÕES E PESOS

### **Pesos Prioritários (Análise Completa):**
1. **CNAE (45 pts)** - Fator mais importante
2. **Segmento (25 pts)** - Tipo de negócio
3. **Região (20 pts)** - Potencial de mercado
4. **Capital Social (8 pts)** - Capacidade financeira
5. **Data de Fundação (15 pts)** - Estabilidade

### **Pesos Fallback (Análise Básica):**
1. **Nome da Empresa (25 pts)** - Análise por palavras-chave
2. **Região (30 pts)** - Peso aumentado (1.5x)
3. **Score Base (20 pts)** - Pontuação mínima

---

## 🚀 PROCESSAMENTO AUTOMÁTICO

### **Fluxo de Análise:**
1. **Upload da planilha** → Extração de dados
2. **Validação de endereço** → ViaCEP + Google Maps
3. **Enriquecimento via CNPJ** → API CNPJA
4. **Decisão de Análise:**
   - ✅ **Dados suficientes** → Análise Completa (API)
   - 🔄 **Dados insuficientes** → Análise Básica (Fallback)
5. **Cálculo de pontuação** → Algoritmo de scoring
6. **Classificação automática** → Baixo/Médio/Alto
7. **Cálculo de confiança** → Qualidade dos dados

### **APIs Utilizadas:**
- **ViaCEP**: Validação de endereços brasileiros
- **Google Maps**: Geocodificação e coordenadas
- **CNPJA**: Dados empresariais e societários

---

## 📈 INTERPRETAÇÃO DOS RESULTADOS

### **Leads de Alto Potencial (70-100 pts):**
- **Prioridade máxima** para contato
- **Alta probabilidade** de conversão
- **Segmento alinhado** com o produto
- **Localização estratégica**

### **Leads de Médio Potencial (40-69 pts):**
- **Contato secundário** recomendado
- **Potencial moderado** de conversão
- **Possível qualificação** adicional
- **Monitoramento contínuo**

### **Leads de Baixo Potencial (0-39 pts):**
- **Baixa prioridade** de contato
- **Segmento não alinhado**
- **Possível exclusão** da base
- **Reavaliação futura**

---

## 🎯 VANTAGENS DA HIERARQUIA DE PRIORIZAÇÃO

### **✅ Precisão:**
- **Dados da API** são mais confiáveis
- **Análise do nome** é complementar
- **Evita duplicação** de análises

### **✅ Robustez:**
- **Sistema funciona** mesmo com falhas da API
- **Fallback inteligente** para dados limitados
- **Cobertura completa** de todos os cenários

### **✅ Eficiência:**
- **Não duplica análise** desnecessariamente
- **Usa recursos** de forma otimizada
- **Prioriza dados** mais confiáveis

---

## 🔧 CONFIGURAÇÕES TÉCNICAS

### **Rate Limiting:**
- **ViaCEP**: 1 consulta por segundo
- **CNPJA**: 5 consultas por minuto
- **Google Maps**: Conforme quota da API

### **Processamento:**
- **Lotes de 5 leads** simultâneos
- **Delay de 60 segundos** entre lotes
- **Workers concorrentes**: 5 simultâneos
- **Retry automático** para falhas de API

---

## 📊 MONITORAMENTO E MÉTRICAS

### **KPIs Disponíveis:**
- **Total de leads processados**
- **Distribuição por classificação**
- **Taxa de confiança média**
- **Tempo de processamento**
- **Taxa de sucesso das APIs**
- **Uso de análise básica vs. completa**

### **Logs de Sistema:**
- **Progresso de cada lead**
- **Erros de processamento**
- **Status das APIs externas**
- **Métricas de performance**
- **Tipo de análise utilizada**

---

## 🎯 RECOMENDAÇÕES DE USO

### **Para Equipe Comercial:**
1. **Foque em leads de alto potencial** (70-100 pts)
2. **Use a confiança** para priorizar contatos
3. **Analise os fatores** para estratégia de abordagem
4. **Monitore leads médios** para oportunidades

### **Para Gestão:**
1. **Acompanhe métricas** de pontuação
2. **Monitore uso** de análise básica vs. completa
3. **Otimize processo** de qualificação
4. **Analise ROI** por classificação

---

## 🔄 MANUTENÇÃO E ATUALIZAÇÕES

### **Atualizações de CNAE:**
- **Revisão trimestral** dos códigos de alto potencial
- **Inclusão de novos segmentos** promissores
- **Ajuste de pesos** baseado em resultados

### **Ajustes de Pesos:**
- **Análise mensal** de conversões por pontuação
- **Otimização contínua** do algoritmo
- **Testes A/B** de diferentes configurações

### **Manutenção de Palavras-chave:**
- **Revisão semestral** das palavras-chave
- **Inclusão de novos termos** do setor
- **Ajuste de pontuação** por categoria

---

## 📚 NOTAS IMPORTANTES

### **⚠️ Sobre a Análise do Nome:**
- **Usada APENAS** como fallback quando API CNPJ falha
- **Menos precisa** que dados estruturados da API
- **Complementar** aos dados principais
- **Não duplica** análise quando dados da API estão disponíveis

### **✅ Sobre a Priorização:**
- **Sistema inteligente** que escolhe o melhor método
- **Dados da API** sempre têm prioridade
- **Fallback robusto** para garantir funcionamento
- **Eficiência máxima** no uso de recursos

---

**📚 Esta documentação deve ser atualizada sempre que houver mudanças no sistema de pontuação, novos fatores forem adicionados ao algoritmo, ou ajustes na lógica de priorização.**

**🔄 Última atualização:** Agosto 2025
**📋 Versão:** 1.0
**👨‍💻 Responsável:** Senior Software Engineer - Caio Lucena Colaço
