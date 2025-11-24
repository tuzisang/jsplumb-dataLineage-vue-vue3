# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an enterprise-grade data lineage visualization tool built with Vue 3 + TypeScript (frontend) and Python Flask (backend). The application specializes in SQL query lineage analysis with support for both table-level and column-level visualization, featuring intelligent SQL dialect detection (including MySQL backtick syntax), virtualized rendering for large datasets, and key path analysis.

The frontend uses JSPlumb for interactive data flow diagrams, while the backend leverages SQLLineage library for parsing SQL queries and extracting lineage relationships.

## Common Development Commands

### Frontend Development
- `npm install` - Install frontend dependencies
- `npm run dev` - Start development server on http://localhost:8620 (with API proxy to port 5000)
- `npm run build` - Build production version to `dist/` directory with relative path support
- `npm run preview` - Preview the built production version

### Backend Development
- `cd api && python -m venv venv` - Create virtual environment
- `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac) - Activate virtual environment
- `pip install -r requirements.txt` - Install Python dependencies (SQLLineage, Flask, etc.)
- `python api/server.py` - Start backend server on http://localhost:5000

### Docker Deployment
- `docker-compose up --build -d` - Build and start both frontend and backend services
- `docker-compose down` - Stop services
- `docker-compose logs -f` - View logs
- Environment variables available in `.env`: `FRONTEND_PORT`, `BACKEND_PORT`, `CORS_ORIGIN`

### Environment Requirements
- Node.js 22.11.0+
- Python 3.12.9+
- npm 10+

## Core Architecture

### Frontend Architecture (`src/`)

The application follows a single-page application (SPA) pattern with Vue 3 Composition API:

**Main Entry Point**:
- `src/main.js` - Creates Vue app with router and global configurations

**Core View**:
- `src/views/Index.vue` - The primary application component (2000+ lines) containing:
  - JSPlumb integration for visual connections
  - Virtualized rendering for 2000+ nodes
  - Performance optimizations (hardware acceleration, memory management)
  - Search functionality with 50ms response time
  - Key path analysis algorithms
  - History management with local storage
  - Mini-map navigation system

**Component Structure**:
- `TableNode.vue` - Individual table node with field-level details and expand/collapse
- `MiniMap.vue` - Navigation overview map with viewport indicator
- `DownloadImage.vue` - Export functionality for high-quality images
- `LoginDialog.vue` - Authentication interface

**Configuration Files**:
- `jsplumbConfig.ts` - JSPlumb connection and behavior configuration
- `jsplumbVisualConfig.ts` - Visual styling (colors, stroke widths, animations)
- `tableTypeMappingColor.ts` - Table type color mapping (Source/Middle/Result)

**Utilities**:
- `comm.ts` - Core utility methods for JSPlumb operations, drag functionality, and performance optimizations
- Uses `panzoom` for canvas zoom/pan functionality with hardware acceleration

**Key Performance Features**:
- Virtualized rendering for large datasets
- Intelligent caching system with memory cleanup
- Batch DOM updates for smooth animations
- Throttled drag operations with alignment guides

### Backend Architecture (`api/`)

**API Server**:
- `server.py` - Flask application with CORS, authentication, and health checks
- Endpoint: `POST /api/lineage` - Accepts SQL query and returns JSON lineage data

**Core Analysis Logic**:
- `lineage.py` - Main API handler that routes requests based on lineage level (table/column)
- `main2.py` - Column-level lineage analysis using SQLLineage with CTE filtering
- `table_lineage.py` - Table-level lineage extraction for high-level overview
- `sql_utils.py` - SQL utility functions for dialect detection and preprocessing

**Key Features**:
- **Dual-mode Analysis**: Table-level for overview, Column-level for detailed field tracking
- **SQL Dialect Detection**: Automatic detection of MySQL backtick syntax and dialect switching
- **Multi-database Support**: MySQL, PostgreSQL, SparkSQL, Hive, Oracle, SQL Server
- **Input Validation**: SQL query validation and sanitization
- **Performance Optimization**: Efficient parsing for large SQL queries

### API Request/Response Format

**Request**:
```json
{
  "sql_query": "SELECT ...",
  "lineage_level": "column|table",
  "filter_ctes": true,
  "sql_dialect": "default|mysql|postgresql|..."
}
```

**Response**: JSON structure with nodes, edges, layout metadata for JSPlumb visualization

### Deployment Architecture

**Development Setup**:
- Frontend: Vite dev server on port 8620 with proxy to backend API
- Backend: Flask dev server on port 5000
- Cross-origin communication handled via proxy configuration

**Production Docker Setup**:
- Frontend: nginx serving static files from dist/ directory
- Backend: Gunicorn WSGI server with Flask
- Service health checks and dependency management
- Configurable ports via environment variables

### Key Technical Patterns

**Performance Optimization**:
- Virtual scrolling for large node counts (>2000)
- Hardware-accelerated CSS transforms
- Intelligent connection caching
- Memory leak prevention with proper cleanup

**SQL Processing Pipeline**:
1. SQL dialect detection (MySQL backticks, PostgreSQL syntax, etc.)
2. SQLLineage parsing and analysis
3. Graph generation with NetworkX
4. Layout algorithm for optimal node positioning
5. JSON format transformation for frontend consumption

**State Management**:
- Vue 3 reactive refs for component state
- Local storage for history persistence
- JSPlumb instance management with proper cleanup

## Development Notes

**Important Considerations**:
- The main `Index.vue` component is intentionally large to maintain tight coupling between visualization logic
- SQL parsing relies on SQLLineage library versions and dialect compatibility
- Performance optimizations are critical for handling enterprise-scale datasets
- Docker deployment uses health checks for service reliability

**Common Issues**:
- JSPlumb instance cleanup is critical to prevent memory leaks
- Large SQL queries may need timeout handling
- Virtual rendering requires careful viewport management
- CORS configuration must match deployment environment

**File Upload Feature**:
- Supports `.sql` files for testing complex queries
- Automatic dialect detection based on file content
- Integration with history management system

This project prioritizes performance and scalability for enterprise data lineage analysis while maintaining flexibility for different SQL environments and deployment scenarios.