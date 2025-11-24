<template>
  <div ref="animationContainer" class="connection-animator">
    <!-- 数据流动画粒子 -->
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="data-flow-particle"
      :style="particle.style"
    ></div>

    <!-- 连接线脉冲效果 -->
    <svg
      v-if="showPulseEffect"
      class="connection-pulse-svg"
      :style="svgStyle"
    >
      <defs>
        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0" />
          <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
        </linearGradient>
      </defs>

      <!-- 脉冲线条 -->
      <line
        v-for="pulse in pulses"
        :key="pulse.id"
        :x1="pulse.x1"
        :y1="pulse.y1"
        :x2="pulse.x2"
        :y2="pulse.y2"
        stroke="url(#pulseGradient)"
        stroke-width="3"
        class="pulse-line"
      />
    </svg>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUIState } from '../composables/useUIState.js'

export default {
  name: 'ConnectionAnimator',
  props: {
    connections: {
      type: Array,
      default: () => []
    },
    animationEnabled: {
      type: Boolean,
      default: true
    },
    animationSpeed: {
      type: Number,
      default: 1, // 1-3 speed multiplier
      validator: (value) => value >= 0.5 && value <= 3
    },
    showDataFlow: {
      type: Boolean,
      default: true
    },
    showPulseEffect: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const animationContainer = ref(null)
    const particles = ref([])
    const pulses = ref([])
    const animationFrameId = ref(null)
    const { performanceMode } = useUIState()

    // 动画配置
    const ANIMATION_CONFIG = {
      particleCount: 3,
      particleSize: 4,
      particleSpeed: 2,
      pulseDuration: 2000,
      particleColors: ['#3b82f6', '#10b981', '#f59e0b']
    }

    // 计算SVG样式
    const svgStyle = computed(() => {
      if (!animationContainer.value) return {}

      const rect = animationContainer.value.getBoundingClientRect()
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: 'none',
        zIndex: 1
      }
    })

    // 生成粒子ID
    const generateParticleId = (connectionId, index) => {
      return `particle-${connectionId}-${index}-${Date.now()}`
    }

    // 生成脉冲ID
    const generatePulseId = (connectionId) => {
      return `pulse-${connectionId}-${Date.now()}`
    }

    // 缓存DOM查询结果
    const elementCache = new Map()

    // 计算连接线路径点
    const calculateConnectionPath = (connection) => {
      // 使用缓存避免重复DOM查询
      let sourceElement = elementCache.get(connection.source)
      if (!sourceElement) {
        sourceElement = document.querySelector(connection.source)
        if (sourceElement) {
          elementCache.set(connection.source, sourceElement)
        }
      }

      let targetElement = elementCache.get(connection.target)
      if (!targetElement) {
        targetElement = document.querySelector(connection.target)
        if (targetElement) {
          elementCache.set(connection.target, targetElement)
        }
      }

      if (!sourceElement || !targetElement) return null

      const sourceRect = sourceElement.getBoundingClientRect()
      const targetRect = targetElement.getBoundingClientRect()
      const containerRect = animationContainer.value?.getBoundingClientRect()

      if (!containerRect) return null

      // 计算连接点（简化处理，使用矩形中心）
      const sourceX = sourceRect.left + sourceRect.width / 2 - containerRect.left
      const sourceY = sourceRect.top + sourceRect.height / 2 - containerRect.top
      const targetX = targetRect.left + targetRect.width / 2 - containerRect.left
      const targetY = targetRect.top + targetRect.height / 2 - containerRect.top

      return {
        x1: sourceX,
        y1: sourceY,
        x2: targetX,
        y2: targetY,
        sourceRect: {
          x: sourceRect.left - containerRect.left,
          y: sourceRect.top - containerRect.top,
          width: sourceRect.width,
          height: sourceRect.height
        },
        targetRect: {
          x: targetRect.left - containerRect.left,
          y: targetRect.top - containerRect.top,
          width: targetRect.width,
          height: targetRect.height
        }
      }
    }

    // 创建数据流动画粒子
    const createDataFlowParticles = () => {
      if (!props.showDataFlow || !props.animationEnabled) return

      particles.value = []

      props.connections.forEach((connection, index) => {
        const path = calculateConnectionPath(connection)
        if (!path) return

        for (let i = 0; i < ANIMATION_CONFIG.particleCount; i++) {
          const delay = (i * 1000) / ANIMATION_CONFIG.particleSpeed

          particles.value.push({
            id: generateParticleId(connection.id || index, i),
            connectionId: connection.id || index,
            path,
            progress: 0,
            delay,
            speed: ANIMATION_CONFIG.particleSpeed * props.animationSpeed,
            size: ANIMATION_CONFIG.particleSize,
            color: ANIMATION_CONFIG.particleColors[i % ANIMATION_CONFIG.particleColors.length],
            style: {
              position: 'absolute',
              width: `${ANIMATION_CONFIG.particleSize}px`,
              height: `${ANIMATION_CONFIG.particleSize}px`,
              borderRadius: '50%',
              backgroundColor: ANIMATION_CONFIG.particleColors[i % ANIMATION_CONFIG.particleColors.length],
              boxShadow: `0 0 6px ${ANIMATION_CONFIG.particleColors[i % ANIMATION_CONFIG.particleColors.length]}`,
              pointerEvents: 'none',
              zIndex: 10,
              transform: 'translate(-50%, -50%)'
            }
          })
        }
      })
    }

    // 创建脉冲效果
    const createPulseEffect = () => {
      if (!props.showPulseEffect || !props.animationEnabled) return

      pulses.value = []

      props.connections.forEach((connection, index) => {
        const path = calculateConnectionPath(connection)
        if (!path) return

        pulses.value.push({
          id: generatePulseId(connection.id || index),
          connectionId: connection.id || index,
          ...path,
          opacity: 0,
          startTime: Date.now() + (index * 200) // 错开开始时间
        })
      })
    }

    // 动画循环
    const animate = (timestamp) => {
      if (!props.animationEnabled) {
        animationFrameId.value = null
        return
      }

      // 性能模式检查
      if (performanceMode.value === 'high' && particles.value.length > 50) {
        animationFrameId.value = null
        return
      }

      // 更新粒子位置
      particles.value.forEach(particle => {
        const elapsed = timestamp - particle.delay
        if (elapsed < 0) return

        particle.progress = (elapsed / (3000 / props.animationSpeed)) % 1

        if (particle.path) {
          const x = particle.path.x1 + (particle.path.x2 - particle.path.x1) * particle.progress
          const y = particle.path.y1 + (particle.path.y2 - particle.path.y1) * particle.progress

          particle.style.left = `${x}px`
          particle.style.top = `${y}px`
          particle.style.opacity = 1 - Math.abs(particle.progress - 0.5) * 0.5 // 淡入淡出效果
        }
      })

      // 更新脉冲效果
      pulses.value.forEach(pulse => {
        const elapsed = timestamp - pulse.startTime
        const duration = ANIMATION_CONFIG.pulseDuration / props.animationSpeed

        if (elapsed < duration) {
          pulse.opacity = Math.sin((elapsed / duration) * Math.PI) * 0.6
        } else {
          // 重新开始脉冲
          pulse.startTime = timestamp
        }
      })

      animationFrameId.value = requestAnimationFrame(animate)
    }

    // 开始动画
    const startAnimation = () => {
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value)
      }

      createDataFlowParticles()
      createPulseEffect()
      animationFrameId.value = requestAnimationFrame(animate)
    }

    // 停止动画
    const stopAnimation = () => {
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value)
        animationFrameId.value = null
      }
      particles.value = []
      pulses.value = []
    }

    // 重启动画
    const restartAnimation = () => {
      // 清理DOM缓存
      elementCache.clear()
      stopAnimation()
      startAnimation()
    }

    // 监听连接变化
    watch(() => props.connections, () => {
      if (props.animationEnabled) {
        restartAnimation()
      }
    }, { deep: true })

    // 监听动画开关
    watch(() => props.animationEnabled, (enabled) => {
      if (enabled) {
        startAnimation()
      } else {
        stopAnimation()
      }
    })

    // 监听动画速度
    watch(() => props.animationSpeed, () => {
      if (props.animationEnabled) {
        restartAnimation()
      }
    })

    // 监听性能模式
    watch(performanceMode, (mode) => {
      if (mode === 'high') {
        // 高性能模式时减少粒子数量
        particles.value = particles.value.slice(0, 10)
      } else {
        // 恢复正常粒子数量
        createDataFlowParticles()
      }
    })

    // 生命周期
    onMounted(() => {
      if (props.animationEnabled) {
        startAnimation()
      }
    })

    onUnmounted(() => {
      stopAnimation()
    })

    return {
      animationContainer,
      particles,
      pulses,
      svgStyle,

      // 方法
      startAnimation,
      stopAnimation,
      restartAnimation
    }
  }
}
</script>

<style scoped>
.connection-animator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 5;
}

.data-flow-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: particleGlow 1s ease-in-out infinite alternate;
}

@keyframes particleGlow {
  from {
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

.connection-pulse-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.pulse-line {
  animation: pulseFlow 2s linear infinite;
  stroke-linecap: round;
}

@keyframes pulseFlow {
  from {
    stroke-dasharray: 0 100;
  }
  to {
    stroke-dasharray: 100 0;
  }
}

/* 性能优化 */
.connection-animator.performance-mode-high .data-flow-particle {
  animation: none;
}

.connection-animator.performance-mode-high .pulse-line {
  animation-duration: 3s;
}
</style>