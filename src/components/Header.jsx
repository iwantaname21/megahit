import React from 'react';
import { motion } from 'framer-motion';
import { hapticLight } from '../lib/haptics';

export default function Header({ showNav = false, activeTab, onTabChange }) {
  const tabs = [
    { key: 'play', label: 'PLAY' },
    { key: 'history', label: 'HISTORY' },
  ];

  return (
    <nav className="w-full flex justify-center items-center px-6 h-16 relative z-50">
      {showNav ? (
        <div className="flex items-center glass-nav rounded-full px-1.5 py-1.5 relative">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { hapticLight(); onTabChange?.(tab.key); }}
              className={`relative z-10 px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm transition-colors duration-200 ${
                activeTab === tab.key ? 'text-[#131314]' : 'text-[#131314]/40'
              }`}
            >
              {/* Sliding pill behind active tab */}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="header-pill"
                  className="absolute inset-0 rounded-full sliding-pill"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="h-4" />
      )}
    </nav>
  );
}
