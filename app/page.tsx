'use client';

import { useState, useEffect, useRef } from 'react';
import FootprintChartSimple from '@/components/FootprintChartSimple';
import FootprintBarStatistics from '@/components/FootprintBarStatistics';
import TimeframeSelector from '@/components/TimeframeSelector';
import { MockDataGenerator } from '@/lib/mockDataGenerator';
import { BybitConnector } from '@/lib/bybitConnector';
import { OrderFlowCandle, Timeframe } from '@/lib/types';

export default function Home() {
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [data, setData] = useState<OrderFlowCandle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(true); // Toggle between live and mock data
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [visibleRange, setVisibleRange] = useState({ 
    startIndex: 0, 
    endIndex: 100, // Initialize with full data range
    candleWidth: 80,
    leftOffsetPx: 0
  });
  const [barsToShow, setBarsToShow] = useState(15); // Default: show 15 bars for wider candles

  // Initialize data sources
  const mockDataGenerator = new MockDataGenerator();
  const bybitConnector = useRef<BybitConnector | null>(null);

  // Load data when timeframe changes or data source toggles
  useEffect(() => {
    setIsLoading(true);
    setConnectionStatus('connecting');

    // Clean up previous WebSocket connection if exists
    if (bybitConnector.current) {
      bybitConnector.current.disconnect();
    }

    const loadData = async () => {
      try {
        if (isLiveData) {
          // Initialize Bybit connector
          console.log('🚀 Initializing Bybit connector for BTCUSD');
          bybitConnector.current = new BybitConnector('BTCUSD');
          
          // Fetch historical data
          console.log('📡 Fetching historical data for timeframe:', timeframe);
          const historicalData = await bybitConnector.current.fetchHistoricalData(timeframe, 100);
          console.log('✅ Received historical data:', historicalData.length, 'candles');
          console.log('📊 Sample candle:', historicalData[0]);
          
          setData(historicalData);
          setIsLoading(false);
          setConnectionStatus('connected');

          // Subscribe to real-time updates
          bybitConnector.current.subscribeRealtime(
            timeframe,
            (updatedCandle) => {
              setData(prevData => {
                const newData = [...prevData];
                
                // Find if this timestamp already exists
                const existingIndex = newData.findIndex(c => c.timestamp === updatedCandle.timestamp);
                
                if (existingIndex >= 0) {
                  // Update existing candle
                  newData[existingIndex] = updatedCandle;
                } else {
                  // Add new candle
                  newData.push(updatedCandle);
                  // Keep only last 200 candles
                  if (newData.length > 200) {
                    newData.shift();
                  }
                }
                
                // Sort by timestamp to ensure order
                return newData.sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              });
            },
            historicalData[historicalData.length - 1]
          );
        } else {
          // Use mock data
          const historicalData = mockDataGenerator.generateHistoricalData(timeframe, 100);
          setData(historicalData);
          setIsLoading(false);
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        setConnectionStatus('error');
        
        // Fall back to mock data on error
        console.log('⚠️ Falling back to mock data');
        const historicalData = mockDataGenerator.generateHistoricalData(timeframe, 100);
        setData(historicalData);
        setIsLoading(false);
      }
    };

    loadData();

    // Cleanup on unmount
    return () => {
      if (bybitConnector.current) {
        bybitConnector.current.disconnect();
      }
    };
  }, [timeframe, isLiveData]);

  // Chart dimensions - dynamically calculate based on viewport
  const [dimensions, setDimensions] = useState({
    chartHeight: 600,
    statsHeight: 200,
    chartWidth: 1200
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        // Calculate available height: viewport - padding - header
        const headerHeight = 50; // Compact header height
        const padding = 40; // Top and bottom padding
        const availableHeight = window.innerHeight - headerHeight - padding;
        
        // 70% for chart, 30% for stats
        const chartHeight = Math.floor(availableHeight * 0.7);
        const statsHeight = Math.floor(availableHeight * 0.3);
        const chartWidth = window.innerWidth - 40;
        
        setDimensions({ chartHeight, statsHeight, chartWidth });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { chartHeight, statsHeight, chartWidth } = dimensions;

  return (
    <div className="h-screen bg-gray-950 text-white p-5 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
            <button
              onClick={() => setIsLiveData(!isLiveData)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${isLiveData
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {isLiveData ? '🔴 Live' : '📊 Mock'}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Market</div>
              <div className="text-xs font-mono">BTC/USD Perp</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Source</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <div className="text-xs font-mono">{isLiveData ? 'Bybit Live' : 'Mock'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Bars</div>
              <div className="text-xs font-mono">{data.length}</div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded"></div>
                <span className="text-gray-400">Bid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded"></div>
                <span className="text-gray-400">Ask</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chart Area */}
      <main className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden shadow-2xl flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading {timeframe} data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Footprint Chart */}
            <div className="border-b border-gray-800" style={{ height: chartHeight }}>
              <FootprintChartSimple
                data={data}
                width={chartWidth}
                height={chartHeight}
                barsToShow={barsToShow}
                onBarsToShowChange={setBarsToShow}
                onVisibleRangeChange={(start, end, candleW, leftPx) => 
                  setVisibleRange({ startIndex: start, endIndex: end, candleWidth: candleW, leftOffsetPx: leftPx })
                }
              />
            </div>

            {/* Bar Statistics Panel */}
            <div style={{ height: statsHeight }}>
              <FootprintBarStatistics
                data={data}
                width={chartWidth}
                height={statsHeight}
                visibleStartIndex={visibleRange.startIndex}
                visibleEndIndex={visibleRange.endIndex}
                candleWidth={visibleRange.candleWidth}
                leftOffsetPx={visibleRange.leftOffsetPx}
              />
            </div>
          </>
        )}
      </main>

    </div>
  );
}
