'use client';

import React, { useEffect, useRef } from 'react';
import { OrderFlowCandle } from '@/lib/types';

interface FootprintChartSimpleProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  barsToShow?: number;
  onBarsToShowChange?: (bars: number) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number, candleWidth: number) => void;
}

export default function FootprintChartSimple({
  data,
  width,
  height,
  barsToShow = 30,
  onBarsToShowChange,
  onVisibleRangeChange,
}: FootprintChartSimpleProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Create chart only once on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;

    const loadChart = async () => {
      try {
        // Dynamically import lightweight-charts
        const LightweightCharts = await import('lightweight-charts');
        
        if (!isMounted || !chartContainerRef.current) return;
        
        console.log('🚀 Creating new chart instance');

        // Clear any existing content in the container
        chartContainerRef.current.innerHTML = '';

        // Create chart using the imported module
        const chart = LightweightCharts.createChart(chartContainerRef.current, {
          width,
          height,
          layout: {
            background: { type: LightweightCharts.ColorType.Solid, color: '#1a1d26' },
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { color: '#2b2f3a' },
            horzLines: { color: '#2b2f3a' },
          },
          rightPriceScale: {
            borderColor: '#2b2f3a',
          },
          timeScale: {
            borderColor: '#2b2f3a',
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 5,
            barSpacing: 10,
            fixLeftEdge: false,
            fixRightEdge: false,
          },
        });

        console.log('✅ Chart created successfully');

        // Add candlestick series (v5 API uses addSeries with series type)
        const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: true,
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickVisible: true,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });

        // Store everything first (we need this ref for the overlay)
        chartInstanceRef.current = { 
          chart, 
          candleSeries,
          data: [] // Track current data
        };

        // Create footprint overlay canvas and get cleanup function (pass the ref)
        const overlayCleanup = createFootprintOverlay(chart, candleSeries, chartInstanceRef.current, onVisibleRangeChange);
        
        // Add cleanup function to the ref
        chartInstanceRef.current.overlayCleanup = overlayCleanup;

      } catch (error) {
        console.error('Error loading chart:', error);
      }
    };

    loadChart();

    // Cleanup function
    return () => {
      isMounted = false;
      
      if (chartInstanceRef.current) {
        // Clean up overlay first
        if (chartInstanceRef.current.overlayCleanup) {
          chartInstanceRef.current.overlayCleanup();
        }
        
        // Then remove the chart
        if (chartInstanceRef.current.chart) {
          chartInstanceRef.current.chart.remove();
        }
        
        chartInstanceRef.current = null;
      }
    };
  }, []); // Only create once on mount

  // Update chart data when data changes (without recreating chart)
  useEffect(() => {
    if (!chartInstanceRef.current?.candleSeries || !data.length) return;

    console.log('📊 Updating chart data:', data.length, 'candles');

    // Convert data to chart format (ensure ascending order by time)
    const chartData = data
      .map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as any,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
      .sort((a, b) => a.time - b.time); // Sort by time in ascending order

    // Update the series data without recreating the chart
    chartInstanceRef.current.candleSeries.setData(chartData);
    
    // Store the current data for the overlay
    chartInstanceRef.current.data = data;
    
    // Only fit content on first load
    if (!chartInstanceRef.current.hasInitialized) {
      chartInstanceRef.current.chart.timeScale().fitContent();
      chartInstanceRef.current.hasInitialized = true;
      console.log('🎯 Chart initialized with data');
    } else {
      console.log('🔄 Data updated, overlay will refresh on next draw');
    }
  }, [data]);

  // Handle resize separately without recreating the chart
  useEffect(() => {
    if (!chartInstanceRef.current?.chart) return;

    console.log('Resizing chart to:', width, 'x', height);
    chartInstanceRef.current.chart.resize(width, height);
  }, [width, height]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
}

// Helper function to detect imbalance (3x threshold)
function isImbalance(bidVol: number, askVol: number): 'bid' | 'ask' | null {
  if (bidVol >= askVol * 3) return 'bid';
  if (askVol >= bidVol * 3) return 'ask';
  return null;
}

