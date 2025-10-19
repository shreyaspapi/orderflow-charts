'use client';

import React, { useEffect, useRef, useState } from 'react';
import { OrderFlowCandle } from '@/lib/types';
import { formatVolume } from '@/lib/utils';

interface FootprintChartSimpleProps {
  data: OrderFlowCandle[];
  width: number;
  height: number;
  barsToShow?: number;
  onBarsToShowChange?: (bars: number) => void;
  onVisibleRangeChange?: (
    startIndex: number,
    endIndex: number,
    candleWidth: number,
    leftOffsetPx: number
  ) => void;
}

interface ChartInstance {
  chart: IChartApi;
  candleSeries: ISeriesApi<'Candlestick'>;
  data: OrderFlowCandle[];
  overlayCleanup?: () => void;
  hasInitialized?: boolean;
}

interface IChartApi {
  chartElement(): HTMLElement;
  timeScale(): ITimeScaleApi;
  remove(): void;
  applyOptions(options: unknown): void;
  addSeries(type: unknown, options: unknown): ISeriesApi<'Candlestick'>;
  resize(width: number, height: number): void;
}

type Time = number | string;

interface ITimeScaleApi {
  getVisibleRange(): { from: Time; to: Time } | null;
  getVisibleLogicalRange(): { from: number; to: number } | null;
  width(): number;
  timeToCoordinate(time: Time): number | null;
  subscribeVisibleLogicalRangeChange(callback: () => void): () => void;
  fitContent(): void;
}

