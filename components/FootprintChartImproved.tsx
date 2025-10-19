'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeriesOptions } from 'lightweight-charts';
import { OrderFlowCandle } from '@/lib/types';

interface FootprintChartImprovedProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  barsToShow?: number;
  onBarsToShowChange?: (bars: number) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number, candleWidth: number) => void;
}

export default function FootprintChartImproved({
  data,
  width,
  height,
  barsToShow = 30,
  onBarsToShowChange,
  onVisibleRangeChange,
}: FootprintChartImprovedProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const footprintCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    console.log('Creating chart...');
    
    try {
      const chart = createChart(chartContainerRef.current, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: '#1a1d26' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2b2f3a' },
          horzLines: { color: '#2b2f3a' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#2b2f3a',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '#2b2f3a',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      console.log('Chart created:', chart);
      console.log('Available methods:', Object.keys(chart));

      if (typeof chart.addCandlestickSeries !== 'function') {
        console.error('addCandlestickSeries is not available!');
        console.error('Chart type:', typeof chart);
        return;
      }

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: true,
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickVisible: true,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      console.log('Candle series created:', candleSeries);

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
    } catch (error) {
      console.error('Error creating chart:', error);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart size
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ width, height });
    }
  }, [width, height]);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !data.length) return;

    const candleData: CandlestickData[] = data.map(candle => ({
      time: (new Date(candle.timestamp).getTime() / 1000) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeriesRef.current.setData(candleData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Draw footprint overlay
  useEffect(() => {
    if (!footprintCanvasRef.current || !chartRef.current || !data.length) return;

    const canvas = footprintCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !candleSeriesRef.current) return;

    // Set canvas size to match device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get visible range from chart
    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    
    if (!visibleRange) return;

    // Find visible candles
    const visibleCandles = data.filter(candle => {
      const time = new Date(candle.timestamp).getTime() / 1000;
      return time >= visibleRange.from && time <= visibleRange.to;
    });

    if (visibleCandles.length === 0) return;

    // Calculate candle width
    const visibleLogicalRange = timeScale.getVisibleLogicalRange();
    if (!visibleLogicalRange) return;

    const barsInView = visibleLogicalRange.to - visibleLogicalRange.from;
    const candleWidth = width / barsInView;
    const barSpacing = Math.max(candleWidth * 0.8, 40);

    // Helper: Check imbalance
    const isImbalance = (bidVol: number, askVol: number): 'bid' | 'ask' | null => {
      if (bidVol >= askVol * 3) return 'bid';
      if (askVol >= bidVol * 3) return 'ask';
      return null;
    };

    // Draw footprint for each visible candle
    visibleCandles.forEach((candle, idx) => {
      const time = new Date(candle.timestamp).getTime() / 1000;
      const x = timeScale.timeToCoordinate(time as Time);
      
      if (!x || !candleSeriesRef.current) return;

      const priceScale = candleSeriesRef.current.priceScale();
      const bodyTop = priceScale.priceToCoordinate(Math.max(candle.open, candle.close));
      const bodyBottom = priceScale.priceToCoordinate(Math.min(candle.open, candle.close));

      if (!bodyTop || !bodyBottom) return;

      const bodyHeight = Math.abs(bodyBottom - bodyTop);

      // Only draw footprint if candle is wide enough
      if (barSpacing < 40) return;

      // Calculate font size based on bar width
      const fontSize = Math.min(Math.max(barSpacing * 0.12, 8), 12);
      const rowHeight = fontSize + 6;

      // Filter and sample price levels
      const sortedLevels = [...candle.bidAskData]
        .filter(level => level.price >= candle.low && level.price <= candle.high)
        .sort((a, b) => b.price - a.price);

      const maxLevels = Math.floor(bodyHeight / rowHeight);
      const levelsToShow = sortedLevels.length > maxLevels
        ? sortedLevels.filter((_, i) => i % Math.ceil(sortedLevels.length / maxLevels) === 0)
        : sortedLevels;

      // Draw each price level
      levelsToShow.forEach(level => {
        const y = priceScale.priceToCoordinate(level.price);
        if (!y) return;

        // Skip if outside body
        if (y < (bodyTop - 5) || y > (bodyBottom + 5)) return;

        const imbalance = isImbalance(level.bidVol, level.askVol);

        // Draw bid volume (left side)
        ctx.textAlign = 'right';
        ctx.font = `${fontSize}px monospace`;

        if (imbalance === 'bid') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.fillRect(x - barSpacing * 0.4, y - rowHeight / 2, barSpacing * 0.38, rowHeight);
        }

        ctx.fillStyle = imbalance === 'bid' ? '#000' : 'rgba(34, 197, 94, 0.9)';
        const bidText = level.bidVol > 999 ? `${(level.bidVol / 1000).toFixed(1)}k` : level.bidVol.toFixed(0);
        ctx.fillText(bidText, x - barSpacing * 0.02, y + fontSize / 3);

        // Draw ask volume (right side)
        ctx.textAlign = 'left';

        if (imbalance === 'ask') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.fillRect(x + barSpacing * 0.02, y - rowHeight / 2, barSpacing * 0.38, rowHeight);
        }

        ctx.fillStyle = imbalance === 'ask' ? '#000' : 'rgba(239, 68, 68, 0.9)';
        const askText = level.askVol > 999 ? `${(level.askVol / 1000).toFixed(1)}k` : level.askVol.toFixed(0);
        ctx.fillText(askText, x + barSpacing * 0.02, y + fontSize / 3);

        // Draw separator line
        if (barSpacing > 60) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y - rowHeight / 2);
          ctx.lineTo(x, y + rowHeight / 2);
          ctx.stroke();
        }
      });
    });
  }, [data, width, height]);

  // Subscribe to visible range changes
  useEffect(() => {
    if (!chartRef.current) return;

    const timeScale = chartRef.current.timeScale();
    
    const handleVisibleRangeChange = () => {
      const visibleLogicalRange = timeScale.getVisibleLogicalRange();
      if (!visibleLogicalRange || !onVisibleRangeChange) return;

      const startIndex = Math.floor(visibleLogicalRange.from);
      const endIndex = Math.ceil(visibleLogicalRange.to);
      const barsInView = endIndex - startIndex;
      const candleWidth = width / barsInView;

      onVisibleRangeChange(startIndex, endIndex, candleWidth);

      // Redraw footprint overlay
      if (footprintCanvasRef.current) {
        const event = new Event('redraw');
        footprintCanvasRef.current.dispatchEvent(event);
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [width, onVisibleRangeChange]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      <canvas
        ref={footprintCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

