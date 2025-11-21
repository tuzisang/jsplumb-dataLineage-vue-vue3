# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a data lineage visualization tool built with Vue 3 and TypeScript for the frontend, and Python Flask with SQLLineage for the backend. The application provides enterprise-grade data lineage visualization with features like table/column-level lineage analysis, intelligent search, virtualized rendering for large datasets, and key path analysis.

The frontend uses JSPlumb for creating interactive data flow diagrams, while the backend leverages SQLLineage to parse SQL queries and extract lineage relationships.

## Common Development Commands

### Frontend Development
- `npm install` - Install frontend dependencies
- `npm run dev` - Start development server on http://localhost:8620
- `npm run build` - Build production version to `dist/` directory
- `npm run preview` - Preview the built production version

### Backend Development
- `python -m venv venv` - Create virtual environment
- `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac) - Activate virtual environment
- `pip install -r requirements.txt` - Install Python dependencies
- `python api/server.py` - Start backend server on http://localhost:5000

### Environment Requirements
- Node.js 22.11.0+
- Python 3.12.9+
- npm 10+

## Code Architecture

### Frontend Structure (`src/`)
- **Main Entry**: `src/main.js` - Creates Vue app with router
- **Routing**: `src/router/index.ts` - Single route to `/index` view
- **Main View**: `src/views/Index.vue` - Primary application component containing all functionality
- **Components**:
  - `TableNode.vue` - Individual table node component with field-level details
  - `MiniMap.vue` - Miniature overview map for navigation
  - `DownloadImage.vue` - Image export functionality
- **Configuration**:
  - `jsplumbConfig.ts` - JSPlumb connection configuration
  - `jsplumbVisualConfig.ts` - Visual styling configuration
  - `tableTypeMappingColor.ts` - Table type color mappings
- **Utilities**: `comm.ts` - Shared utility methods
- **Sample Data**: `sampleData.json` - Default sample data for demonstration

### Backend Structure (`api/`)
- **Main Server**: `server.py` - Flask application with CORS enabled
- **Core Logic**: `lineage.py` - Main API handler that routes requests based on lineage level
- **Column-level Analysis**: `main2.py` - Uses SQLLineage for column-level lineage parsing
- **Table-level Analysis**: `table_lineage.py` - Handles table-level lineage extraction

### Key Features Implementation
- **Dual-mode Lineage**: Switch between table-level and column-level analysis via radio buttons
- **SQL Dialect Support**: Supports multiple SQL dialects (MySQL, PostgreSQL, SparkSQL, Hive, etc.)
- **Virtualized Rendering**: Handles large datasets (2000+ nodes) with virtual scrolling and optimized rendering
- **Key Path Analysis**: Toggle between showing all nodes vs only critical lineage paths
- **History Management**: Local storage-based history tracking for recent analyses
- **Performance Optimizations**: Hardware acceleration, batch DOM updates, intelligent caching, and memory management

### Build and Deployment
- **Frontend**: Built with Vite, outputs to `dist/` directory with relative base path (`./`)
- **Backend**: Flask server runs on port 5000 with proxy configured in Vite for development
- **API Endpoint**: POST `/api/lineage` accepts SQL query and returns JSON lineage data
- **Deployment**: Supports Docker deployment (Dockerfile and docker-compose.yml provided)

### Testing Approach
The project currently doesn't have formal test suites. Testing is done manually through the development server by:
1. Starting both frontend (`npm run dev`) and backend (`python api/server.py`)
2. Entering SQL queries in the web interface
3. Verifying correct lineage visualization and performance

For single test execution during development, modify sample data in `src/views/config/sampleData.json` or use the file upload feature to test specific SQL queries.