interface ISeriesApi<T> {
  setData(data: unknown[]): void;
  priceToCoordinate(price: number): number | null;
  update(data: unknown): void;
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
  const chartInstanceRef = useRef<ChartInstance | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

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
          upColor: 'rgba(34, 197, 94, 0.2)',  // Semi-transparent green
          downColor: 'rgba(239, 68, 68, 0.2)', // Semi-transparent red
          borderVisible: true,
          borderUpColor: 'rgba(34, 197, 94, 0.4)',
          borderDownColor: 'rgba(239, 68, 68, 0.4)',
          wickVisible: true,
          wickUpColor: 'rgba(34, 197, 94, 0.3)',
          wickDownColor: 'rgba(239, 68, 68, 0.3)',
        });

        // Store everything first (we need this ref for the overlay)
        chartInstanceRef.current = { 
          chart: chart as unknown as IChartApi, 
          candleSeries: candleSeries as unknown as ISeriesApi<'Candlestick'>,
          data: [] // Track current data
        };

        // Create footprint overlay canvas and get cleanup function (pass the ref)
        const overlayCleanup = createFootprintOverlay(chart as unknown as IChartApi, candleSeries as unknown as ISeriesApi<'Candlestick'>, chartInstanceRef.current, onVisibleRangeChange);
        
        // Add cleanup function to the ref
        chartInstanceRef.current.overlayCleanup = overlayCleanup;

        console.log('✅ Chart instance stored in ref, ready for data');
        
        // Notify that chart is ready
        setIsChartReady(true);

      } catch (error) {
        console.error('Error loading chart:', error);
      }
    };

    loadChart();

    // Cleanup function
    return () => {
      isMounted = false;
      setIsChartReady(false);
      
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
    if (!data.length) {
      console.log('⚠️ No data to display');
      return;
    }

    if (!chartInstanceRef.current?.candleSeries) {
      console.log('⚠️ Chart not ready yet, will update when chart is created. Data ready:', data.length, 'candles');
      return;
    }

    console.log('📊 Updating chart data:', data.length, 'candles');
    console.log('📊 First candle data:', data[0]);

    // Convert data to chart format and remove duplicates
    const timeMap = new Map();
    
    // Process candles and keep only the latest data for each timestamp
    data.forEach(candle => {
      const time = Math.floor(new Date(candle.timestamp).getTime() / 1000);
      timeMap.set(time, {
        time: time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    });

    // Convert map to array and sort by time (ascending order)
    const chartData = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);

    console.log('📊 Unique candles after deduplication:', chartData.length);

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
  }, [data, isChartReady]); // Also trigger when chart becomes ready

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
  chart: IChartApi, 
  candleSeries: ISeriesApi<'Candlestick'>, 
  dataRef: ChartInstance, // Reference to get current data
  onVisibleRangeChange?: (startIndex: number, endIndex: number, candleWidth: number, leftOffsetPx: number) => void
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
    const visibleCandles = data.filter((candle: OrderFlowCandle) => {
      const time = Math.floor(new Date(candle.timestamp).getTime() / 1000);
      return time >= (visibleRange.from as number) && time <= (visibleRange.to as number);
    });

    if (visibleCandles.length === 0) return;

    // Note: In v5, use series.priceToCoordinate() directly

    // Calculate visible bars
    const visibleLogicalRange = timeScale.getVisibleLogicalRange();
    if (!visibleLogicalRange) return;

    const barsInView = visibleLogicalRange.to - visibleLogicalRange.from;
    
    // Get the actual time scale width (excludes price scale on right)
    const timeScaleWidth = timeScale.width();
    const candleWidth = timeScaleWidth / barsInView;
    
    console.log('📊 Bars in view:', barsInView, 'Time scale width:', timeScaleWidth, 'Candle width:', candleWidth.toFixed(1), 'px', 'Visible candles:', visibleCandles.length);

    // Notify parent of visible range for statistics panel sync
    if (onVisibleRangeChange && visibleCandles.length > 0) {
      // Find the actual indices of the first and last visible candles
      const firstVisibleTime = Math.floor(new Date(visibleCandles[0].timestamp).getTime() / 1000);
      const lastVisibleTime = Math.floor(new Date(visibleCandles[visibleCandles.length - 1].timestamp).getTime() / 1000);
      
      const startIndex = data.findIndex((c: OrderFlowCandle) => Math.floor(new Date(c.timestamp).getTime() / 1000) === firstVisibleTime);
      const endIndex = data.findIndex((c: OrderFlowCandle) => Math.floor(new Date(c.timestamp).getTime() / 1000) === lastVisibleTime);
      
      if (startIndex >= 0 && endIndex >= 0) {
        // For now, use 0 offset and just ensure the table shows the same candles
        // The table will render all visible candles starting from the left
        const leftOffsetPx = 0;
        
        console.log('🎯 Chart visible range:', {
          visibleCandlesCount: visibleCandles.length,
          startIndex,
          endIndex,
          candleWidth,
          leftOffsetPx,
          firstTime: new Date(visibleCandles[0].timestamp).toLocaleTimeString(),
          lastTime: new Date(visibleCandles[visibleCandles.length - 1].timestamp).toLocaleTimeString()
        });
        
        onVisibleRangeChange(startIndex, endIndex + 1, candleWidth, leftOffsetPx);
      }
    }

    // Draw footprint for each visible candle
    let candlesWithFootprint = 0;
    visibleCandles.forEach((candle: OrderFlowCandle, idx: number) => {
      const time = Math.floor(new Date(candle.timestamp).getTime() / 1000);
      const x = timeScale.timeToCoordinate(time);

      if (!x) return;

      // Use the full candle range (high to low), not just the body
      const candleTop = candleSeries.priceToCoordinate(candle.high);
      const candleBottom = candleSeries.priceToCoordinate(candle.low);

      if (!candleTop || !candleBottom) return;

      const fullCandleHeight = Math.abs(candleBottom - candleTop);

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
        console.log('✅ Drawing footprint! Candle width:', candleWidth.toFixed(1), 'px, full height:', fullCandleHeight.toFixed(1), 'px');
      }

      // Calculate font size based on candle width (more flexible for smaller candles)
      const fontSize = Math.min(Math.max(candleWidth * 0.15, 7), 14);
      const rowHeight = Math.max(fontSize + 4, 10);

      // Filter and sort price levels across the full candle range
      const sortedLevels = [...candle.bidAskData]
        .filter(level => level.price >= candle.low && level.price <= candle.high)
        .sort((a, b) => b.price - a.price);

      // Calculate how many levels can fit in the full candle height
      const maxLevels = Math.floor(fullCandleHeight / rowHeight);
      
      // Aggregate levels when we have more data than can fit
      let levelsToShow;
      if (sortedLevels.length > maxLevels && maxLevels > 0) {
        levelsToShow = [];
        const bucketSize = Math.ceil(sortedLevels.length / maxLevels);
        
        for (let i = 0; i < sortedLevels.length; i += bucketSize) {
          const bucket = sortedLevels.slice(i, i + bucketSize);
          
          // Aggregate volumes from all levels in this bucket
          const aggregatedBidVol = bucket.reduce((sum, level) => sum + level.bidVol, 0);
          const aggregatedAskVol = bucket.reduce((sum, level) => sum + level.askVol, 0);
          
          // Use the middle price of the bucket
          const middleIndex = Math.floor(bucket.length / 2);
          const representativePrice = bucket[middleIndex].price;
          
          levelsToShow.push({
            price: representativePrice,
            bidVol: aggregatedBidVol,
            askVol: aggregatedAskVol
          });
        }
      } else {
        levelsToShow = sortedLevels;
      }

      // Draw each price level
      console.log('Drawing', levelsToShow.length, 'levels for candle at x:', x, 'candle width:', candleWidth);
      
      levelsToShow.forEach(level => {
        const y = candleSeries.priceToCoordinate(level.price);
        if (!y) return;

        // Skip if outside the full candle range (with small buffer)
        if (y < (candleTop - 5) || y > (candleBottom + 5)) return;

        const imbalance = isImbalance(level.bidVol, level.askVol);

        // Draw bid volume (left side)
        ctx.textAlign = 'right';
        ctx.font = `${fontSize}px monospace`;

        if (imbalance === 'bid') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
          ctx.fillRect(x - candleWidth * 0.4, y - rowHeight / 2, candleWidth * 0.38, rowHeight);
        }

        ctx.fillStyle = imbalance === 'bid' ? '#000' : 'rgba(34, 197, 94, 1)';
        const bidText = formatVolume(level.bidVol);
        ctx.fillText(bidText, x - candleWidth * 0.02, y + fontSize / 3);

        // Draw ask volume (right side)
        ctx.textAlign = 'left';

        if (imbalance === 'ask') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.fillRect(x + candleWidth * 0.02, y - rowHeight / 2, candleWidth * 0.38, rowHeight);
        }

        ctx.fillStyle = imbalance === 'ask' ? '#000' : 'rgba(239, 68, 68, 1)';
        const askText = formatVolume(level.askVol);
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

