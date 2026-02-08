import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import storage
import InMemoryStorage from './storage/inMemoryStorage.js';

// Import services
import AuthService from './services/authService.js';
import SkillService from './services/skillService.js';
import QuickTestService from './services/quickTestService.js';
import CalendarService from './services/calendarService.js';
import KnowledgeService from './services/knowledgeService.js';

// Import controllers
import AuthController from './controllers/authController.js';
import SkillController from './controllers/skillController.js';
import QuickTestController from './controllers/quickTestController.js';

import KnowledgeController from './controllers/knowledgeController.js';
import CalendarController from './controllers/calendarController.js';

// Import routes
import createAuthRoutes from './routes/authRoutes.js';
import createSkillRoutes from './routes/skillRoutes.js';
import createQuickTestRoutes from './routes/quickTestRoutes.js';
import createKnowledgeRoutes from './routes/knowledgeRoutes.js';
import createCalendarRoutes from './routes/calendarRoutes.js';

// Import middleware
import createAuthMiddleware from './middleware/authMiddleware.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// Initialize storage
const storage = new InMemoryStorage();

// Initialize services
const authService = new AuthService(storage);
const skillService = new SkillService(storage);
const quickTestService = new QuickTestService(storage, skillService);
const calendarService = new CalendarService(storage);
const knowledgeService = new KnowledgeService(storage, skillService, quickTestService);

// Initialize controllers
const authController = new AuthController(authService);
const skillController = new SkillController(skillService);
const quickTestController = new QuickTestController(quickTestService);
const calendarController = new CalendarController(calendarService);
const knowledgeController = new KnowledgeController(knowledgeService);

// Initialize middleware
export const authMiddleware = createAuthMiddleware(storage);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/skills', createSkillRoutes(skillController, authMiddleware));
app.use('/api/quick-test', createQuickTestRoutes(quickTestController, authMiddleware));
app.use('/api/knowledge', createKnowledgeRoutes(knowledgeController, authMiddleware));
app.use('/api/calendar', createCalendarRoutes(calendarController, authMiddleware));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize storage and start server
const startServer = async () => {
    try {
        await storage.initialize();

        app.listen(PORT, () => {
            console.log(`✓ Server running on http://localhost:${PORT}`);
            console.log(`✓ API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
