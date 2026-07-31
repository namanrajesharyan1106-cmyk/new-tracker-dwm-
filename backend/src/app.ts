import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Register routes here
import authRoutes from './routes/authRoutes';
import masterDataRoutes from './routes/masterDataRoutes';
import taskRoutes from './routes/taskRoutes';
import projectRoutes from './routes/projectRoutes';
import dailyPlanRoutes from './routes/dailyPlanRoutes';
import operationRoutes from './routes/operationRoutes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/master-data', masterDataRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/daily-plans', dailyPlanRoutes);
app.use('/api/v1/operations', operationRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
