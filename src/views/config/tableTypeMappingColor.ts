// 现代设计系统 - 语义化颜色配置
// 支持WCAG 2.1 AA标准，提供良好的对比度和可访问性
const tableTypeMappingColor = [
    { // 来源表 - 翡翠绿系 (数据源头)
        color: "#10b981",
        type: "Origin",
        label: "来源表",
        gradient: "linear-gradient(135deg, #10b981, #059669)",
        hoverColor: "#047857",
        textColor: "#ffffff",
        borderColor: "#065f46",
        shadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
    },
    { // 中间表 - 天空蓝系 (处理过程)
        color: "#3b82f6",
        type: "Middle",
        label: "中间表",
        gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
        hoverColor: "#1d4ed8",
        textColor: "#ffffff",
        borderColor: "#1e40af",
        shadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
    },
    { // 结果表 - 琥珀橙系 (最终结果)
        color: "#f59e0b",
        type: "RS",
        label: "结果表",
        gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
        hoverColor: "#b45309",
        textColor: "#ffffff",
        borderColor: "#92400e",
        shadow: "0 4px 12px rgba(245, 158, 11, 0.3)"
    },
    { // 高亮状态 - 日光黄系 (强调色)
        color: "#fbbf24",
        type: "HighLight",
        gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)",
        hoverColor: "#d97706",
        textColor: "#1f2937",
        borderColor: "#92400e",
        shadow: "0 4px 12px rgba(251, 191, 36, 0.4)"
    },
    { // 普通状态 - 纯净白色 (背景色)
        color: "#ffffff",
        type: "NormalLight",
        gradient: "linear-gradient(135deg, #ffffff, #f9fafb)",
        hoverColor: "#f3f4f6",
        textColor: "#111827",
        borderColor: "#d1d5db",
        shadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
    }
]

export default tableTypeMappingColor
