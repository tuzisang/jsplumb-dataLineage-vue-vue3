# 数据血缘可视化工具 - 企业级前端解决方案

> **🚀 基于原生项目深度定制，性能提升4-10倍**
>
> 针对 [jsplumb-dataLineage-vue](https://github.com/mizuhokaga/jsplumb-dataLineage-vue) 的前端深度重构，打造企业级数据血缘可视化体验。
> 后端沿用 [SQLLineage](https://github.com/reata/sqllineage) 原生API，零改造直接调用。

---

<div align="center">

## 🌐 Language / 语言

[![中文](https://img.shields.io/badge/🇨🇳-中文-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxNiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwLjMzIDMuODVMMTIuOTIgNi40NEwxMC4zMyA5LjAzTDEwLjMzIDMuODVaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNS42NyAzLjg1TDMuMDggNi40NEw1LjY3IDkuMDNMNS42NyAzLjg1WiIgZmlsbD0iI0ZGRjAwMCIvPgo8L3N2Zz4K)](README.md)
[![English](https://img.shields.io/badge/🇺🇸-English-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxNiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEyIiBmaWxsPSIjMDAyNDY2Ii8+CjxyZWN0IHdpZHRoPSIxNiIgaGVpZ2h0PSI0IiBmaWxsPSIjRkZGRkZGIi8+Cjwvc3ZnPgo=)](README_EN.md)

</div>

---

## 🚀 技术架构（前端专精）

### 前端技术栈（深度优化）

![Vue 3.4+](https://img.shields.io/badge/Vue-3.4+-42b883?style=for-the-badge&logo=vue.js)
![TypeScript 5.0+](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=for-the-badge&logo=typescript)
![JSPlumb 6.0+](https://img.shields.io/badge/JSPlumb-6.0+-ff6600?style=for-the-badge)
![Vite 5.0+](https://img.shields.io/badge/Vite-5.0+-646cff?style=for-the-badge&logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript)
![CSS3](https://img.shields.io/badge/CSS3-Grid/Flexbox-1572b6?style=for-the-badge&logo=css3)

### 后端技术栈（保持原生）

![Python Flask](https://img.shields.io/badge/Flask-2.0+-000000?style=for-the-badge&logo=flask)
![SQLLineage](https://img.shields.io/badge/SQLLineage-1.5+-4b4b4b?style=for-the-badge)
![NetworkX](https://img.shields.io/badge/NetworkX-3.5+-00a8e8?style=for-the-badge)

## ✨ 核心功能亮点
可视化示例
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
B站视频演示：<a href="https://www.bilibili.com/video/BV1FXHLzUEYK/?share_source=copy_web&vd_source=e66f868628e69de4b9cee838b895b850">https://www.bilibili.com/video/BV1FXHLzUEYK/?share_source=copy_web&vd_source=e66f868628e69de4b9cee838b895b850</a>
### 🎯 双模式血缘分析
**一键切换**表级/列级血缘视图
- **表级模式**：完整血缘链路，支持源表/中间表/结果表识别
- **列级模式**：字段级精确追踪，自动隐藏CTE查询噪音

### 🔍 智能搜索定位
- **毫秒级搜索**：50ms响应的模糊匹配
- **精准定位**：一键直达任意表/字段
- **批量导航**：支持关键节点顺序查看

### 🎨 现代化交互
- **折叠面板**：SQL/节点/历史面板自由折叠
- **拖拽布局**：节点位置自定义调整
- **响应式设计**：完美适配多屏尺寸

### ⚡ 企业级性能
- **虚拟渲染**：2000节点流畅运行
- **智能缓存**：重复计算零耗时
- **内存优化**：自动清理机制防泄漏

### 📊 关键路径分析
- **智能识别**：自动计算关键血缘路径
- **一键切换**：全景图/关键图无缝转换
- **链路高亮**：核心关系视觉化突出

### 🔧 SQL语法兼容性增强
- **自动方言检测**：智能识别MySQL反引号(`)语法并自动切换方言
- **零配置支持**：无需手动指定方言，系统自动处理反引号包围的标识符
- **广泛兼容**：支持标准SQL和MySQL风格SQL混合使用

## 🛠️ 功能清单

| 功能类别 | 核心特性 |
|----------|----------|
| 🧬 **血缘分析** | 表级/列级双模式、关键路径识别、链路高亮 |
| 🔍 **搜索定位** | 毫秒级模糊搜索、一键精准定位、批量导航 |
| 🎨 **交互体验** | 拖拽布局、折叠面板、响应式设计 |
| 📦 **数据管理** | 节点列表分组、历史记录、表类型筛选 |
| 📤 **导出分享** | 高清图片下载、SQl上传、节点信息复制 |
| 🧪 **SQL兼容性** | 自动方言检测、反引号语法支持、多数据库方言兼容 |

## 🎯 适用角色

| 角色 | 核心价值 |
|------|----------|
| 🏗️ **数据架构师** | 架构优化、影响评估、标准制定 |
| 🔧 **数据工程师** | 故障排查、ETL优化、变更管理 |
| 📊 **业务分析师** | 数据理解、报表验证、需求分析 |
| 🛡️ **数据治理** | 资产盘点、质量监控、合规审计 |


## 🚀 快速开始

### 环境要求

![Node.js 22.11.0+](https://img.shields.io/badge/Node.js-22.11.0+-339933?style=for-the-badge&logo=node.js)
![Python 3.12.9+](https://img.shields.io/badge/Python-3.12.9+-3776ab?style=for-the-badge&logo=python)
![npm 10+](https://img.shields.io/badge/npm-10+-cb3837?style=for-the-badge&logo=npm)

### 启动命令

#### 传统方式（开发环境）
```bash
# 安装依赖
npm install

# 启动前端
npm run dev
# 访问: http://localhost:8620

# 启动后端
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate #linux
venv\Scripts\activate #windows

# 安装依赖
pip install -r requirements.txt
python api/server.py
# API: http://localhost:5000
```

#### Docker 一键部署（生产/测试环境）
```bash
# Windows 用户
.\deploy.bat

# Linux/Mac 用户
chmod +x deploy.sh  # 首次运行需要添加执行权限
./deploy.sh
```

部署完成后：
- 前端访问: http://localhost:8620
- 后端API: http://localhost:5000

#### Docker 手动部署
```bash
# 构建并启动服务
docker-compose up --build -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 自定义端口（修改 .env 文件）
FRONTEND_PORT=8080
BACKEND_PORT=8081
```

## 📁 项目结构

```
src/
├── views/Index.vue      # 主界面
├── components/          # 功能组件
├── config/             # 配置文件
├── methods/            # 工具方法
└── utils/              # 通用函数
```

## 🤝 参与贡献

欢迎前端优化贡献：
- 🎨 **UI/UX改进**
- ⚡ **性能优化**
- 🐛 **Bug修复**
- ✨ **功能增强**



## 🌟 未来规划

### ✅ 已完成的功能

- [x] **智能SQL分析**：表级和列级模式切换时，自动触发SQL分析，无需手动刷新
- [x] **SQL方言支持**：增加对不同数据库SQL方言的解析支持，**自动识别MySQL反引号语法**
- [x] **语法兼容性增强**：解决被反引号(`)包围的关键字导致的语法错误问题，提高SQL解析准确率
- [x] **部署体验优化**：完善Docker方式的部署，提供更简便的一键部署方案

### 🚀 未来待完成的功能

- [ ] **性能优化增强**：进一步优化大规模数据集的渲染性能和内存使用




## 📄 开源协议

- **前端**：MIT协议
- **后端**：SQLLineage原生MIT协议

## 🙏 致谢
- [jsplumb-dataLineage-vue](https://github.com/mizuhokaga/jsplumb-dataLineage-vue) - 前端基础
- [SQLLineage](https://github.com/reata/sqllineage) - SQL解析引擎
- [JSPlumb](https://jsplumbtoolkit.com/) - 图形连接库

---
<div align="center">
⭐ <strong>如果这个项目帮助到了你，请给我们一个星标！</strong>
</div>
