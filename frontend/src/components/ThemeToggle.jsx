import React from 'react';
import { useTheme, PALETTES } from '../context/ThemeContext';
import './ThemeToggle.css';

const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
);
const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z" />
    </svg>
);

/** Mode toggle + a small row of accent-palette swatches. Self-contained —
 * drop it anywhere; it reads/writes ThemeContext (localStorage-backed). */
const ThemeToggle = ({ className = '' }) => {
    const { mode, toggleMode, palette, setPalette } = useTheme();

    return (
        <div className={`theme-toggle ${className}`}>
            <button
                type="button"
                className="theme-toggle-mode"
                onClick={toggleMode}
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
                {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="theme-toggle-swatches" role="radiogroup" aria-label="Accent colour">
                {Object.entries(PALETTES).map(([key, p]) => (
                    <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={palette === key}
                        aria-label={p.label}
                        title={p.label}
                        className={`theme-swatch ${palette === key ? 'active' : ''}`}
                        style={{ '--swatch': p.swatch }}
                        onClick={() => setPalette(key)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ThemeToggle;
