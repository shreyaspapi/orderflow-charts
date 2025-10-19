'use client';

import React from 'react';
import { OrderFlowCandle } from '@/lib/types';

interface FootprintBarStatisticsProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  visibleStartIndex?: number;
  visibleEndIndex?: number;
  candleWidth?: number;
}

export default function FootprintBarStatistics({
  data,
  width,
  height,
  visibleStartIndex = 0,
  visibleEndIndex,
  candleWidth = 0,
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
  const padding = { left: 10, right: 80 };

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

  // Format numbers
  const formatNumber = (num: number): string => {
    if (Math.abs(num) > 999) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
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
      <div className="flex flex-col h-full">
        {/* Metric Labels Column */}
        <div className="flex">
          <div className="w-24 flex-shrink-0 bg-gray-800 border-r border-gray-700">
            <div className="flex flex-col h-full text-xs font-semibold text-gray-400">
              <div className="flex items-center px-3 border-b border-gray-700" style={{ height: height / 4 }}>
                Volume
              </div>
              <div className="flex items-center px-3 border-b border-gray-700" style={{ height: height / 4 }}>
                Delta
              </div>
              <div className="flex items-center px-3 border-b border-gray-700" style={{ height: height / 4 }}>
                Rel. Strength
              </div>
              <div className="flex items-center px-3" style={{ height: height / 4 }}>
                CVD
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex" style={{ marginLeft: padding.left }}>
              {visibleData.map((candle, index) => {
                const relativeStrength = candle.volume > 0 
                  ? (candle.delta / candle.volume) * 100 
                  : 0;

                return (
                  <div 
                    key={startIdx + index}
                    className="flex-shrink-0 border-r border-gray-700"
                    style={{ width: cellWidth - 4 }}
                  >
                    <div className="flex flex-col text-xs">
                      {/* Volume */}
                      <div 
                        className="flex items-center justify-center border-b border-gray-700 px-1"
                        style={{ 
                          height: height / 4,
                          backgroundColor: 'rgba(59, 130, 246, 0.2)' 
                        }}
                      >
                        <span className="text-blue-300 font-mono text-[10px]">
                          {formatNumber(candle.volume)}
                        </span>
                      </div>

                      {/* Delta */}
                      <div 
                        className="flex items-center justify-center border-b border-gray-700 px-1"
                        style={{ 
                          height: height / 4,
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
                          {candle.delta > 0 ? '+' : ''}{formatNumber(candle.delta)}
                        </span>
                      </div>

                      {/* Relative Strength */}
                      <div 
                        className="flex items-center justify-center border-b border-gray-700 px-1"
                        style={{ 
                          height: height / 4,
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
                          height: height / 4,
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
                          {formatNumber(candle.cvd || 0)}
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

