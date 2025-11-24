import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  AnimationConfig,
  ConnectionAnimation,
  AnimationState,
  AnimationEvent,
  PerformanceMetrics,
  JSPlumbAnimationConfig
} from '../types/guide-animation.ts'

/**
 * 连接线动画相关的Composable
 * 提供JSPlumb连接线动画控制、性能优化和状态管理功能
 */
export function useAnimation(jsplumbInstance = null) {
  // 核心状态
  const isAnimating = ref(false)
  const animationEnabled = ref(true)
  const reducedMotion = ref(false)
  const performanceMode = ref(false)

  // 动画状态管理
  const animationState = reactive<AnimationState>({
    isAnimating: false,
    activeAnimations: new Set(),
    queuedAnimations: [],
    performanceStats: {
      fps: 60,
      animationCount: 0,
      averageDuration: 0
    }
  })

  // 性能指标
  const performanceMetrics = reactive<PerformanceMetrics>({
    animationFrameTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    lastUpdateTime: Date.now()
  })

  // 动画配置
  const defaultConfigs = {
    flow: {
      enabled: true,
      speed: 1.0,
      type: 'flow',
      easing: 'linear',
      direction: 'forward',
      loop: true,
      delay: 0,
      duration: 2000,
      intensity: 0.8,
      color: '#1890ff',
      glow: true,
      particles: true
    },
    pulse: {
      enabled: true,
      speed: 1.5,
      type: 'pulse',
      easing: 'ease-in-out',
      direction: 'alternate',
      loop: true,
      delay: 0,
      duration: 1500,
      intensity: 0.6,
      glow: true,
      particles: false
    },
    breathing: {
      enabled: true,
      speed: 1.0,
      type: 'breathing',
      easing: 'ease-in-out',
      direction: 'alternate',
      loop: true,
      delay: 0,
      duration: 3000,
      intensity: 0.4,
      glow: false,
      particles: false
    },
    highlight: {
      enabled: true,
      speed: 2.0,
      type: 'highlight',
      easing: 'ease-out',
      direction: 'forward',
      loop: false,
      delay: 0,
      duration: 800,
      intensity: 1.0,
      color: '#52c41a',
      glow: true,
      particles: false
    }
  }

  // 当前动画配置
  const animationConfigs = reactive({ ...defaultConfigs })

  // JSPlumb实例
  let jsPlumbInstance = jsplumbInstance

  // 活动动画实例
  const activeAnimations = new Map()

  // 动画帧管理
  let animationFrameId = null
  let lastFrameTime = performance.now()
  let frameCount = 0

  // 事件系统
  const eventListeners = new Map()

  /**
   * 设置JSPlumb实例
   * @param {Object} instance - JSPlumb实例
   */
  function setJSPlumbInstance(instance) {
    jsPlumbInstance = instance
    setupJSPlumbAnimation()
  }

  /**
   * 设置JSPlumb动画配置
   */
  function setupJSPlumbAnimation() {
    if (!jsPlumbInstance) return

    // 注册连接动画
    jsPlumbInstance.registerConnectionType('animated', {
      connector: ['Flowchart', { stub: [40, 60], gap: 8, cornerRadius: 5 }],
      paintStyle: {
        stroke: '#1890ff',
        strokeWidth: 2,
        outlineStroke: '#ffffff',
        outlineWidth: 1
      },
      hoverPaintStyle: {
        stroke: '#40a9ff',
        strokeWidth: 3
      },
      overlays: [
        ['Arrow', {
          location: 1,
          width: 12,
          height: 12,
          id: 'arrow'
        }]
      ]
    })

    // 注册动画连接类型
    jsPlumbInstance.registerConnectionType('flow-animation', {
      connector: ['Flowchart', { stub: [40, 60], gap: 8, cornerRadius: 5 }],
      paintStyle: {
        stroke: '#1890ff',
        strokeWidth: 2,
        dashstyle: '5,5',
        outlineStroke: '#ffffff',
        outlineWidth: 1
      },
      hoverPaintStyle: {
        stroke: '#40a9ff',
        strokeWidth: 3,
        dashstyle: '3,3'
      },
      overlays: [
        ['Arrow', {
          location: 1,
          width: 12,
          height: 12,
          id: 'arrow'
        }],
        ['Custom', {
          create: createFlowDot,
          location: 0,
          id: 'flow-dot'
        }]
      ]
    })
  }

  /**
   * 创建流动点动画
   * @param {Object} connection - JSPlumb连接对象
   */
  function createFlowDot(connection) {
    const dot = document.createElement('div')
    dot.className = 'flow-animation-dot'
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      background: #1890ff;
      border-radius: 50%;
      position: absolute;
      box-shadow: 0 0 6px rgba(24, 144, 255, 0.8);
      pointer-events: none;
      z-index: 10;
      transform: translate(-50%, -50%);
    `
    return dot
  }

  /**
   * 开始连接线动画
   * @param {string} connectionId - 连接ID
   * @param {AnimationConfig} config - 动画配置
   * @param {Object} options - 额外选项
   */
  function startConnectionAnimation(connectionId, config = null, options = {}) {
    if (!animationEnabled.value || !jsPlumbInstance) return false

    const connection = jsPlumbInstance.getConnections({ id: connectionId })[0]
    if (!connection) {
      console.warn(`连接不存在: ${connectionId}`)
      return false
    }

    // 检查是否已在动画中
    if (activeAnimations.has(connectionId)) {
      return true
    }

    const animationConfig = config || animationConfigs.flow
    const connectionConfig = {
      connectionId,
      config: animationConfig,
      trigger: options.trigger || 'manual',
      path: options.path || 'data-flow',
      keyframes: options.keyframes,
      onStart: options.onStart,
      onComplete: options.onComplete
    }

    // 性能检查
    if (!checkPerformanceForAnimation()) {
      console.warn('性能不足，跳过动画')
      return false
    }

    // 添加到活动动画
    activeAnimations.set(connectionId, connectionConfig)
    animationState.activeAnimations.add(connectionId)
    animationState.isAnimating = true
    isAnimating.value = true

    // 触发开始事件
    emitEvent('start', connectionId, { config: animationConfig })

    // 执行动画
    executeConnectionAnimation(connection, connectionConfig)

    return true
  }

  /**
   * 停止连接线动画
   * @param {string} connectionId - 连接ID
   */
  function stopConnectionAnimation(connectionId) {
    if (!activeAnimations.has(connectionId)) return false

    const animationData = activeAnimations.get(connectionId)

    // 清理动画元素
    cleanupAnimationElements(connectionId)

    // 移除活动动画
    activeAnimations.delete(connectionId)
    animationState.activeAnimations.delete(connectionId)

    // 更新状态
    if (activeAnimations.size === 0) {
      animationState.isAnimating = false
      isAnimating.value = false
    }

    // 触发完成事件
    emitEvent('complete', connectionId, { config: animationData.config })

    return true
  }

  /**
   * 停止所有动画
   */
  function stopAllAnimations() {
    const connectionIds = Array.from(activeAnimations.keys())
    connectionIds.forEach(id => stopConnectionAnimation(id))
  }

  /**
   * 执行连接线动画
   * @param {Object} connection - JSPlumb连接对象
   * @param {Object} config - 动画配置
   */
  function executeConnectionAnimation(connection, config) {
    const { connectionId, config: animationConfig } = config

    switch (animationConfig.type) {
      case 'flow':
        executeFlowAnimation(connection, config)
        break
      case 'pulse':
        executePulseAnimation(connection, config)
        break
      case 'breathing':
        executeBreathingAnimation(connection, config)
        break
      case 'highlight':
        executeHighlightAnimation(connection, config)
        break
      default:
        console.warn(`未知的动画类型: ${animationConfig.type}`)
    }
  }

  /**
   * 执行流动动画
   * @param {Object} connection - JSPlumb连接对象
   * @param {Object} config - 动画配置
   */
  function executeFlowAnimation(connection, config) {
    const { connectionId, config: animationConfig } = config
    const canvas = connection.canvas
    if (!canvas) return

    // 创建流动点
    const dot = document.createElement('div')
    dot.className = 'flow-dot'
    dot.style.cssText = `
      width: ${6 * animationConfig.intensity}px;
      height: ${6 * animationConfig.intensity}px;
      background: ${animationConfig.color || '#1890ff'};
      border-radius: 50%;
      position: absolute;
      box-shadow: 0 0 ${8 * animationConfig.intensity}px ${animationConfig.color || '#1890ff'};
      pointer-events: none;
      z-index: 1000;
      transform: translate(-50%, -50%);
    `

    // 添加到画布
    canvas.appendChild(dot)

    // 获取连接路径
    const path = getConnectionPath(connection)
    if (!path) return

    // 动画参数
    const duration = animationConfig.duration / animationConfig.speed
    const startTime = performance.now()
    let progress = 0

    // 动画循环
    const animate = (currentTime) => {
      if (!activeAnimations.has(connectionId)) {
        if (dot.parentNode) {
          dot.parentNode.removeChild(dot)
        }
        return
      }

      progress = ((currentTime - startTime) % duration) / duration
      if (animationConfig.direction === 'reverse') {
        progress = 1 - progress
      }

      // 计算位置
      const position = getPositionOnPath(path, progress)
      dot.style.left = position.x + 'px'
      dot.style.top = position.y + 'px'

      // 更新动画统计
      updateAnimationStats(currentTime)

      // 继续动画
      if (animationConfig.loop) {
        animationFrameId = requestAnimationFrame(animate)
      } else if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        stopConnectionAnimation(connectionId)
      }
    }

    // 开始动画
    animationFrameId = requestAnimationFrame(animate)

    // 保存动画元素
    const animationData = activeAnimations.get(connectionId)
    if (animationData) {
      animationData.elements = { dot }
    }
  }

  /**
   * 执行脉冲动画
   * @param {Object} connection - JSPlumb连接对象
   * @param {Object} config - 动画配置
   */
  function executePulseAnimation(connection, config) {
    const { connectionId, config: animationConfig } = config
    const canvas = connection.canvas
    if (!canvas) return

    // 创建脉冲效果
    const pulse = document.createElement('div')
    pulse.className = 'pulse-effect'
    pulse.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999;
      opacity: ${animationConfig.intensity};
    `

    // 添加脉冲样式
    const styleSheet = document.createElement('style')
    styleSheet.textContent = `
      @keyframes pulse-${connectionId} {
        0% { opacity: ${0.1 * animationConfig.intensity}; }
        50% { opacity: ${animationConfig.intensity}; }
        100% { opacity: ${0.1 * animationConfig.intensity}; }
      }

      .pulse-effect {
        animation: pulse-${connectionId} ${animationConfig.duration / animationConfig.speed}ms ${animationConfig.easing} ${animationConfig.loop ? 'infinite' : ''};
      }
    `
    document.head.appendChild(styleSheet)

    canvas.appendChild(pulse)

    // 保存动画元素
    const animationData = activeAnimations.get(connectionId)
    if (animationData) {
      animationData.elements = { pulse, styleSheet }
    }

    // 非循环动画处理
    if (!animationConfig.loop) {
      setTimeout(() => {
        stopConnectionAnimation(connectionId)
      }, animationConfig.duration / animationConfig.speed)
    }
  }

  /**
   * 执行呼吸动画
   * @param {Object} connection - JSPlumb连接对象
   * @param {Object} config - 动画配置
   */
  function executeBreathingAnimation(connection, config) {
    const { connectionId, config: animationConfig } = config
    const canvas = connection.canvas
    if (!canvas) return

    // 创建呼吸效果
    const breathing = document.createElement('div')
    breathing.className = 'breathing-effect'
    breathing.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 998;
      background: linear-gradient(90deg,
        transparent 0%,
        ${animationConfig.color || '#1890ff'} 50%,
        transparent 100%);
      opacity: ${animationConfig.intensity * 0.3};
    `

    // 添加呼吸样式
    const styleSheet = document.createElement('style')
    styleSheet.textContent = `
      @keyframes breathing-${connectionId} {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .breathing-effect {
        animation: breathing-${connectionId} ${animationConfig.duration / animationConfig.speed}ms ${animationConfig.easing} ${animationConfig.loop ? 'infinite' : ''};
      }
    `
    document.head.appendChild(styleSheet)

    canvas.appendChild(breathing)

    // 保存动画元素
    const animationData = activeAnimations.get(connectionId)
    if (animationData) {
      animationData.elements = { breathing, styleSheet }
    }

    // 非循环动画处理
    if (!animationConfig.loop) {
      setTimeout(() => {
        stopConnectionAnimation(connectionId)
      }, animationConfig.duration / animationConfig.speed)
    }
  }

  /**
   * 执行高亮动画
   * @param {Object} connection - JSPlumb连接对象
   * @param {Object} config - 动画配置
   */
  function executeHighlightAnimation(connection, config) {
    const { connectionId, config: animationConfig } = config

    // 临时修改连接样式
    const originalPaintStyle = connection.getPaintStyle()
    const highlightPaintStyle = {
      ...originalPaintStyle,
      stroke: animationConfig.color || '#52c41a',
      strokeWidth: (originalPaintStyle.strokeWidth || 2) * 1.5,
      dashstyle: '5,5'
    }

    connection.setPaintStyle(highlightPaintStyle)

    // 添加发光效果
    if (animationConfig.glow) {
      const glowOverlay = connection.addOverlay([
        'PlainArrow',
        {
          location: 0.5,
          width: 20,
          length: 20,
          id: 'glow',
          paintStyle: {
            stroke: animationConfig.color || '#52c41a',
            strokeWidth: 3,
            fill: animationConfig.color || '#52c41a',
            opacity: animationConfig.intensity * 0.5
          }
        }
      ])
    }

    // 保存原始样式
    const animationData = activeAnimations.get(connectionId)
    if (animationData) {
      animationData.originalPaintStyle = originalPaintStyle
      animationData.highlightOverlay = glowOverlay
    }

    // 非高亮动画处理
    if (!animationConfig.loop) {
      setTimeout(() => {
        stopConnectionAnimation(connectionId)
      }, animationConfig.duration / animationConfig.speed)
    }
  }

  /**
   * 获取连接路径
   * @param {Object} connection - JSPlumb连接对象
   */
  function getConnectionPath(connection) {
    const path = connection.getConnector()
    if (!path) return null

    // 提取路径点
    const points = []
    if (path.getPath) {
      // SVG路径
      const svgPath = path.getPath()
      const length = svgPath.getTotalLength()
      const segments = 50 // 采样点数

      for (let i = 0; i <= segments; i++) {
        const point = svgPath.getPointAtLength((i / segments) * length)
        points.push({ x: point.x, y: point.y })
      }
    } else if (path.points) {
      // Canvas路径
      points.push(...path.points)
    }

    return points
  }

  /**
   * 获取路径上的位置
   * @param {Array} path - 路径点数组
   * @param {number} progress - 进度 (0-1)
   */
  function getPositionOnPath(path, progress) {
    if (!path || path.length === 0) return { x: 0, y: 0 }

    const index = Math.floor(progress * (path.length - 1))
    const localProgress = (progress * (path.length - 1)) % 1

    if (index >= path.length - 1) {
      return path[path.length - 1]
    }

    const start = path[index]
    const end = path[index + 1]

    return {
      x: start.x + (end.x - start.x) * localProgress,
      y: start.y + (end.y - start.y) * localProgress
    }
  }

  /**
   * 清理动画元素
   * @param {string} connectionId - 连接ID
   */
  function cleanupAnimationElements(connectionId) {
    const animationData = activeAnimations.get(connectionId)
    if (!animationData || !animationData.elements) return

    const { dot, pulse, breathing, styleSheet } = animationData.elements

    // 移除DOM元素
    if (dot && dot.parentNode) {
      dot.parentNode.removeChild(dot)
    }
    if (pulse && pulse.parentNode) {
      pulse.parentNode.removeChild(pulse)
    }
    if (breathing && breathing.parentNode) {
      breathing.parentNode.removeChild(breathing)
    }

    // 移除样式表
    if (styleSheet && styleSheet.parentNode) {
      styleSheet.parentNode.removeChild(styleSheet)
    }

    // 恢复原始连接样式
    if (jsPlumbInstance) {
      const connection = jsPlumbInstance.getConnections({ id: connectionId })[0]
      if (connection) {
        if (animationData.originalPaintStyle) {
          connection.setPaintStyle(animationData.originalPaintStyle)
        }
        if (animationData.highlightOverlay) {
          connection.removeOverlay('glow')
        }
      }
    }
  }

  /**
   * 检查性能是否适合动画
   */
  function checkPerformanceForAnimation() {
    if (performanceMode.value || reducedMotion.value) return false

    // 检查活动动画数量
    const maxConcurrent = 10 // 最大并发动画数
    if (activeAnimations.size >= maxConcurrent) return false

    // 检查FPS
    if (animationState.performanceStats.fps < 30) return false

    // 检查设备性能
    return checkDevicePerformance()
  }

  /**
   * 检查设备性能
   */
  function checkDevicePerformance() {
    // 低端设备检测
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false

    return true
  }

  /**
   * 更新动画统计
   * @param {number} currentTime - 当前时间
   */
  function updateAnimationStats(currentTime) {
    frameCount++
    const deltaTime = currentTime - lastFrameTime

    if (deltaTime >= 1000) {
      // 计算FPS
      const fps = Math.round((frameCount * 1000) / deltaTime)
      animationState.performanceStats.fps = fps

      frameCount = 0
      lastFrameTime = currentTime
    }

    // 更新性能指标
    performanceMetrics.animationFrameTime = deltaTime
    performanceMetrics.lastUpdateTime = currentTime
  }

  /**
   * 设置动画配置
   * @param {string} type - 动画类型
   * @param {AnimationConfig} config - 动画配置
   */
  function setAnimationConfig(type, config) {
    if (animationConfigs[type]) {
      Object.assign(animationConfigs[type], config)
      saveAnimationConfigs()
    }
  }

  /**
   * 获取动画配置
   * @param {string} type - 动画类型
   */
  function getAnimationConfig(type) {
    return animationConfigs[type] || null
  }

  /**
   * 重置动画配置
   */
  function resetAnimationConfigs() {
    Object.assign(animationConfigs, defaultConfigs)
    saveAnimationConfigs()
  }

  /**
   * 保存动画配置
   */
  function saveAnimationConfigs() {
    try {
      localStorage.setItem('animation-configs', JSON.stringify(animationConfigs))
    } catch (error) {
      console.warn('保存动画配置失败:', error)
    }
  }

  /**
   * 加载动画配置
   */
  function loadAnimationConfigs() {
    try {
      const saved = localStorage.getItem('animation-configs')
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.assign(animationConfigs, parsed)
      }
    } catch (error) {
      console.warn('加载动画配置失败:', error)
    }
  }

  /**
   * 触发事件
   * @param {string} type - 事件类型
   * @param {string} animationId - 动画ID
   * @param {any} data - 事件数据
   */
  function emitEvent(type, animationId, data = {}) {
    const event = {
      type,
      animationId,
      data,
      timestamp: Date.now()
    }

    // 触发注册的监听器
    const listeners = eventListeners.get(type) || []
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('动画事件监听器执行失败:', error)
      }
    })

    // 触发全局事件
    window.dispatchEvent(new CustomEvent('animation-event', { detail: event }))
  }

  /**
   * 添加事件监听器
   * @param {string} type - 事件类型
   * @param {Function} listener - 监听器函数
   */
  function addEventListener(type, listener) {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, [])
    }
    eventListeners.get(type).push(listener)
  }

  /**
   * 移除事件监听器
   * @param {string} type - 事件类型
   * @param {Function} listener - 监听器函数
   */
  function removeEventListener(type, listener) {
    const listeners = eventListeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 批量开始动画
   * @param {Array} connections - 连接ID数组
   * @param {AnimationConfig} config - 动画配置
   */
  function startBatchAnimation(connections, config = null) {
    if (!Array.isArray(connections)) return

    connections.forEach((connectionId, index) => {
      setTimeout(() => {
        startConnectionAnimation(connectionId, config)
      }, index * 100) // 错开启动时间以提升性能
    })
  }

  /**
   * 设置减少动画模式
   * @param {boolean} enabled - 是否启用
   */
  function setReducedMotion(enabled) {
    reducedMotion.value = enabled
    if (enabled) {
      stopAllAnimations()
    }
  }

  /**
   * 设置性能模式
   * @param {boolean} enabled - 是否启用
   */
  function setPerformanceMode(enabled) {
    performanceMode.value = enabled
    if (enabled) {
      stopAllAnimations()
    }
  }

  /**
   * 检测用户偏好
   */
  function detectUserPreferences() {
    // 检测减少动画偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(prefersReducedMotion)

    // 监听偏好变化
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      setReducedMotion(e.matches)
    })
  }

  // 计算属性
  const activeAnimationsCount = computed(() => activeAnimations.size)
  const animationPerformance = computed(() => ({
    fps: animationState.performanceStats.fps,
    count: activeAnimationsCount.value,
    memoryUsage: performanceMetrics.memoryUsage
  }))

  // 组件挂载时初始化
  onMounted(() => {
    loadAnimationConfigs()
    detectUserPreferences()
    setupJSPlumbAnimation()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopAllAnimations()
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })

  // 监听配置变化
  watch(animationConfigs, () => {
    saveAnimationConfigs()
  }, { deep: true })

  // 监听性能变化
  watch(() => reducedMotion.value, (enabled) => {
    if (enabled) {
      stopAllAnimations()
    }
  })

  watch(() => performanceMode.value, (enabled) => {
    if (enabled) {
      stopAllAnimations()
    }
  })

  return {
    // 状态
    isAnimating,
    animationEnabled,
    reducedMotion,
    performanceMode,
    animationState,
    performanceMetrics,

    // 计算属性
    activeAnimationsCount,
    animationPerformance,

    // 配置
    animationConfigs,

    // 核心方法
    setJSPlumbInstance,
    startConnectionAnimation,
    stopConnectionAnimation,
    stopAllAnimations,
    startBatchAnimation,

    // 配置管理
    setAnimationConfig,
    getAnimationConfig,
    resetAnimationConfigs,

    // 用户偏好
    setReducedMotion,
    setPerformanceMode,
    detectUserPreferences,

    // 事件
    addEventListener,
    removeEventListener,

    // 工具方法
    saveAnimationConfigs,
    loadAnimationConfigs,
    checkPerformanceForAnimation
  }
}