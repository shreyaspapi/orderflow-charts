'use client';

import React, { useRef, useEffect, useState } from 'react';
import { OrderFlowCandle } from '@/lib/types';

interface FootprintChartProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  onCandleHover?: (candle: OrderFlowCandle | null) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number, candleWidth: number) => void;
  barsToShow?: number;
  onBarsToShowChange?: (bars: number) => void;
}

export default function FootprintChart({
  data,
  width,
  height,
  onCandleHover,
  onVisibleRangeChange,
  barsToShow: externalBarsToShow,
  onBarsToShowChange,
}: FootprintChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalBarsToShow, setInternalBarsToShow] = useState(30);
  
  // Use external barsToShow if provided, otherwise use internal state
  const barsToShow = externalBarsToShow ?? internalBarsToShow;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range
    const allPrices = data.flatMap(candle => [candle.high, candle.low]);
    const maxPrice = Math.max(...allPrices);
    const minPrice = Math.min(...allPrices);
    const priceRange = maxPrice - minPrice;

    // Calculate dimensions
    const padding = { top: 20, right: 80, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate candle width based on barsToShow (controlled by zoom)
    const visibleCandles = Math.min(barsToShow, data.length);
    const candleWidth = chartWidth / visibleCandles;
    const candleSpacing = 4;
    const candleBodyWidth = candleWidth - candleSpacing;

    // Calculate start index based on pan
    const startIndex = Math.max(0, Math.floor(pan));
    const endIndex = Math.min(data.length, startIndex + visibleCandles);

    // Notify parent of visible range change
    if (onVisibleRangeChange) {
      onVisibleRangeChange(startIndex, endIndex, candleWidth);
    }

    // Helper function: price to Y coordinate
    const priceToY = (price: number): number => {
      return padding.top + chartHeight * (1 - (price - minPrice) / priceRange);
    };

    // Helper function: detect imbalance (3x threshold)
    const isImbalance = (bidVol: number, askVol: number): 'bid' | 'ask' | null => {
      if (bidVol >= askVol * 3) return 'bid';
      if (askVol >= bidVol * 3) return 'ask';
      return null;
    };

    // Draw each visible candle
    for (let i = startIndex; i < endIndex; i++) {
      const candle = data[i];
      const x = padding.left + (i - startIndex) * candleWidth;

      // Draw candle body background
      const bodyTop = priceToY(Math.max(candle.open, candle.close));
      const bodyBottom = priceToY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

      // Candle color
      const isGreen = candle.close >= candle.open;
      ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(x, bodyTop, candleBodyWidth, bodyHeight);

      // Draw wick
      ctx.strokeStyle = isGreen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const wickX = x + candleBodyWidth / 2;
      ctx.moveTo(wickX, priceToY(candle.high));
      ctx.lineTo(wickX, priceToY(candle.low));
      ctx.stroke();

      // Draw footprint data (bid/ask volumes at each price level)
      if (candleBodyWidth > 40) { // Show footprint if wide enough
        const sortedLevels = [...candle.bidAskData].sort((a, b) => b.price - a.price);
        
        // Calculate dynamic font size and row height based on candle width
        const baseFontSize = Math.min(Math.max(candleBodyWidth * 0.15, 8), 14);
        const rowHeight = Math.max(baseFontSize + 4, 12);
        
        // Calculate how many levels can fit in the candle
        const availableHeight = bodyHeight;
        const maxLevels = Math.floor(availableHeight / rowHeight);
        
        // Filter levels that are within the candle's price range
        const relevantLevels = sortedLevels.filter(level => 
          level.price >= candle.low && level.price <= candle.high
        );
        
        // Sample levels if there are too many
        const levelsToShow = relevantLevels.length > maxLevels
          ? relevantLevels.filter((_, idx) => idx % Math.ceil(relevantLevels.length / maxLevels) === 0)
          : relevantLevels;
        
        levelsToShow.forEach(level => {
          const levelY = priceToY(level.price);
          
          // Skip if outside candle body
          if (levelY < bodyTop - 5 || levelY > bodyBottom + 5) return;

          const imbalance = isImbalance(level.bidVol, level.askVol);
          
          // Calculate text size for current candle width
          const fontSize = baseFontSize;
          const cellHeight = rowHeight;
          
          // Draw bid volume (left side)
          ctx.textAlign = 'right';
          ctx.font = `${fontSize}px monospace`;
          
          if (imbalance === 'bid') {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
            ctx.fillRect(x + 2, levelY - cellHeight/2, candleBodyWidth * 0.45, cellHeight);
          }
          
          ctx.fillStyle = imbalance === 'bid' ? '#000' : 'rgba(34, 197, 94, 0.9)';
          const bidText = level.bidVol > 999 
            ? `${(level.bidVol / 1000).toFixed(1)}k` 
            : level.bidVol.toString();
          ctx.fillText(
            bidText,
            x + candleBodyWidth * 0.47,
            levelY + fontSize/3
          );

          // Draw ask volume (right side)
          ctx.textAlign = 'left';
          
          if (imbalance === 'ask') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.fillRect(x + candleBodyWidth * 0.53, levelY - cellHeight/2, candleBodyWidth * 0.45, cellHeight);
          }
          
          ctx.fillStyle = imbalance === 'ask' ? '#000' : 'rgba(239, 68, 68, 0.9)';
          const askText = level.askVol > 999 
            ? `${(level.askVol / 1000).toFixed(1)}k` 
            : level.askVol.toString();
          ctx.fillText(
            askText,
            x + candleBodyWidth * 0.53,
            levelY + fontSize/3
          );
          
          // Draw separator line between bid and ask
          if (candleBodyWidth > 80) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + candleBodyWidth * 0.5, levelY - cellHeight/2);
            ctx.lineTo(x + candleBodyWidth * 0.5, levelY + cellHeight/2);
            ctx.stroke();
          }
        });
      }

      // Draw price labels on the right
      if (i === endIndex - 1) {
        ctx.textAlign = 'left';
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        // Draw high/low/close prices
        ctx.fillText(candle.high.toLocaleString(), width - padding.right + 5, priceToY(candle.high) + 4);
        ctx.fillText(candle.low.toLocaleString(), width - padding.right + 5, priceToY(candle.low) + 4);
        ctx.fillText(candle.close.toLocaleString(), width - padding.right + 5, priceToY(candle.close) + 4);
      }
    }

    // Draw price axis lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const price = minPrice + (priceRange / priceSteps) * i;
      const y = priceToY(price);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw timestamp labels
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    
    const labelStep = Math.max(1, Math.floor(visibleCandles / 10));
    for (let i = startIndex; i < endIndex; i += labelStep) {
      const candle = data[i];
      const x = padding.left + (i - startIndex) * candleWidth + candleBodyWidth / 2;
      const date = new Date(candle.timestamp);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillText(timeStr, x, height - 10);
    }

  }, [data, width, height, barsToShow, pan]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 2 : -2; // Zoom in/out by 2 bars at a time
    const newBarsToShow = Math.max(10, Math.min(data.length, barsToShow + delta));
    
    if (onBarsToShowChange) {
      onBarsToShowChange(newBarsToShow);
    } else {
      setInternalBarsToShow(newBarsToShow);
    }
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const pixelsPerBar = width / barsToShow;
    const barsDelta = deltaX / pixelsPerBar;
    
    setPan(prev => Math.max(0, Math.min(data.length - barsToShow, prev - barsDelta)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'block',
      }}
    />
  );
}

