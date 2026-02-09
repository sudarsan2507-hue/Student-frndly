import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import PersonalNote from '../models/PersonalNote.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTES_FILE = path.join(__dirname, '../../data/notes.json');

class NoteStorage {
    constructor() {
        this.notes = [];
        this.initialized = false;
    }

    /**
     * Initialize storage by loading notes from file
     */
    async initialize() {
        if (this.initialized) return;

        try {
            await this.loadNotes();
            console.log(`✓ Loaded ${this.notes.length} notes from storage`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet, create it with empty array
                await this.saveNotes();
                console.log('✓ Initialized note storage');
            } else {
                throw error;
            }
        }

        this.initialized = true;
    }

    /**
     * Load notes from JSON file
     */
    async loadNotes() {
        const data = await fs.readFile(NOTES_FILE, 'utf8');
        const notesData = JSON.parse(data);
        this.notes = notesData.map(noteData => new PersonalNote(noteData));
    }

    /**
     * Save notes to JSON file
     */
    async saveNotes() {
        const data = JSON.stringify(this.notes.map(note => note.toJSON()), null, 2);
        await fs.writeFile(NOTES_FILE, data, 'utf8');
    }

    /**
     * Find notes by user ID and optional date filter
     */
    findByUser(userId, dateFilter = null) {
        let userNotes = this.notes.filter(note => note.userId === userId);

        if (dateFilter) {
            userNotes = userNotes.filter(note => note.date === dateFilter);
        }

        return userNotes.sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    /**
     * Find note by ID
     */
    findById(id) {
        return this.notes.find(note => note.id === id);
    }

    /**
     * Create a new note
     */
    async create(noteData) {
        const note = PersonalNote.create(noteData);
        this.notes.push(note);
        await this.saveNotes();
        return note;
    }

    /**
     * Update an existing note
     */
    async update(id, updates) {
        const note = this.findById(id);
        if (!note) {
            throw new Error('Note not found');
        }

        note.update(updates);
        await this.saveNotes();
        return note;
    }

    /**
     * Delete a note
     */
    async delete(id) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index === -1) {
            throw new Error('Note not found');
        }

        const deletedNote = this.notes.splice(index, 1)[0];
        await this.saveNotes();
        return deletedNote;
    }

    /**
     * Get all notes (for admin purposes)
     */
    getAll() {
        return [...this.notes];
    }
}

// Export a singleton instance
const noteStorage = new NoteStorage();
export default noteStorage;
