# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 + TypeScript chart generator POC that creates SVG charts (bar, line, scatter, pie) from CSV data. The application uses Vuetify for UI components and generates pure SVG charts without external charting libraries.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Preview production build
npm run preview
```

## Architecture

### Chart Generation System

The core of the application is a **generator-based architecture** where each chart type has its own pure function that returns SVG strings:

- **Chart Generators** (`src/utils/chartGenerators/`): Each chart type (bar, line, scatter, pie) is a standalone TypeScript module that exports a `generate*Chart()` function
- All generators follow the same signature: `(options: ChartOptions) => string`
- Generators are **pure functions** - they take configuration and return SVG markup with no side effects
- The `types.ts` file defines the shared data contract: `DataPoint`, `ChartColors`, and `ChartOptions`

### Component Structure

- **App.vue**: Minimal root component with Vuetify app bar
- **ChartGenerator.vue**: Main component that handles:
  - CSV file upload and parsing (supports both `,` and `;` delimiters, detects headers)
  - Chart type selection via button toggle
  - Color customization for primary/secondary/background
  - Vuetify data table display of loaded CSV data
  - Split-pane layout (chart preview top, data table bottom) using the `splitpanes` library
  - SVG download functionality

### Data Flow

1. CSV file uploaded → parsed into `DataPoint[]` format
2. User selects chart type → corresponding generator function called
3. Generator receives data + colors + title → returns SVG string
4. SVG rendered via `v-html` in preview pane
5. Data simultaneously displayed in Vuetify data table

### Key Design Patterns

- **Reactive SVG Generation**: The `svgContent` computed property watches `chartType`, `data`, `colors`, and `chartTitle`, automatically regenerating the chart when any input changes
- **Manual Chart Rendering**: All chart generators manually calculate coordinates, scales, and SVG elements rather than using a charting library - this gives complete control over output
- **Large Dataset Handling**: Chart generators include logic to handle large datasets by:
  - Showing only every nth label when data.length > 20
  - Reducing font sizes for dense data
  - Conditionally hiding value labels on data points when too many exist

## Testing

The project uses Vitest with jsdom environment for testing Vue components. Test configuration is in `vitest.config.ts`. Currently no test files exist in the codebase.

## TypeScript Configuration

- Strict mode enabled with additional linting rules (`noUnusedLocals`, `noUnusedParameters`)
- Module resolution set to "bundler" mode for Vite compatibility
- Vue-specific type support included via `types: ["vite/client", "vitest/globals"]`
