'use client';

import React from 'react';
import { OrderFlowCandle } from '@/lib/types';
import { formatVolume } from '@/lib/utils';

interface FootprintBarStatisticsProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  visibleStartIndex?: number;
  visibleEndIndex?: number;
  candleWidth?: number;
  leftOffsetPx?: number;
}

export default function FootprintBarStatistics({
  data,
  width,
  height,
  visibleStartIndex = 0,
  visibleEndIndex,
  candleWidth = 0,
  leftOffsetPx = 0,
}: FootprintBarStatisticsProps) {
  console.log('FootprintBarStatistics render:', { 
    dataLength: data.length, 
    visibleStartIndex, 
    visibleEndIndex, 
    candleWidth 
  });
  
  if (!data.length) {
    console.log('No data, returning null');
    return null;
  }

  // Use the visible range from the chart, or fall back to showing all data
  const startIdx = visibleStartIndex;
  const endIdx = visibleEndIndex && visibleEndIndex > 0 ? visibleEndIndex : data.length;
  const visibleData = data.slice(startIdx, endIdx);
  
  console.log('Visible data:', { startIdx, endIdx, visibleDataLength: visibleData.length });
  
  // Calculate cell width based on candle width from chart
  const cellWidth = candleWidth > 0 ? candleWidth : Math.max(width / visibleData.length, 60);

  // Shift the table 3 candles to the left to align with chart
  const gridLeftOffset = leftOffsetPx - (cellWidth * 2);
  
  console.log('📊 Table alignment:', { 
    leftOffsetPx,
    cellWidth, 
    gridLeftOffset,
    shift: cellWidth * 3,
    visibleDataLength: visibleData.length 
  });

  // Get color based on value
  const getColorForDelta = (value: number): string => {
    if (value > 0) {
      const intensity = Math.min(Math.abs(value) / 50000, 1);
      return `rgba(34, 197, 94, ${0.3 + intensity * 0.5})`;
    } else if (value < 0) {
      const intensity = Math.min(Math.abs(value) / 50000, 1);
      return `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`;
    }
    return 'rgba(100, 100, 100, 0.2)';
  };

  const getColorForRS = (value: number): string => {
    if (value > 10) {
      return 'rgba(34, 197, 94, 0.6)';
    } else if (value < -10) {
      return 'rgba(239, 68, 68, 0.6)';
    }
    return 'rgba(100, 100, 100, 0.3)';
  };

  if (visibleData.length === 0) {
    console.log('No visible data to display');
    return (
      <div 
        className="overflow-hidden bg-gray-900 border-t border-gray-700 flex items-center justify-center"
        style={{ width, height }}
      >
        <p className="text-gray-500 text-sm">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div 
      className="overflow-hidden bg-gray-900 border-t border-gray-700"
      style={{ width, height }}
    >
      <div className="flex h-full">
        {/* Metric Labels Column */}
        <div className="w-24 flex-shrink-0 bg-gray-800 border-r border-gray-700">
          <div className="flex flex-col h-full text-xs font-semibold text-gray-400">
            <div className="flex items-center justify-center border-b border-gray-700" style={{ height: 24 }}>
              Time
            </div>
            <div className="flex items-center px-3 border-b border-gray-700" style={{ height: (height - 24) / 4 }}>
              Volume
            </div>
            <div className="flex items-center px-3 border-b border-gray-700" style={{ height: (height - 24) / 4 }}>
              Delta
            </div>
            <div className="flex items-center px-3 border-b border-gray-700" style={{ height: (height - 24) / 4 }}>
              Rel. Strength
            </div>
            <div className="flex items-center px-3" style={{ height: (height - 24) / 4 }}>
              CVD
            </div>
          </div>
        </div>

        {/* Data Grid with Time Row */}
        <div className="flex-1 overflow-x-hidden">
          <div style={{ marginLeft: gridLeftOffset }}>
            {/* Time Row */}
            <div className="flex border-b border-gray-700" style={{ height: 24 }}>
              {visibleData.map((candle, index) => (
                <div 
                  key={`time-${startIdx + index}`} 
                  className="flex-shrink-0 text-[10px] text-gray-400 font-mono flex items-center justify-center"
                  style={{ width: cellWidth }}
                >
                  {new Date(candle.timestamp).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'UTC'
                  })}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            <div className="flex">
              {visibleData.map((candle, index) => {
                const relativeStrength = candle.volume > 0 
                  ? (candle.delta / candle.volume) * 100 
                  : 0;

                const rowHeight = (height - 24) / 4;
                
                return (
                  <div 
                    key={startIdx + index}
                    className="flex-shrink-0"
                    style={{ width: cellWidth }}
                  >
                    <div className="flex flex-col text-xs">
                      {/* Volume */}
                      <div 
                        className="flex items-center justify-center border-b border-gray-700 px-1"
                        style={{ 
                          height: rowHeight,
                          backgroundColor: 'rgba(59, 130, 246, 0.2)' 
                        }}
                      >
                        <span className="text-blue-300 font-mono text-[10px]">
                          {formatVolume(candle.volume)}
                        </span>
                      </div>

                      {/* Delta */}
                      <div 
                        className="flex items-center justify-center border-b border-gray-700 px-1"
                        style={{ 
                          height: rowHeight,
                          backgroundColor: getColorForDelta(candle.delta) 
                        }}
                      >
                        <span 
                          className={`font-mono text-[10px] ${
                            candle.delta > 0 
                              ? 'text-green-200' 
                              : candle.delta < 0 
                              ? 'text-red-200' 
                              : 'text-gray-400'
                          }`}
                        >
                          {candle.delta > 0 ? '+' : ''}{formatVolume(candle.delta)}
                        </span>
                      </div>

                      {/* Relative Strength */}
                      <div 
                        className="flex items-center justify-center border-b border-gray-700 px-1"
                        style={{ 
                          height: rowHeight,
                          backgroundColor: getColorForRS(relativeStrength) 
                        }}
                      >
                        <span 
                          className={`font-mono text-[10px] ${
                            relativeStrength > 10
                              ? 'text-green-200'
                              : relativeStrength < -10
                              ? 'text-red-200'
                              : 'text-gray-400'
                          }`}
                        >
                          {relativeStrength.toFixed(1)}%
                        </span>
                      </div>

                      {/* CVD */}
                      <div 
                        className="flex items-center justify-center px-1"
                        style={{ 
                          height: rowHeight,
                          backgroundColor: getColorForDelta(candle.cvd || 0) 
                        }}
                      >
                        <span 
                          className={`font-mono text-[10px] ${
                            (candle.cvd || 0) > 0
                              ? 'text-green-200'
                              : (candle.cvd || 0) < 0
                              ? 'text-red-200'
                              : 'text-gray-400'
                          }`}
                        >
                          {formatVolume(candle.cvd || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

