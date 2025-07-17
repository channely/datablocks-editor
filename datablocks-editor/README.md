# DataBlocks Editor

A node-based data processing and visualization editor built with React, TypeScript, and modern web technologies.

## Features

- **Node-based Interface**: Drag and drop nodes to build data processing pipelines
- **Real-time Processing**: See data flow through your pipeline in real-time
- **Multiple Data Sources**: Support for CSV, JSON, Excel files, and API endpoints
- **Data Transformations**: Filter, sort, group, merge, and transform your data
- **Visualizations**: Create charts and graphs from your processed data
- **Dark Theme**: Modern dark interface optimized for productivity

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Canvas**: React Flow
- **Styling**: Tailwind CSS
- **Charts**: Chart.js + react-chartjs-2
- **Data Processing**: Custom engine with Lodash utilities
- **Storage**: IndexedDB via Dexie.js
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── nodes/          # Node-specific components
│   ├── canvas/         # Canvas-related components
│   └── panels/         # Panel components
├── engines/            # Data processing engines
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Development

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Tailwind CSS** for styling

Make sure to run `npm run lint` and `npm run format` before committing changes.

## License

MIT License