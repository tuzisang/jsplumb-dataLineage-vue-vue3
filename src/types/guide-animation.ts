/**
 * 新手引导与连接线动画功能类型定义
 */

/**
 * 引导步骤配置
 */
export interface GuideStep {
  id: string
  title: string
  content: string
  target: string // CSS选择器或组件引用
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  showSkip?: boolean
  showPrev?: boolean
  showNext?: boolean
  customClass?: string
  offset?: { x: number; y: number }
  highlight?: {
    padding?: number
    borderRadius?: number
    hideBackground?: boolean
  }
  callback?: () => void // 步骤回调
  validation?: () => boolean // 步骤验证
  allowClickOutside?: boolean
  scrollIntoView?: boolean
  delay?: number
}

/**
 * 引导配置
 */
export interface GuideConfig {
  id: string
  name: string
  description: string
  steps: GuideStep[]
  autoStart?: boolean
  showOnFirstVisit?: boolean
  allowSkip?: boolean
  allowReplay?: boolean
  resetOnComplete?: boolean
  storageKey?: string
  priority?: number
  conditions?: {
    pathname?: string
    hasData?: boolean
    userRole?: string
    featureFlag?: string
  }
}

/**
 * 动画配置
 */
export interface AnimationConfig {
  enabled: boolean
  speed: number // 0.5 - 2.0
  type: 'flow' | 'pulse' | 'breathing' | 'highlight'
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce'
  direction: 'forward' | 'reverse' | 'alternate'
  loop: boolean | number
  delay: number
  duration: number
  intensity: number // 0.1 - 1.0
  color?: string
  glow?: boolean
  particles?: boolean
}

/**
 * 连接线动画定义
 */
export interface ConnectionAnimation {
  connectionId: string
  config: AnimationConfig
  trigger?: 'hover' | 'click' | 'auto' | 'manual'
  path?: 'data-flow' | 'bidirectional' | 'circular'
  keyframes?: Keyframe[]
  onComplete?: () => void
  onStart?: () => void
}

/**
 * JSPlumb动画配置
 */
export interface JSPlumbAnimationConfig {
  connectionStyles: {
    paintStyle: {
      stroke: string
      strokeWidth: number
      dashstyle?: string
    }
    hoverPaintStyle?: any
    outlineStyle?: any
  }
  overlays: Array<{
    type: string
    options: any
    location?: number
    id?: string
  }>
  animations: {
    flow: AnimationConfig
    pulse: AnimationConfig
    breathing: AnimationConfig
    highlight: AnimationConfig
  }
  performance: {
    maxConcurrentAnimations: number
    animationFrameRate: number
    enableHardwareAcceleration: boolean
    lowPerformanceMode: boolean
  }
}

/**
 * 引导状态
 */
export interface GuideState {
  isActive: boolean
  currentStep: number
  completedGuides: string[]
  skippedGuides: string[]
  progress: Record<string, number>
  lastActiveTime: number
  userPreferences: {
    autoStart: boolean
    showTooltips: boolean
    animationSpeed: number
    enableKeyboardNavigation: boolean
  }
}

/**
 * 动画状态
 */
export interface AnimationState {
  isAnimating: boolean
  activeAnimations: Set<string>
  queuedAnimations: Array<{
    id: string
    config: AnimationConfig
    timestamp: number
  }>
  performanceStats: {
    fps: number
    animationCount: number
    averageDuration: number
  }
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  animationFrameTime: number
  renderTime: number
  memoryUsage: number
  cpuUsage: number
  lastUpdateTime: number
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  guide: {
    enabled: boolean
    autoStart: boolean
    showProgress: boolean
    allowSkip: boolean
    rememberPosition: boolean
    keyboardNavigation: boolean
  }
  animation: {
    enabled: boolean
    reducedMotion: boolean
    performanceMode: boolean
    customSpeed: number
    theme: 'light' | 'dark' | 'auto'
  }
  performance: {
    hardwareAcceleration: boolean
    frameRate: 30 | 60 | 120
    maxConcurrentAnimations: number
    enableOptimizations: boolean
  }
}

/**
 * 键盘快捷键配置
 */
export interface KeyboardShortcuts {
  nextStep: string[]
  prevStep: string[]
  skipGuide: string[]
  pauseGuide: string[]
  toggleAnimation: string[]
  resetGuide: string[]
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  shadow: string
  overlay: string
  success: string
  warning: string
  error: string
  info: string
}

/**
 * API响应类型
 */
export interface GuideAPIResponse {
  success: boolean
  data?: any
  error?: string
  timestamp: number
}

/**
 * 事件类型
 */
export interface GuideEvent {
  type: 'start' | 'step' | 'complete' | 'skip' | 'pause' | 'resume' | 'error'
  guideId: string
  stepId?: string
  data?: any
  timestamp: number
}

export interface AnimationEvent {
  type: 'start' | 'complete' | 'error' | 'pause' | 'resume'
  animationId: string
  connectionId?: string
  data?: any
  timestamp: number
}