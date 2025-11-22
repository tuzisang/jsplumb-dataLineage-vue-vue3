# Data Lineage Visualization Tool - Enterprise Frontend Solution

> **🚀 Deep customization based on the original project with 4-10x performance improvement**
>
> A frontend deep reconstruction for [jsplumb-dataLineage-vue](https://github.com/mizuhokaga/jsplumb-dataLineage-vue), creating enterprise-grade data lineage visualization experience.
> Backend continues to use [SQLLineage](https://github.com/reata/sqllineage) native API with zero modification direct calls.

---

<div align="center">

## 🌐 Language / 语言

[![中文](https://img.shields.io/badge/🇨🇳-中文-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxNiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwLjMzIDMuODVMMTIuOTIgNi40NEwxMC4zMyA5LjAzTDEwLjMzIDMuODVaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNS42NyAzLjg1TDMuMDggNi40NEw1LjY3IDkuMDNMNS42NyAzLjg1WiIgZmlsbD0iI0ZGRjAwMCIvPgo8L3N2Zz4K)](README.md)
[![English](https://img.shields.io/badge/🇺🇸-English-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxNiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEyIiBmaWxsPSIjMDAyNDY2Ii8+CjxyZWN0IHdpZHRoPSIxNiIgaGVpZ2h0PSI0IiBmaWxsPSIjRkZGRkZGIi8+Cjwvc3ZnPgo=)](README_EN.md)

</div>

---

## 🚀 Technical Architecture (Frontend Specialized)

### Frontend Tech Stack (Deeply Optimized)

![Vue 3.4+](https://img.shields.io/badge/Vue-3.4+-42b883?style=for-the-badge&logo=vue.js)
![TypeScript 5.0+](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=for-the-badge&logo=typescript)
![JSPlumb 6.0+](https://img.shields.io/badge/JSPlumb-6.0+-ff6600?style=for-the-badge)
![Vite 5.0+](https://img.shields.io/badge/Vite-5.0+-646cff?style=for-the-badge&logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript)
![CSS3](https://img.shields.io/badge/CSS3-Grid/Flexbox-1572b6?style=for-the-badge&logo=css3)

### Backend Tech Stack (Original Native)

![Python Flask](https://img.shields.io/badge/Flask-2.0+-000000?style=for-the-badge&logo=flask)
![SQLLineage](https://img.shields.io/badge/SQLLineage-1.5+-4b4b4b?style=for-the-badge)
![NetworkX](https://img.shields.io/badge/NetworkX-3.5+-00a8e8?style=for-the-badge)

## ✨ Core Feature Highlights

### Visualization Example
```sql
INSERT INTO foo
SELECT a.col1,
       b.col1     AS col2,
       c.col3_sum AS col3,
       col4,
       d.*
FROM bar a
         JOIN baz b
              ON a.id = b.bar_id
         LEFT JOIN (SELECT bar_id, sum(col3) AS col3_sum
                    FROM qux
                    GROUP BY bar_id) c
                   ON a.id = sq.bar_id
         CROSS JOIN quux d;

INSERT INTO corge
SELECT a.col1,
       a.col2 + b.col2 AS col2
FROM foo a
         LEFT JOIN grault b
              ON a.col1 = b.col1;
```

**Video Demo:** [Bilibili Video](https://www.bilibili.com/video/BV1FXHLzUEYK/?share_source=copy_web&vd_source=e66f868628e69de4b9cee838b895b850)

### 🎯 Dual-Mode Lineage Analysis
**One-click switch** between table/column lineage views
- **Table Mode**: Complete lineage chain with source/intermediate/result table identification
- **Column Mode**: Field-level precise tracking with automatic CTE query noise filtering

### 🔍 Intelligent Search & Location
- **Millisecond Search**: 50ms response fuzzy matching
- **Precise Location**: One-click navigation to any table/field
- **Batch Navigation**: Support for key node sequential viewing

### 🎨 Modern Interaction
- **Collapsible Panels**: SQL/nodes/history panels freely collapsible
- **Drag & Drop Layout**: Custom node position adjustment
- **Responsive Design**: Perfect adaptation to multi-screen sizes

### ⚡ Enterprise-Grade Performance
- **Virtual Rendering**: Smooth operation with 2000+ nodes
- **Smart Caching**: Zero time consumption for repeated calculations
- **Memory Optimization**: Automatic cleanup mechanism prevents leaks

### 📊 Key Path Analysis
- **Intelligent Recognition**: Automatic calculation of key lineage paths
- **One-click Switch**: Seamless conversion between panoramic/key view
- **Path Highlighting**: Visual emphasis on core relationships

### 🔧 Enhanced SQL Syntax Compatibility
- **Automatic Dialect Detection**: Intelligently identifies MySQL backtick (`) syntax and auto-switches dialect
- **Zero Configuration Support**: No manual dialect specification needed, system automatically handles backtick-wrapped identifiers
- **Broad Compatibility**: Supports mixed use of standard SQL and MySQL-style SQL

## 🛠️ Feature List

| Feature Category | Core Capabilities |
|------------------|-------------------|
| 🧬 **Lineage Analysis** | Dual table/column mode, key path identification, path highlighting |
| 🔍 **Search & Location** | Millisecond fuzzy search, one-click precise location, batch navigation |
| 🎨 **Interaction Experience** | Drag & drop layout, collapsible panels, responsive design |
| 📦 **Data Management** | Node list grouping, history records, table type filtering |
| 📤 **Export & Sharing** | HD image download, SQL upload, node information copying |
| 🧪 **SQL Compatibility** | Auto dialect detection, backtick syntax support, multi-database dialect compatibility |

## 🎯 Target Roles

| Role | Core Value |
|------|------------|
| 🏗️ **Data Architect** | Architecture optimization, impact assessment, standard setting |
| 🔧 **Data Engineer** | Troubleshooting, ETL optimization, change management |
| 📊 **Business Analyst** | Data understanding, report validation, requirement analysis |
| 🛡️ **Data Governance** | Asset inventory, quality monitoring, compliance auditing |

## 📋 SQL Dialect Support

Currently supports SQL dialect parsing for the following databases:

- **MySQL** - Full support
- **PostgreSQL** - Full support
- **SparkSQL** - Full support
- **Hive** - Full support
- **Oracle** - Basic support
- **SQL Server** - Basic support

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22.11.0+
- **Python** 3.12.9+
- **npm** 10+

### Installation & Running

```bash
# Frontend setup
npm install
npm run dev

# Backend setup
cd api
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
pip install -r requirements.txt
python server.py
```

### Docker Deployment

```bash
docker-compose up -d
```

## 🎯 Usage

1. **Access Application**: Open http://localhost:8620 in your browser
2. **Input SQL**: Enter your SQL query in the input panel
3. **Analyze**: Click "Analyze" button to generate lineage visualization
4. **Explore**: Use search, filters, and interactive features to explore data lineage
5. **Export**: Download lineage diagram as image or copy node information

## 🔧 Configuration Options

- **Lineage Analysis Level**: Switch between table/column level
- **Key Path Analysis**: Intelligently identify core lineage chains
- **History Management**: Local storage for query history
- **Virtual Rendering**: Large dataset performance optimization

## 🌟 Performance Features

- **High Performance**: Supports 2000+ nodes with smooth visualization
- **Memory Optimization**: Automatic cleanup and memory management
- **Smart Rendering**: Hardware-accelerated graphics and virtual scrolling
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## 📈 Architecture Benefits

- **Modern Tech Stack**: Built with Vue 3, TypeScript, and Vite
- **Scalable Design**: Modular architecture for easy extension
- **Enterprise Ready**: Production-grade performance and reliability
- **Developer Friendly**: Clean code with comprehensive documentation

## 🤝 Contributing

We welcome all forms of contributions! Please feel free to submit Issues and Pull Requests to help improve the project.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/tuzisang/jsplumb-dataLineage-vue-vue3.git

# Navigate to project directory
cd jsplumb-dataLineage-vue-vue3

# Install dependencies
npm install

# Start development servers
npm run dev          # Frontend
python api/server.py # Backend
```

## 📄 License

This project is open source under the MIT License.

## 🔗 Related Links

- [Online Demo](https://your-demo-link.com)
- [Video Demo](https://www.bilibili.com/video/BV1FXHLzUEYK/)
- [Original Project](https://github.com/mizuhokaga/jsplumb-dataLineage-vue)
- [SQLLineage Project](https://github.com/reata/sqllineage)

## 🙏 Acknowledgments

- [SQLLineage](https://github.com/reata/sqllineage) - Core SQL parsing engine
- [JSPlumb](https://jsplumbtoolkit.com/) - Visual connection library
- [Vue.js](https://vuejs.org/) - Frontend framework
- All contributors and users who support this project

---

## 📱 Download Options

### 📦 Installation Options

1. **Source Code** - `git clone https://github.com/tuzisang/jsplumb-dataLineage-vue-vue3.git`
2. **Release Package** - Click "Assets" below to download the corresponding version
3. **Docker Image** - `docker pull tuzisang/jsplumb-dataLineage:latest`

---

**🎉 Thank you to all contributors and users for your support!**