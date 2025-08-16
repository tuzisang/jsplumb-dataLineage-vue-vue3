import colorFields from "./tableTypeMappingColor";
import visualConfig from "./jsplumbVisualConfig";

const commConfig = {
    grid: [10, 10],
    Container: "flow",
    // 现代设计：使用直线连接保持简洁性，但优化端点样式
    Connector: ["Straight", {stub: 0}],
    // 优化的端点样式 - 现代圆形端点
    Endpoint: ["Dot", {radius: 3}],
    // 恢复浅橙色端点样式
    EndpointStyle: {
        fill: "#FFB74D",
        outlineWidth: 2,
        outlineStroke: "#FFA726"
    },
    // 浅灰色连接线样式
    PaintStyle: {
        stroke: "#E0E0E0", // 浅灰色 - 默认连接线
        strokeWidth: 1.3,
        strokeLinecap: "round"
    },
    // 红色悬停样式
    HoverPaintStyle: {
        stroke: "#E57373",
        strokeWidth: 2.5
    },
    maxConnections: -1, // 设置连接点最多可以连接几条线 -1不限
    // 恢复浅橙色箭头样式
    Overlays: [
        [
            "Arrow",
            {
                width: 10,
                length: 12,
                location: 1,
                foldback: 0.8,
                fill: "#FFB74D",
                stroke: "#FFA726",
                strokeWidth: 1
            }
        ]
    ],
    LogEnabled: false, //是否打开jsPlumb的内部日志记录
    // 现代连接线配置
    Anchors: ["Right", "Left"],
    // 连接点样式优化 - 恢复浅橙色
    EndpointHoverStyle: {
        fill: "#FFA726",
        stroke: "#FF9800",
        strokeWidth: 2
    },
    // 连接线平滑优化 - 红色
    ConnectorHoverStyle: {
        stroke: "#E57373",
        strokeWidth: 2.5
    }
}

export default commConfig
