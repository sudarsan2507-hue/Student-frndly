/**
 * NoteStorage — thin wrapper around SQLiteStorage for personal notes.
 * Maintains the same public API as the old file-based NoteStorage
 * so NoteController requires zero changes.
 */
class NoteStorage {
    constructor(db) {
        // db is the SQLiteStorage instance injected from server.js
        this.db = db;
        this.initialized = false;
    }

    async initialize() {
        // SQLiteStorage.initialize() already handles the notes table
        if (!this.initialized) {
            this.initialized = true;
            console.log('✓ Note storage ready (SQLite)');
        }
    }

    /**
     * Find notes by user, optionally filtered by date (YYYY-MM-DD)
     */
    findByUser(userId, dateFilter = null) {
        // SQLiteStorage.findNotesByUserId is async but better-sqlite3 is sync
        // — we call the underlying db directly for sync NoteController compatibility
        if (dateFilter) {
            return this.db.db
                .prepare('SELECT * FROM personal_notes WHERE userId = ? AND date = ? ORDER BY updatedAt DESC')
                .all(userId, dateFilter);
        }
        return this.db.db
            .prepare('SELECT * FROM personal_notes WHERE userId = ? ORDER BY updatedAt DESC')
            .all(userId);
    }

    /**
     * Find a single note by ID
     */
    findById(id) {
        return this.db.db
            .prepare('SELECT * FROM personal_notes WHERE id = ?')
            .get(id) || null;
    }

    /**
     * Create a new note
     */
    async create(noteData) {
        return this.db.createNote(noteData);
    }

    /**
     * Update an existing note
     */
    async update(id, updates) {
        return this.db.updateNote(id, updates);
    }

    /**
     * Delete a note
     */
    async delete(id) {
        return this.db.deleteNote(id);
    }

    /**
     * Get all notes (admin)
     */
    getAll() {
        return this.db.db.prepare('SELECT * FROM personal_notes').all();
    }
}

export default NoteStorage;
