import logger from '../utils/logger.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONTENT_LEN = 10000;

class NoteController {
    constructor(noteStorage) {
        this.noteStorage = noteStorage;
    }

    getNotes = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { date } = req.query;

            if (date && !DATE_RE.test(date)) {
                return res.status(400).json({ success: false, message: 'date must be in YYYY-MM-DD format' });
            }

            const notes = this.noteStorage.findByUser(userId, date);
            res.json({ success: true, data: notes, count: notes.length });
        } catch (error) {
            next(error);
        }
    };

    createNote = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { date, content } = req.body;

            if (!date || !content) {
                return res.status(400).json({ success: false, message: 'date and content are required' });
            }

            if (!DATE_RE.test(date)) {
                return res.status(400).json({ success: false, message: 'date must be in YYYY-MM-DD format' });
            }

            if (typeof content !== 'string' || content.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'content cannot be empty' });
            }

            if (content.length > MAX_CONTENT_LEN) {
                return res.status(400).json({ success: false, message: `content must be under ${MAX_CONTENT_LEN} characters` });
            }

            const note = await this.noteStorage.create({ userId, date, content });

            res.status(201).json({ success: true, data: note, message: 'Note created successfully' });
        } catch (error) {
            if (error.message.includes('Validation failed')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    };

    updateNote = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { content, date } = req.body;

            if (date && !DATE_RE.test(date)) {
                return res.status(400).json({ success: false, message: 'date must be in YYYY-MM-DD format' });
            }

            if (content !== undefined) {
                if (typeof content !== 'string' || content.trim().length === 0) {
                    return res.status(400).json({ success: false, message: 'content cannot be empty' });
                }
                if (content.length > MAX_CONTENT_LEN) {
                    return res.status(400).json({ success: false, message: `content must be under ${MAX_CONTENT_LEN} characters` });
                }
            }

            const existingNote = this.noteStorage.findById(id);
            if (!existingNote) {
                return res.status(404).json({ success: false, message: 'Note not found' });
            }

            if (existingNote.userId !== userId) {
                return res.status(403).json({ success: false, message: 'Not authorized to update this note' });
            }

            const updates = {};
            if (content !== undefined) updates.content = content;
            if (date !== undefined) updates.date = date;

            const updatedNote = await this.noteStorage.update(id, updates);
            res.json({ success: true, data: updatedNote, message: 'Note updated successfully' });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    };

    deleteNote = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const existingNote = this.noteStorage.findById(id);
            if (!existingNote) {
                return res.status(404).json({ success: false, message: 'Note not found' });
            }

            if (existingNote.userId !== userId) {
                return res.status(403).json({ success: false, message: 'Not authorized to delete this note' });
            }

            await this.noteStorage.delete(id);
            res.json({ success: true, message: 'Note deleted successfully' });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    };
}

export default NoteController;
