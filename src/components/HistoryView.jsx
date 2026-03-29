import React from 'react';
import { formatCurrency, formatDuration } from '../lib/simulation';

function HistoryItem({ trade }) {
  const isWin = trade.pnl >= 0;
  const color = isWin ? '#6DD0A9' : '#FF8AA8';

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{
        background: 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.3)',
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-[#131314]">{trade.asset}</span>
          <span
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: color + '20', color }}
          >
            {trade.side}
          </span>
          <span
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: 'rgba(19,19,20,0.06)', color: 'rgba(19,19,20,0.6)' }}
          >
            {trade.leverage}x
          </span>
        </div>
        <span className="font-extrabold text-base" style={{ color }}>
          {formatCurrency(trade.pnl)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] font-bold" style={{ color: 'rgba(19,19,20,0.4)' }}>
          {formatDuration(trade.duration)} · ${trade.originalBet.toFixed(0)} bet
        </span>
        <span className="text-[10px] font-bold" style={{ color }}>
          {trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function HistoryView({ trades }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 px-6">
        <span
          className="material-symbols-outlined text-5xl mb-4"
          style={{ color: 'rgba(19,19,20,0.2)', fontVariationSettings: "'FILL' 0" }}
        >
          history
        </span>
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'rgba(19,19,20,0.3)' }}>
          No trades yet
        </p>
        <p className="text-[11px] font-bold mt-1" style={{ color: 'rgba(19,19,20,0.2)' }}>
          Spin to start trading
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4">
      <p className="text-[10px] font-extrabold uppercase tracking-widest mb-4" style={{ color: 'rgba(19,19,20,0.4)' }}>
        {trades.length} trade{trades.length !== 1 ? 's' : ''}
      </p>
      {trades.map((trade) => (
        <HistoryItem key={trade.id} trade={trade} />
      ))}
    </div>
  );
}
