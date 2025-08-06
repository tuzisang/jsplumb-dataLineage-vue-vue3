// 现代设计系统 - 视觉配置
// 使用紫色/紫罗兰渐变系统，提供现代专业的视觉体验

// 节点透明度配置 - 优化层级关系
export const nodeOpacity = {
  hidden: 0,           // 隐藏节点的透明度
  normal: 1,           // 正常节点的透明度
  dimmed: 0.15,        // 非关键路径节点的透明度（轻微提高）
  semiTransparent: 0.7 // 半透明显示状态
};

// 连接线样式配置 - 现代紫色/紫罗兰系统
export const connectionStyle = {
  default: {
    stroke: "#FFE0B2",   // 更浅的橙色 - 默认连接线
    strokeWidth: 1.5,
    opacity: 0.8
  },
  hover: {
    stroke: "#E57373",   // 更深的红色 - 悬停状态
    strokeWidth: 2.5,
    opacity: 1
  },
  highlight: {
    stroke: "#FFD54F",   // 黄色 - 高亮状态
    strokeWidth: 3,
    opacity: 1
  },
  critical: {
    stroke: "#E57373",   // 更深的红色 - 关键路径
    strokeWidth: 2.5,
    opacity: 1
  }
};

// 现代连接线动画配置
export const connectionAnimation = {
  pulse: {
    keyframes: {
      '0%': { strokeWidth: '2.5px', strokeOpacity: '0.9', stroke: '#8B5CF6' },
      '50%': { strokeWidth: '3.5px', strokeOpacity: '1', stroke: '#A855F7' },
      '100%': { strokeWidth: '2.5px', strokeOpacity: '0.9', stroke: '#8B5CF6' }
    },
    duration: '2s',
    easing: 'ease-in-out'
  },
  flow: {
    keyframes: {
      '0%': { strokeDashoffset: '0' },
      '100%': { strokeDashoffset: '-20' }
    },
    duration: '1.5s',
    easing: 'linear'
  }
};

// 现代节点聚焦动画配置
export const nodeFocusAnimation = {
  keyframes: {
    '0%': { 
      transform: 'scale(1)', 
      boxShadow: '0 0 0 rgba(139, 92, 246, 0)',
      borderColor: 'currentColor'
    },
    '50%': { 
      transform: 'scale(1.03)', 
      boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)',
      borderColor: '#8B5CF6'
    },
    '100%': { 
      transform: 'scale(1)', 
      boxShadow: '0 0 0 rgba(139, 92, 246, 0)',
      borderColor: 'currentColor'
    }
  },
  duration: '0.4s',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

// 连接线悬停样式 - 更深的红色
export const connectionHoverStyle = {
  stroke: '#E57373',
  strokeWidth: 2.5,
  opacity: 1,
  zIndex: 10
};

// 连接线默认样式 - 更浅的橙色
export const connectionDefaultStyle = {
  stroke: '#FFE0B2',
  strokeWidth: 1.5,
  opacity: 0.8,
  zIndex: 5
};

// 关键路径样式 - 更深的红色
export const connectionCriticalStyle = {
  stroke: '#E57373',
  strokeWidth: 2.5,
  opacity: 1,
  zIndex: 8
};

// 现代设计系统颜色变量
export const designSystem = {
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a855f7',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95'
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  }
};

export default {
  nodeOpacity,
  connectionStyle,
  connectionAnimation,
  nodeFocusAnimation,
  connectionHoverStyle,
  connectionDefaultStyle,
  connectionCriticalStyle,
  designSystem
};