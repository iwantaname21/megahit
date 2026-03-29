import React from 'react';
import { motion } from 'framer-motion';

const springBounce = {
  whileHover: { scale: 1.06 },
  whileTap: { scale: 0.93 },
  transition: { type: 'spring', stiffness: 400, damping: 15 },
};

export default function Header({ showNav = false, activeTab, onTabChange }) {
  return (
    <nav className="w-full flex justify-center items-center px-6 h-16 relative z-50">
      {showNav ? (
        <div className="flex items-center glass-nav rounded-full px-2 py-1.5">
          <motion.button
            onClick={() => onTabChange?.('play')}
            className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm ${
              activeTab === 'play'
                ? 'glass-nav-active text-[#131314]'
                : 'text-[#131314]/40'
            }`}
            {...springBounce}
          >
            PLAY
          </motion.button>
          <motion.button
            onClick={() => onTabChange?.('history')}
            className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm ${
              activeTab === 'history'
                ? 'glass-nav-active text-[#131314]'
                : 'text-[#131314]/40'
            }`}
            {...springBounce}
          >
            HISTORY
          </motion.button>
        </div>
      ) : (
        <div className="h-4" />
      )}
    </nav>
  );
}
