'use client';

import React from 'react';
import { Timeframe } from '@/lib/types';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

const timeframes: Timeframe[] = ['5m', '15m', '30m', '1h', '4h'];

export default function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${selected === tf
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }
          `}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

