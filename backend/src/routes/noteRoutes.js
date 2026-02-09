import express from 'express';
import NoteController from '../controllers/noteController.js';

const createNoteRoutes = (noteController, authMiddleware) => {
    const router = express.Router();

    // All note routes require authentication
    router.use(authMiddleware.authenticateToken);

    // GET /api/notes?date=YYYY-MM-DD - Get notes for user, optionally filtered by date
    router.get('/', noteController.getNotes);

    // POST /api/notes - Create a new note
    router.post('/', noteController.createNote);

    // PUT /api/notes/:id - Update a note
    router.put('/:id', noteController.updateNote);

    // DELETE /api/notes/:id - Delete a note
    router.delete('/:id', noteController.deleteNote);

    return router;
};

export default createNoteRoutes;
