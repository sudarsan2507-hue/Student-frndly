import React, { createContext, useContext, useState } from 'react';

const MotionContext = createContext();

export const useMotion = () => useContext(MotionContext);

export const MotionProvider = ({ children }) => {
    // Global toggle for animations. Default to true.
    const [enableMotion, setEnableMotion] = useState(true);

    const toggleMotion = () => setEnableMotion(prev => !prev);

    return (
        <MotionContext.Provider value={{ enableMotion, toggleMotion }}>
            {children}
        </MotionContext.Provider>
    );
};
