import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import calendarService from '../services/calendarService';
import skillService from '../services/skillService';
import PersonalNotes from '../components/PersonalNotes';
import './Calendar.css';

const Calendar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [skills, setSkills] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSkillId, setSelectedSkillId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Track selected date for notes panel (separate from modal)
    const [selectedDateForNotes, setSelectedDateForNotes] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    // Check for pre-selected skill from navigation state
    useEffect(() => {
        if (location.state?.scheduleSkill) {
            // Open modal immediately if passed via navigation
            // Default to tomorrow for scheduling
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            setSelectedDate(tomorrow.toISOString().split('T')[0]);
            setSelectedSkillId(location.state.scheduleSkill.id);
            setShowModal(true);

            // Clear state so it doesn't reopen on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, skills]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [eventsData, skillsData] = await Promise.all([
                calendarService.getEvents(),
                skillService.getUserSkills()
            ]);
            setEvents(eventsData.data || []);
            setSkills(skillsData.data || []);
        } catch (err) {
            setError('Failed to load calendar data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const handleDateClick = (dateString) => {
        console.log('Selected date:', dateString);
        setSelectedDate(dateString);
        setSelectedDateForNotes(dateString); // Update notes panel
        setShowModal(true);
        setSelectedSkillId(''); // Reset selection
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSkillId || !selectedDate) return;

        console.log("Scheduling skillId:", selectedSkillId);

        setSubmitting(true);
        try {
            await calendarService.scheduleSession(selectedSkillId, selectedDate);
            setShowModal(false);
            await loadData(); // Refresh events
            alert('Practice scheduled successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to schedule session');
        } finally {
            setSubmitting(false);
        }
    };

    // Calendar Generation Logic
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const renderEventsForDate = (date) => {
        if (!date) return null;
        const dateStr = date.toISOString().split('T')[0];
        const dayEvents = events.filter(e => e.date.startsWith(dateStr));

        return (
            <div className="day-events">
                {dayEvents.map(event => (
                    <div
                        key={event.id}
                        className={`event-dot ${event.type}`}
                        title={`${event.title} (${event.type})`}
                        style={{ backgroundColor: event.color }}
                    />
                ))}
            </div>
        );
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button className="nav-btn" onClick={() => handleMonthChange(-1)}>←</button>
                <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <button className="nav-btn" onClick={() => handleMonthChange(1)}>→</button>
            </div>

            {loading ? (
                <div className="loading-spinner">Loading...</div>
            ) : (
                <>
                    <div className="weekdays-grid">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="weekday-header">{d}</div>
                        ))}
                    </div>

                    <div className="days-grid">
                        {getDaysInMonth(currentDate).map((date, index) => (
                            <div
                                key={index}
                                className={`day-cell ${date ? '' : 'empty'} ${date && date.toDateString() === new Date().toDateString() ? 'today' : ''
                                    } ${date && selectedDateForNotes && date.toISOString().split('T')[0] === selectedDateForNotes ? 'selected' : ''
                                    }`}
                                onClick={() => date && handleDateClick(date.toISOString().split('T')[0])}
                            >
                                {date && (
                                    <>
                                        <span className="day-number">{date.getDate()}</span>
                                        {renderEventsForDate(date)}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Recent Activity List (Below grid) */}
                    <div className="calendar-bottom-section">
                        <div className="events-list">
                            <h3>Upcoming & Recent</h3>
                            {events.slice(0, 5).map(event => (
                                <div key={event.id} className="event-item">
                                    <div className="event-date">
                                        {new Date(event.date).toLocaleDateString()}
                                    </div>
                                    <div className="event-info">
                                        <span className={`event-badge ${event.type}`}>{event.type}</span>
                                        <span className="event-title">{event.title}</span>
                                    </div>
                                    {event.score !== undefined && (
                                        <div className="event-score">Score: {event.score}%</div>
                                    )}
                                </div>
                            ))}
                            {events.length === 0 && <p className="no-events">No activity recorded yet.</p>}
                        </div>

                        <div className="notes-panel">
                            <PersonalNotes selectedDate={selectedDateForNotes} />
                        </div>
                    </div>
                </>
            )}

            {/* Schedule Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Schedule Practice Session</h3>
                        <form onSubmit={handleScheduleSubmit}>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Skill to Practice</label>
                                <select
                                    value={selectedSkillId}
                                    onChange={(e) => setSelectedSkillId(e.target.value)}
                                    required
                                >
                                    <option value="">Select a skill...</option>
                                    {skills.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? 'Scheduling...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
