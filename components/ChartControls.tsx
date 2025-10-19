'use client';

import React from 'react';

interface ChartControlsProps {
  barsToShow: number;
  maxBars: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function ChartControls({
  barsToShow,
  maxBars,
  onZoomIn,
  onZoomOut,
  onReset,
}: ChartControlsProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
      <span className="text-xs text-gray-400 mr-2">Zoom:</span>
      
      <button
        onClick={onZoomIn}
        disabled={barsToShow <= 10}
        className={`
          w-8 h-8 rounded flex items-center justify-center text-lg font-bold transition-all
          ${barsToShow <= 10
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Zoom in (show fewer bars, wider candles)"
      >
        +
      </button>
      
      <div className="px-3 py-1 bg-gray-900 rounded text-xs font-mono text-gray-300 min-w-[60px] text-center">
        {barsToShow} bars
      </div>
      
      <button
        onClick={onZoomOut}
        disabled={barsToShow >= maxBars}
        className={`
          w-8 h-8 rounded flex items-center justify-center text-lg font-bold transition-all
          ${barsToShow >= maxBars
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Zoom out (show more bars, narrower candles)"
      >
        −
      </button>
      
      <button
        onClick={onReset}
        className="
          ml-2 px-3 py-1 rounded text-xs font-medium transition-all
          bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white
        "
        title="Reset to default zoom"
      >
        Reset
      </button>
    </div>
  );
}

