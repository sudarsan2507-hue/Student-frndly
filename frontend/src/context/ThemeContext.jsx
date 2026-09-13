import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const MODE_KEY = 'sf-theme-mode';       // 'light' | 'dark'
const PALETTE_KEY = 'sf-theme-palette'; // one of PALETTES below

/** Accent presets a user can pick — each is a full role, not just one hex,
 * so it stays readable in both light and dark mode. */
export const PALETTES = {
    purple: { label: 'Purple', swatch: '#5A51BE' },
    teal: { label: 'Teal', swatch: '#2E8F79' },
    rose: { label: 'Rose', swatch: '#C4487A' },
    amber: { label: 'Amber', swatch: '#B8791E' },
};

const readStored = (key, fallback) => {
    try {
        const v = localStorage.getItem(key);
        return v || fallback;
    } catch {
        return fallback;
    }
};

export const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(() => readStored(MODE_KEY, 'light'));
    const [palette, setPalette] = useState(() => readStored(PALETTE_KEY, 'purple'));

    useEffect(() => {
        document.documentElement.dataset.theme = mode;
        try { localStorage.setItem(MODE_KEY, mode); } catch { /* private mode etc. */ }
    }, [mode]);

    useEffect(() => {
        document.documentElement.dataset.palette = palette;
        try { localStorage.setItem(PALETTE_KEY, palette); } catch { /* ignore */ }
    }, [palette]);

    const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ mode, toggleMode, setMode, palette, setPalette, palettes: PALETTES }}>
            {children}
        </ThemeContext.Provider>
    );
};
