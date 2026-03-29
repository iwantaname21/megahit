import React from 'react';

export default function GlassCard({ children, className = '', style = {} }) {
  return (
    <div
      className={`liquid-glass rounded-2xl border border-white/30 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