// Create footprint overlay on the chart
function createFootprintOverlay(
  chart: any, 
  candleSeries: any, 
  dataRef: any, // Reference to get current data
  onVisibleRangeChange?: (startIndex: number, endIndex: number, candleWidth: number) => void
): () => void {
  // Create overlay canvas
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.style.position = 'absolute';
  overlayCanvas.style.top = '0';
  overlayCanvas.style.left = '0';
  overlayCanvas.style.pointerEvents = 'none';
  overlayCanvas.style.zIndex = '1'; // Ensure overlay is above chart

  const chartContainer = chart.chartElement();
  chartContainer.style.position = 'relative';
  chartContainer.appendChild(overlayCanvas);
  
  console.log('🎨 Footprint overlay canvas created');

  function updateOverlay() {
    if (!overlayCanvas || !chart) return;
    
    // Get current data from the ref
    const data = dataRef.data || [];
    if (data.length === 0) return;

    // Set canvas size to match chart with device pixel ratio
    const chartRect = chartContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    overlayCanvas.width = chartRect.width * dpr;
    overlayCanvas.height = chartRect.height * dpr;
    overlayCanvas.style.width = chartRect.width + 'px';
    overlayCanvas.style.height = chartRect.height + 'px';

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, chartRect.width, chartRect.height);
    
    console.log('Updating overlay, canvas size:', chartRect.width, 'x', chartRect.height);

    // Get visible range
    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (!visibleRange) return;

    // Find visible candles
    const visibleCandles = data.filter(candle => {
      const time = Math.floor(new Date(candle.timestamp).getTime() / 1000);
      return time >= visibleRange.from && time <= visibleRange.to;
    });

    if (visibleCandles.length === 0) return;

    // Note: In v5, use series.priceToCoordinate() directly

    // Calculate visible bars
    const visibleLogicalRange = timeScale.getVisibleLogicalRange();
    if (!visibleLogicalRange) return;

    const barsInView = visibleLogicalRange.to - visibleLogicalRange.from;
    const candleWidth = chartContainer.getBoundingClientRect().width / barsInView;
    
    console.log('📊 Bars in view:', barsInView, 'Candle width:', candleWidth.toFixed(1), 'px', 'Visible candles:', visibleCandles.length);

    // Notify parent of visible range for statistics panel sync
    if (onVisibleRangeChange) {
      const startIndex = Math.max(0, Math.floor(visibleLogicalRange.from));
      const endIndex = Math.min(data.length, Math.ceil(visibleLogicalRange.to));
      onVisibleRangeChange(startIndex, endIndex, candleWidth);
    }

    // Draw footprint for each visible candle
    let candlesWithFootprint = 0;
    visibleCandles.forEach((candle, idx) => {
      const time = Math.floor(new Date(candle.timestamp).getTime() / 1000);
      const x = timeScale.timeToCoordinate(time);

      if (!x) return;

      const bodyTop = candleSeries.priceToCoordinate(Math.max(candle.open, candle.close));
      const bodyBottom = candleSeries.priceToCoordinate(Math.min(candle.open, candle.close));

      if (!bodyTop || !bodyBottom) return;

      const bodyHeight = Math.abs(bodyBottom - bodyTop);

      // Only draw footprint if candle is wide enough
      if (candleWidth < 15) {
        return; // Too narrow to display any text
      }
      
      // Check if we have bid/ask data
      if (!candle.bidAskData || candle.bidAskData.length === 0) {
        console.log('⚠️ No bid/ask data for candle at x:', x);
        return;
      }

      candlesWithFootprint++;
      if (candlesWithFootprint === 1) {
        console.log('✅ Drawing footprint! Candle width:', candleWidth.toFixed(1), 'px, height:', bodyHeight.toFixed(1), 'px');
      }

      // Calculate font size based on candle width (more flexible for smaller candles)
      const fontSize = Math.min(Math.max(candleWidth * 0.15, 7), 14);
      const rowHeight = Math.max(fontSize + 4, 10);

      // Filter and sample price levels
      const sortedLevels = [...candle.bidAskData]
        .filter(level => level.price >= candle.low && level.price <= candle.high)
        .sort((a, b) => b.price - a.price);

      const maxLevels = Math.floor(bodyHeight / rowHeight);
      const levelsToShow = sortedLevels.length > maxLevels
        ? sortedLevels.filter((_, i) => i % Math.ceil(sortedLevels.length / maxLevels) === 0)
        : sortedLevels;

      // Draw each price level
      console.log('Drawing', levelsToShow.length, 'levels for candle at x:', x, 'candle width:', candleWidth);
      
      levelsToShow.forEach(level => {
        const y = candleSeries.priceToCoordinate(level.price);
        if (!y) return;

        // Skip if outside body
        if (y < (bodyTop - 5) || y > (bodyBottom + 5)) return;

        const imbalance = isImbalance(level.bidVol, level.askVol);

        // Draw bid volume (left side)
        ctx.textAlign = 'right';
        ctx.font = `${fontSize}px monospace`;

        if (imbalance === 'bid') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.fillRect(x - candleWidth * 0.4, y - rowHeight / 2, candleWidth * 0.38, rowHeight);
        }

        ctx.fillStyle = imbalance === 'bid' ? '#000' : 'rgba(34, 197, 94, 0.9)';
        const bidText = level.bidVol > 999 ? `${(level.bidVol / 1000).toFixed(1)}k` : level.bidVol.toFixed(0);
        ctx.fillText(bidText, x - candleWidth * 0.02, y + fontSize / 3);

        // Draw ask volume (right side)
        ctx.textAlign = 'left';

        if (imbalance === 'ask') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.fillRect(x + candleWidth * 0.02, y - rowHeight / 2, candleWidth * 0.38, rowHeight);
        }

        ctx.fillStyle = imbalance === 'ask' ? '#000' : 'rgba(239, 68, 68, 0.9)';
        const askText = level.askVol > 999 ? `${(level.askVol / 1000).toFixed(1)}k` : level.askVol.toFixed(0);
        ctx.fillText(askText, x + candleWidth * 0.02, y + fontSize / 3);

        // Draw separator line
        if (candleWidth > 80) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y - rowHeight / 2);
          ctx.lineTo(x, y + rowHeight / 2);
          ctx.stroke();
        }
      });
    });
    
    if (candlesWithFootprint > 0) {
      console.log('🎨 Drew footprint on', candlesWithFootprint, 'candles');
    }
  }

  // Subscribe to chart updates
  const unsubscribe = chart.timeScale().subscribeVisibleLogicalRangeChange(updateOverlay);
  updateOverlay();

  // Return cleanup function
  return () => {
    console.log('Cleaning up footprint overlay');
    
    // Unsubscribe from chart updates
    if (unsubscribe) {
      unsubscribe();
    }
    
    // Remove overlay canvas
    if (overlayCanvas && overlayCanvas.parentNode) {
      overlayCanvas.parentNode.removeChild(overlayCanvas);
    }
  };
}

