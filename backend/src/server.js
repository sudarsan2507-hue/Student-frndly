import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import SQLiteStorage from './storage/sqliteStorage.js';
import NoteStorage from './storage/noteStorage.js';

import AuthService from './services/authService.js';
import SkillService from './services/skillService.js';
import QuickTestService from './services/quickTestService.js';
import CalendarService from './services/calendarService.js';
import KnowledgeService from './services/knowledgeService.js';
import AdminService from './services/adminService.js';

import AuthController from './controllers/authController.js';
import SkillController from './controllers/skillController.js';
import QuickTestController from './controllers/quickTestController.js';
import KnowledgeController from './controllers/knowledgeController.js';
import CalendarController from './controllers/calendarController.js';
import NoteController from './controllers/noteController.js';
import AdminController from './controllers/adminController.js';

import createAuthRoutes from './routes/authRoutes.js';
import createSkillRoutes from './routes/skillRoutes.js';
import createQuickTestRoutes from './routes/quickTestRoutes.js';
import createKnowledgeRoutes from './routes/knowledgeRoutes.js';
import createCalendarRoutes from './routes/calendarRoutes.js';
import createNoteRoutes from './routes/noteRoutes.js';
import createAdminRoutes from './routes/adminRoutes.js';
import createMessageRoutes from './routes/messageRoutes.js';
import { createRetentionRoutes } from './routes/retentionRoutes.js';

import createAuthMiddleware from './middleware/authMiddleware.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './utils/logger.js';

dotenv.config();

// Fail fast if required env vars are missing
const REQUIRED_ENV = ['JWT_SECRET'];
for (const varName of REQUIRED_ENV) {
    if (!process.env[varName]) {
        logger.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
}

process.on('uncaughtException', (err) => logger.error('UNCAUGHT EXCEPTION', { message: err.message, stack: err.stack }));
process.on('unhandledRejection', (reason) => logger.error('UNHANDLED REJECTION', { reason: String(reason) }));

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

// Storage
const storage = new SQLiteStorage();
const noteStorage = new NoteStorage(storage);

// Services
const authService = new AuthService(storage);
const skillService = new SkillService(storage);
const quickTestService = new QuickTestService(storage, skillService);
const calendarService = new CalendarService(storage);
const knowledgeService = new KnowledgeService(storage, skillService, quickTestService);
const adminService = new AdminService(storage, skillService);

// Controllers
const authController = new AuthController(authService);
const skillController = new SkillController(skillService);
const quickTestController = new QuickTestController(quickTestService);
const calendarController = new CalendarController(calendarService);
const knowledgeController = new KnowledgeController(knowledgeService);
const noteController = new NoteController(noteStorage);
const adminController = new AdminController(adminService);

// Middleware
export const authMiddleware = createAuthMiddleware(storage);

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/skills', createSkillRoutes(skillController, authMiddleware));
app.use('/api/quick-test', createQuickTestRoutes(quickTestController, authMiddleware));
app.use('/api/knowledge', createKnowledgeRoutes(knowledgeController, authMiddleware));
app.use('/api/calendar', createCalendarRoutes(calendarController, authMiddleware));
app.use('/api/notes', createNoteRoutes(noteController, authMiddleware));
app.use('/api/admin', createAdminRoutes(adminController, authMiddleware));
app.use('/api/messages', createMessageRoutes(storage, authMiddleware));
app.use('/api/retention', createRetentionRoutes(storage, authMiddleware));

app.get('/api/health', (req, res) => res.json({ status: 'ok', storage: 'SQLite' }));
app.use(errorHandler);

const startServer = async () => {
    try {
        await storage.initialize();
        await noteStorage.initialize();
        app.listen(PORT, () => {
            logger.info(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { message: error.message });
        process.exit(1);
    }
};

startServer();
export default app;
