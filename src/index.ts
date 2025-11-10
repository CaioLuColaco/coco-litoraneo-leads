import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { leadsRoutes, initializeServices } from './routes/leadsRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { authRoutes } from './routes/authRoutes';
import { scoringRoutes } from './routes/scoringRoutes';
import { sellersRoutes } from './routes/sellersRoutes';
import { QueueService } from './services/queueService';
import { ExcelProcessingService } from './services/excelProcessingService';
import { AddressValidationService } from './services/addressValidationService';
import { PotentialAnalysisService } from './services/potentialAnalysisService';

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa os serviços globalmente
const queueService = new QueueService();
const excelProcessingService = new ExcelProcessingService();
const addressValidationService = new AddressValidationService();
const potentialAnalysisService = new PotentialAnalysisService();

// Inicializa os serviços nas rotas
initializeServices(queueService, excelProcessingService, addressValidationService, potentialAnalysisService);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());

// Middleware de CORS (aberto temporariamente para todas as origens)
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: '*',
  methods: '*',
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/sellers', sellersRoutes);

// Middleware de tratamento de erros
app.use(notFoundHandler);
app.use(errorHandler);

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API disponível em: http://localhost:${PORT}/api`);
});

export default app; 