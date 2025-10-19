'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { OrderFlowCandle } from '@/lib/types';

interface FootprintChartD3FCProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  onVisibleRangeChange?: (startIndex: number, endIndex: number, candleWidth: number) => void;
}

export default function FootprintChartD3FC({
  data,
  width,
  height,
  onVisibleRangeChange,
}: FootprintChartD3FCProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#1a1d26';
    ctx.fillRect(0, 0, width, height);

    // Calculate chart area (leave space for axes)
    const margin = { top: 10, right: 60, bottom: 40, left: 10 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create scales
    const xExtent = d3.extent(data, d => new Date(d.timestamp)) as [Date, Date];
    const yMin = d3.min(data, d => d.low) || 0;
    const yMax = d3.max(data, d => d.high) || 0;
    
    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([margin.left, margin.left + chartWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([yMin * 0.999, yMax * 1.001]) // Add small padding
      .range([margin.top + chartHeight, margin.top]);

    // Calculate candle width
    const candleWidth = chartWidth / data.length;
    const candleBodyWidth = Math.max(candleWidth * 0.7, 1);
    const halfBodyWidth = candleBodyWidth / 2;

    console.log('📊 D3 Chart:', data.length, 'candles, width:', candleWidth.toFixed(1), 'px');

    // Draw grid
    ctx.strokeStyle = '#2b2f3a';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const yTicks = yScale.ticks(10);
    yTicks.forEach(tick => {
      const y = yScale(tick);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    });

    // Draw candlesticks
    data.forEach((candle, index) => {
      const x = xScale(new Date(candle.timestamp));
      const openY = yScale(candle.open);
      const closeY = yScale(candle.close);
      const highY = yScale(candle.high);
      const lowY = yScale(candle.low);
      const isUp = candle.close >= candle.open;

      // Draw wick
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1; // Minimum 1px for doji candles
      ctx.fillRect(x - halfBodyWidth, bodyTop, candleBodyWidth, bodyHeight);

      // Draw bid/ask data if candle is wide enough
      if (candleWidth >= 20 && candle.bidAskData && candle.bidAskData.length > 0) {
        const bodyTopPrice = Math.max(candle.open, candle.close);
        const bodyBottomPrice = Math.min(candle.open, candle.close);

        // Calculate font size
        const fontSize = Math.min(Math.max(candleWidth * 0.15, 7), 14);
        ctx.font = `${fontSize}px monospace`;
        const rowHeight = Math.max(fontSize + 4, 10);

        // Filter price levels within candle range
        const sortedLevels = [...candle.bidAskData]
          .filter(level => level.price >= candle.low && level.price <= candle.high)
          .sort((a, b) => b.price - a.price);

        // Sample levels to fit in body
        const maxLevels = Math.floor(bodyHeight / rowHeight);
        const levelsToShow = sortedLevels.length > maxLevels
          ? sortedLevels.filter((_, i) => i % Math.ceil(sortedLevels.length / maxLevels) === 0)
          : sortedLevels;

        levelsToShow.forEach(level => {
          const y = yScale(level.price);
          
          // Check for imbalance
          const bidVol = level.bidVol || 0;
          const askVol = level.askVol || 0;
          const isImbalanceBid = bidVol >= askVol * 3;
          const isImbalanceAsk = askVol >= bidVol * 3;

          // Draw bid volume (left side)
          ctx.textAlign = 'right';
          
          if (isImbalanceBid) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
            ctx.fillRect(x - candleWidth * 0.45, y - rowHeight / 2, candleWidth * 0.4, rowHeight);
          }

          ctx.fillStyle = isImbalanceBid ? '#000' : 'rgba(34, 197, 94, 0.9)';
          const bidText = bidVol > 999 ? `${(bidVol / 1000).toFixed(1)}k` : bidVol.toFixed(0);
          ctx.fillText(bidText, x - candleWidth * 0.05, y + fontSize / 3);

          // Draw ask volume (right side)
          ctx.textAlign = 'left';

          if (isImbalanceAsk) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.fillRect(x + candleWidth * 0.05, y - rowHeight / 2, candleWidth * 0.4, rowHeight);
          }

          ctx.fillStyle = isImbalanceAsk ? '#000' : 'rgba(239, 68, 68, 0.9)';
          const askText = askVol > 999 ? `${(askVol / 1000).toFixed(1)}k` : askVol.toFixed(0);
          ctx.fillText(askText, x + candleWidth * 0.05, y + fontSize / 3);

          // Draw separator line
          if (candleWidth > 50) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y - rowHeight / 2);
            ctx.lineTo(x, y + rowHeight / 2);
            ctx.stroke();
          }
        });
      }
    });

    // Draw price axis
    ctx.fillStyle = '#d1d4dc';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    yTicks.forEach(tick => {
      const y = yScale(tick);
      ctx.fillText(tick.toFixed(2), margin.left + chartWidth + 5, y + 4);
    });

    // Draw time axis
    const xTicks = xScale.ticks(8);
    ctx.textAlign = 'center';
    xTicks.forEach(tick => {
      const x = xScale(tick);
      const timeStr = d3.timeFormat('%H:%M')(tick);
      ctx.fillText(timeStr, x, height - 10);
    });

    console.log('✅ D3 Chart rendered with', data.length, 'candles');

    // Notify parent
    if (onVisibleRangeChange) {
      onVisibleRangeChange(0, data.length, candleWidth);
    }

  }, [data, width, height, onVisibleRangeChange]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#1a1d26',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
        }}
      />
    </div>
  );
}

