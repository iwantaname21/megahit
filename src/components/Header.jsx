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
        <div
          className="flex items-center rounded-full px-2 py-1.5 border"
          style={{
            background: 'rgba(19,19,20,0.08)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(19,19,20,0.08)',
          }}
        >
          <motion.button
            onClick={() => onTabChange?.('play')}
            className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm ${
              activeTab === 'play'
                ? 'bg-white/60 text-[#131314] shadow-sm'
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
                ? 'bg-white/60 text-[#131314] shadow-sm'
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
