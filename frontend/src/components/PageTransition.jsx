import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotion } from '../context/MotionContext';

const PageTransition = ({ children }) => {
    const { enableMotion } = useMotion();

    if (!enableMotion) {
        return <>{children}</>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
