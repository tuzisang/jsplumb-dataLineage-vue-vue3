# 数据血缘可视化工具 - 企业级前端解决方案

> **🚀 基于原生项目深度定制，性能提升4-10倍**
>
> 针对 [jsplumb-dataLineage-vue](https://github.com/mizuhokaga/jsplumb-dataLineage-vue) 的前端深度重构，打造企业级数据血缘可视化体验。
> 后端沿用 [SQLLineage](https://github.com/reata/sqllineage) 原生API，零改造直接调用。

## 🚀 技术架构（前端专精）

### 前端技术栈（深度优化）
- **Vue 3.4+** + **TypeScript 5.0+**：现代化开发框架，类型安全
- **JSPlumb 6.0+**：专业的图形连接库，深度定制版本
- **Vite 5.0+**：极速构建工具，开发体验优化
- **原生JavaScript**：高性能算法实现，无额外依赖
- **CSS Grid + Flexbox**：响应式布局，完美适配

### 后端技术栈（保持原生）
- **Python Flask**：轻量级Web服务
- **SQLLineage**：SQL血缘解析核心（未修改）
- **NetworkX**：图数据结构处理（未修改）

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
![表级分析](http://154.201.77.68:7658/file/1755671177613_20250820142604.png)
![列级分析](http://154.201.77.68:7658/file/1755670735724_20250820141848.png)
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

## 🛠️ 功能清单

| 功能类别 | 核心特性 |
|----------|----------|
| **血缘分析** | 表级/列级双模式、关键路径识别、链路高亮 |
| **搜索定位** | 毫秒级模糊搜索、一键精准定位、批量导航 |
| **交互体验** | 拖拽布局、折叠面板、响应式设计 |
| **数据管理** | 节点列表分组、历史记录、表类型筛选 |
| **导出分享** | 高清图片下载、SQl上传、节点信息复制 |

## 🎯 适用角色

| 角色 | 核心价值 |
|------|----------|
| **数据架构师** | 架构优化、影响评估、标准制定 |
| **数据工程师** | 故障排查、ETL优化、变更管理 |
| **业务分析师** | 数据理解、报表验证、需求分析 |
| **数据治理** | 资产盘点、质量监控、合规审计 |


## 🚀 快速开始

### 环境要求
- **Node.js**: 22.11.0+
- **Python**: 3.12.9+（仅后端API）
- **npm**: 10+

### 启动命令
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
- 🎨 UI/UX改进
- ⚡ 性能优化
- 🐛 Bug修复
- ✨ 功能增强



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
