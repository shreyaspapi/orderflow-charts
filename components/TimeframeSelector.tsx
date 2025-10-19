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
    <div className="flex gap-1 bg-gray-800 p-1 rounded-md border border-gray-700">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`
            px-3 py-1.5 rounded text-xs font-medium transition-all
            ${selected === tf
              ? 'bg-blue-600 text-white'
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

