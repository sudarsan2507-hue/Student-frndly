import noteStorage from '../storage/noteStorage.js';

/**
 * Note controller
 * Handles HTTP requests for personal note management
 */
class NoteController {
    constructor() {
        this.noteStorage = noteStorage;
    }

    /**
     * Get notes for the authenticated user
     * GET /api/notes?date=YYYY-MM-DD
     * Optional query param: date (YYYY-MM-DD)
     */
    getNotes = async (req, res, next) => {
        try {
            const userId = req.user.id; // Set by auth middleware
            const { date } = req.query;

            console.log(`Fetching notes for user ${userId}, date filter: ${date || 'none'}`);

            const notes = this.noteStorage.findByUser(userId, date);

            res.json({
                success: true,
                data: notes,
                count: notes.length
            });
        } catch (error) {
            console.error('Error fetching notes:', error);
            next(error);
        }
    };

    /**
     * Create a new note
     * POST /api/notes
     */
    createNote = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { date, content } = req.body;

            console.log(`Creating note for user ${userId}, date: ${date}`);

            if (!date || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'date and content are required'
                });
            }

            const note = await this.noteStorage.create({
                userId,
                date,
                content
            });

            console.log(`Created note ${note.id}`);

            res.status(201).json({
                success: true,
                data: note,
                message: 'Note created successfully'
            });
        } catch (error) {
            console.error('Error creating note:', error);
            if (error.message.includes('Validation failed')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };

    /**
     * Update an existing note
     * PUT /api/notes/:id
     */
    updateNote = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { content, date } = req.body;

            console.log(`Updating note ${id} for user ${userId}`);

            // Find note and verify ownership
            const existingNote = this.noteStorage.findById(id);
            if (!existingNote) {
                return res.status(404).json({
                    success: false,
                    message: 'Note not found'
                });
            }

            if (existingNote.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this note'
                });
            }

            const updates = {};
            if (content !== undefined) updates.content = content;
            if (date !== undefined) updates.date = date;

            const updatedNote = await this.noteStorage.update(id, updates);

            console.log(`Updated note ${id}`);

            res.json({
                success: true,
                data: updatedNote,
                message: 'Note updated successfully'
            });
        } catch (error) {
            console.error('Error updating note:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };

    /**
     * Delete a note
     * DELETE /api/notes/:id
     */
    deleteNote = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            console.log(`Deleting note ${id} for user ${userId}`);

            // Find note and verify ownership
            const existingNote = this.noteStorage.findById(id);
            if (!existingNote) {
                return res.status(404).json({
                    success: false,
                    message: 'Note not found'
                });
            }

            if (existingNote.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this note'
                });
            }

            await this.noteStorage.delete(id);

            console.log(`Deleted note ${id}`);

            res.json({
                success: true,
                message: 'Note deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting note:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };
}

export default NoteController;
