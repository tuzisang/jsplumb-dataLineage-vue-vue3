// jsplumb视觉配置文件
// 包含连接线颜色、高亮颜色、节点透明度等视觉相关配置

// 节点透明度配置
export const nodeOpacity = {
  hidden: 0,           // 隐藏节点的透明度
  normal: 1,           // 正常节点的透明度
  dimmed: 0.1          // 非关键路径节点的透明度
};

// 连接线样式配置
export const connectionStyle = {
  default: {
    stroke: "#FFCC99",   // 默认连接线颜色 (更浅的橙色)
    strokeWidth: 2
  },
  hover: {
    strokeWidth: 2
  }
};

// jsPlumb连接线动画配置
export const connectionAnimation = {
  pulse: {
    keyframes: {
      '0%': { strokeWidth: '3px', strokeOpacity: '1' },
      '50%': { strokeWidth: '4px', strokeOpacity: '0.8' },
      '100%': { strokeWidth: '3px', strokeOpacity: '1' }
    },
    duration: '1.5s',
    easing: 'ease-in-out'
  }
};

// 节点聚焦动画配置
export const nodeFocusAnimation = {
  keyframes: {
    '0%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(24, 144, 255, 0)' },
    '50%': { transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(24, 144, 255, 0.4)' },
    '100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(24, 144, 255, 0)' }
  },
  duration: '0.6s',
  easing: 'ease-out'
};

// 连接线悬停样式
export const connectionHoverStyle = {
  stroke: '#FF9966',
  strokeWidth: 3,
  zIndex: 5
};

// 连接线默认样式
export const connectionDefaultStyle = {
  stroke: '#FFCC99',
  strokeWidth: 2,
  zIndex: 4
};

export default {
  nodeOpacity,
  connectionStyle,
  connectionAnimation,
  nodeFocusAnimation,
  connectionHoverStyle,
  connectionDefaultStyle
};