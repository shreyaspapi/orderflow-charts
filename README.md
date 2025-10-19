# Order Flow Platform

A professional-grade order flow analysis platform built with Next.js, featuring footprint charts with bid/ask imbalance visualization.

![Order Flow Platform](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38bdf8)

## 🚀 Features

### ✅ Core Features Implemented

- **Footprint Chart with Canvas Rendering**
  - High-performance HTML5 Canvas-based rendering for smooth interactions
  - Candlestick display with OHLC data
  - Bid/Ask volume levels displayed inside each candle
  - Visual imbalance detection (3x threshold) with color highlighting
  - Real-time price axis and timestamp labels

- **Interactive Controls**
  - Timeframe selector: 5m, 15m, 30m, 1h, 4h
  - Mouse wheel zoom functionality
  - Click-and-drag panning
  - Smooth animations and transitions

- **Footprint Bar Statistics Panel**
  - Volume per bar with color-coded visualization
  - Delta (Buy Volume - Sell Volume) with positive/negative indicators
  - Relative Strength metric (Delta/Volume ratio %)
  - Cumulative Volume Delta (CVD) tracking
  - Color-graded cells based on value magnitude

- **Dark Theme UI**
  - Professional Exocharts-inspired styling
  - Gray-scale color palette with accent colors
  - Green for bid/buy pressure, Red for ask/sell pressure
  - Modern glassmorphism effects

- **Mock Data Generator**
  - Realistic order flow data simulation
  - Configurable timeframes and bar counts
  - Dynamic bid/ask imbalances
  - Cumulative metrics calculation

## 📊 Data Structure

Each candle contains the following order flow data:

```typescript
{
  timestamp: '2024-05-01T05:30:00Z',
  open: 105000,
  high: 106000,
  low: 104800,
  close: 105500,
  bidAskData: [
    { price: 105000, bidVol: 3200, askVol: 2100 },
    { price: 105010, bidVol: 500, askVol: 1400 },
    ...
  ],
  delta: 5400,      // Buy Volume - Sell Volume
  volume: 125000,   // Total Volume
  cvd: 12300       // Cumulative Volume Delta
}
```

## 🎯 Key Metrics Explained

- **Volume**: Total traded volume (Bid + Ask) for the candle
- **Delta**: Net buying/selling pressure (Bid Volume - Ask Volume)
- **Relative Strength**: Delta as percentage of volume, shows strength of imbalance
- **CVD**: Running sum of delta across all candles, shows overall market direction
- **Imbalance**: When one side is 3x or more than the other at a price level

## 🎨 Visual Indicators

| Color | Meaning |
|-------|---------|
| 🟢 Green Background | Strong bid imbalance (3x+ bid volume vs ask) |
| 🔴 Red Background | Strong ask imbalance (3x+ ask volume vs bid) |
| 🟢 Green Numbers | Positive delta/CVD (buying pressure) |
| 🔴 Red Numbers | Negative delta/CVD (selling pressure) |
| 🔵 Blue Cells | Volume metric |

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Rendering**: HTML5 Canvas API for performance
- **State Management**: React Hooks (useState, useEffect)

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd orderflow-
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 Usage

### Timeframe Selection
Click any of the timeframe buttons (5m, 15m, 30m, 1h, 4h) to change the chart interval. The chart will reload with new data for that timeframe.

### Zoom & Pan
- **Zoom**: Scroll mouse wheel up/down while hovering over the chart
- **Pan**: Click and drag left/right to navigate through historical data

### Reading Footprint Candles
- Each candle shows multiple price levels
- Left side of candle = Bid volume (buyers)
- Right side of candle = Ask volume (sellers)
- Highlighted cells indicate 3x+ imbalances

### Bar Statistics Panel
- Bottom panel shows last 20 bars
- Each column represents one candle
- Four rows: Volume, Delta, Relative Strength, CVD
- Color intensity indicates magnitude

## 📁 Project Structure

```
orderflow-/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── FootprintChart.tsx    # Canvas-based chart component
│   ├── FootprintBarStatistics.tsx  # Bottom statistics panel
│   └── TimeframeSelector.tsx # Timeframe controls
├── lib/
│   ├── types.ts              # TypeScript type definitions
│   ├── mockDataGenerator.ts  # Mock data generator
│   └── utils.ts              # Utility functions
└── package.json
```

## 🔮 Future Enhancements

- [ ] WebSocket integration for real-time data from exchanges (Binance, Bybit, CME)
- [ ] Open Interest charts as sub-panels
- [ ] Volume Profile overlay on the right side
- [ ] Order flow heatmap view
- [ ] Multiple symbol support
- [ ] Export chart as image
- [ ] Custom imbalance threshold settings
- [ ] Alert system for significant imbalances
- [ ] Historical data replay mode

## 🏗️ Architecture Notes

### Performance Considerations

1. **Canvas Rendering**: Using HTML5 Canvas instead of DOM elements for drawing bid/ask cells ensures smooth rendering even with hundreds of data points.

2. **Conditional Rendering**: Footprint details only render when candles are wide enough (>60px) to maintain readability.

3. **Debounced Updates**: Chart redraws are optimized to prevent unnecessary re-renders during rapid zoom/pan operations.

4. **Data Pagination**: Statistics panel shows only last 20 bars to maintain UI responsiveness.

### Design Patterns

- **Component Composition**: Modular components for easy maintenance and testing
- **Controlled Components**: State managed at parent level for better data flow
- **Type Safety**: Full TypeScript implementation with strict typing
- **Responsive Design**: Tailwind utilities for mobile-friendly layouts

## 📝 Development

### Adding New Timeframes

Edit `lib/types.ts`:
```typescript
export type Timeframe = '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
```

Update `lib/mockDataGenerator.ts` intervals map:
```typescript
const intervals = {
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  ...
};
```

### Connecting Real Data

Replace `MockDataGenerator` in `app/page.tsx` with your data fetching logic:

```typescript
// Instead of:
const historicalData = dataGenerator.generateHistoricalData(timeframe, 100);

// Use:
const historicalData = await fetchOrderFlowData(symbol, timeframe, 100);
```

## 📄 License

MIT License - feel free to use this project for your own order flow analysis needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Note**: This application currently uses mock data for demonstration purposes. Connect to a real exchange API for live trading data.
