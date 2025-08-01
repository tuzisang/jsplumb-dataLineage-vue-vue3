# jsPlumb 配置文件说明

为了更好地管理和维护 jsPlumb 相关的配置，我们将所有相关的配置信息统一归集到 `/src/views/config/` 目录下。

## 配置文件列表

### 1. jsplumbConfig.ts

该文件包含 jsPlumb 的基本配置，如连接线样式、端点样式等。

### 2. jsplumbVisualConfig.ts

该文件包含 jsPlumb 的视觉相关配置，包括：

- 节点透明度配置
- 连接线样式配置
- 连接线动画配置
- 节点聚焦动画配置
- 连接线悬停样式
- 连接线默认样式

### 3. tableTypeMappingColor.ts

该文件包含不同表类型的配色方案。

## 使用说明

在需要使用这些配置的文件中，可以通过以下方式导入：

```javascript
import commConfig from './config/jsplumbConfig'
import visualConfig from './config/jsplumbVisualConfig'
import colorFields from "./config/tableTypeMappingColor";
```

然后在代码中使用相应的配置项，例如：

```javascript
// 使用节点透明度配置
opacity: visualConfig.nodeOpacity.hidden

// 使用连接线样式配置
stroke: visualConfig.connectionStyle.default.stroke
```

## 配置更新

当需要修改 jsPlumb 相关的视觉效果时，请直接修改 `jsplumbVisualConfig.ts` 文件中的相应配置项，这样可以保证所有使用该配置的地方都会同步更新。