import React, { useState, useEffect } from 'react';
import noteService from '../services/noteService';
import './PersonalNotes.css';

const PersonalNotes = ({ selectedDate }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch notes when selected date changes
    useEffect(() => {
        if (selectedDate) {
            fetchNotes();
        }
    }, [selectedDate]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await noteService.getNotes(selectedDate);
            setNotes(response.data || []);
        } catch (err) {
            setError('Failed to load notes');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNoteContent.trim()) return;

        try {
            setSubmitting(true);
            await noteService.createNote(selectedDate, newNoteContent);
            setNewNoteContent('');
            setIsAdding(false);
            await fetchNotes(); // Refresh notes list
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditNote = async (noteId) => {
        if (!editContent.trim()) return;

        try {
            setSubmitting(true);
            await noteService.updateNote(noteId, { content: editContent });
            setEditingId(null);
            setEditContent('');
            await fetchNotes(); // Refresh notes list
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await noteService.deleteNote(noteId);
            await fetchNotes(); // Refresh notes list
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete note');
        }
    };

    const startEditing = (note) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (!selectedDate) {
        return (
            <div className="personal-notes-container">
                <div className="notes-header">
                    <h3>Personal Notes</h3>
                </div>
                <div className="notes-empty-state">
                    <p>Select a date to view or add notes</p>
                </div>
            </div>
        );
    }

    return (
        <div className="personal-notes-container">
            <div className="notes-header">
                <h3>Notes for {formatDate(selectedDate)}</h3>
                {!isAdding && (
                    <button
                        className="add-note-btn"
                        onClick={() => setIsAdding(true)}
                    >
                        + Add Note
                    </button>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="notes-loading">Loading notes...</div>
            ) : (
                <>
                    {/* Add Note Form */}
                    {isAdding && (
                        <form className="note-form" onSubmit={handleAddNote}>
                            <textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder="Write your note..."
                                rows="4"
                                autoFocus
                                required
                            />
                            <div className="form-actions">
                                <button type="button" onClick={() => {
                                    setIsAdding(false);
                                    setNewNoteContent('');
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save Note'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Notes List */}
                    <div className="notes-list">
                        {notes.length === 0 ? (
                            <div className="notes-empty-state">
                                <p>No notes for this date</p>
                                <p className="empty-state-hint">
                                    Click "Add Note" to create one
                                </p>
                            </div>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className="note-item">
                                    {editingId === note.id ? (
                                        <div className="note-edit-form">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                rows="4"
                                                autoFocus
                                            />
                                            <div className="form-actions">
                                                <button onClick={cancelEditing}>
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleEditNote(note.id)}
                                                    disabled={submitting}
                                                >
                                                    {submitting ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="note-content">
                                                {note.content}
                                            </div>
                                            <div className="note-metadata">
                                                <span className="note-time">
                                                    {new Date(note.updatedAt).toLocaleTimeString()}
                                                </span>
                                                <div className="note-actions">
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => startEditing(note)}
                                                        title="Edit note"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="icon-btn delete"
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        title="Delete note"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PersonalNotes;
