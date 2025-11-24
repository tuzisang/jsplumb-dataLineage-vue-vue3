<template>
  <div v-if="isVisible" class="guide-overlay">
    <!-- 背景遮罩 -->
    <div class="guide-backdrop" @click="handleBackdropClick"></div>

    <!-- 高亮区域 -->
    <div
      v-if="currentStep?.target"
      class="guide-highlight"
      :style="highlightStyle"
    ></div>

    <!-- 引导提示框 -->
    <div
      v-if="currentStep"
      class="guide-tooltip"
      :style="tooltipStyle"
      :class="tooltipPosition"
    >
      <div class="guide-tooltip-content">
        <h3 class="guide-tooltip-title">{{ currentStep.title }}</h3>
        <div class="guide-tooltip-description" v-html="currentStep.description"></div>

        <!-- 可选的额外内容 -->
        <div v-if="currentStep.extraContent" class="guide-tooltip-extra">
          <component :is="currentStep.extraContent" />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="guide-tooltip-actions">
        <button
          class="guide-btn guide-btn-secondary"
          @click="handleSkip"
          v-if="currentStep.showSkip !== false"
        >
          跳过引导
        </button>

        <div class="guide-tooltip-navigation">
          <button
            class="guide-btn guide-btn-outline"
            @click="handlePrevious"
            :disabled="currentStepIndex === 0"
          >
            上一步
          </button>

          <span class="guide-step-indicator">
            {{ currentStepIndex + 1 }} / {{ totalSteps }}
          </span>

          <button
            class="guide-btn guide-btn-primary"
            @click="handleNext"
          >
            {{ isLastStep ? '完成' : '下一步' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, toRefs, watch } from 'vue'

export default {
  name: 'GuideOverlay',
  props: {
    steps: {
      type: Array,
      required: true,
      default: () => []
    },
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['complete', 'skip', 'step-change'],
  setup(props, { emit }) {
    const currentStepIndex = ref(0)
    const highlightElement = ref(null)
    const tooltipPosition = ref('bottom')

    // 计算属性
    const currentStep = computed(() => {
      return props.steps[currentStepIndex.value] || null
    })

    const totalSteps = computed(() => props.steps.length)

    const isLastStep = computed(() => {
      return currentStepIndex.value === totalSteps.value - 1
    })

    const highlightStyle = computed(() => {
      if (!highlightElement.value) return {}

      const rect = highlightElement.value.getBoundingClientRect()
      return {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      }
    })

    const tooltipStyle = computed(() => {
      if (!highlightElement.value) return {}

      const rect = highlightElement.value.getBoundingClientRect()
      const spacing = 10
      const tooltipWidth = 360
      const tooltipHeight = 200 // 估算高度

      // 计算最佳位置
      let top = rect.bottom + spacing
      let left = rect.left + (rect.width - tooltipWidth) / 2

      // 检查是否会超出屏幕边界
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - spacing
        tooltipPosition.value = 'top'
      } else {
        tooltipPosition.value = 'bottom'
      }

      if (left < spacing) {
        left = spacing
      } else if (left + tooltipWidth > window.innerWidth - spacing) {
        left = window.innerWidth - tooltipWidth - spacing
      }

      return {
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`
      }
    })

    // 方法
    const updateHighlight = async () => {
      if (!currentStep.value?.target) return

      await nextTick()
      highlightElement.value = document.querySelector(currentStep.value.target)

      if (highlightElement.value) {
        highlightElement.value.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
      }
    }

    const handleNext = () => {
      if (isLastStep.value) {
        handleComplete()
      } else {
        currentStepIndex.value++
        updateHighlight()
        emit('step-change', currentStepIndex.value, currentStep.value)
      }
    }

    const handlePrevious = () => {
      if (currentStepIndex.value > 0) {
        currentStepIndex.value--
        updateHighlight()
        emit('step-change', currentStepIndex.value, currentStep.value)
      }
    }

    const handleComplete = () => {
      emit('complete')
    }

    const handleSkip = () => {
      emit('skip')
    }

    const handleBackdropClick = (event) => {
      // 防止点击背景关闭引导，只能通过按钮操作
      event.preventDefault()
      event.stopPropagation()
    }

    const startGuide = () => {
      currentStepIndex.value = 0
      updateHighlight()
    }

    // 生命周期
    onMounted(() => {
      if (props.isVisible && props.steps.length > 0) {
        startGuide()
      }
    })

    // 监听visible变化
    const { isVisible, steps } = toRefs(props)
    watch([isVisible, steps], ([visible, steps]) => {
      if (visible && steps.length > 0) {
        startGuide()
      }
    })

    // 监听窗口大小变化
    const handleResize = () => {
      if (props.isVisible) {
        updateHighlight()
      }
    }

    onMounted(() => {
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      currentStepIndex,
      currentStep,
      totalSteps,
      isLastStep,
      highlightStyle,
      tooltipStyle,
      tooltipPosition,
      handleNext,
      handlePrevious,
      handleComplete,
      handleSkip,
      handleBackdropClick
    }
  }
}
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.guide-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: auto;
}

.guide-highlight {
  position: absolute;
  border: 2px solid #ffffff;
  border-radius: 4px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  animation: guideHighlightPulse 2s infinite;
}

@keyframes guideHighlightPulse {
  0%, 100% {
    border-color: #ffffff;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  }
  50% {
    border-color: #fbbf24;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  }
}

.guide-tooltip {
  position: absolute;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: guideTooltipFadeIn 0.3s ease-out;
}

.guide-tooltip.bottom::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #ffffff;
}

.guide-tooltip.top::before {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #ffffff;
}

@keyframes guideTooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.guide-tooltip-content {
  padding: 20px;
}

.guide-tooltip-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.guide-tooltip-description {
  font-size: 14px;
  line-height: 1.5;
  color: #6b7280;
}

.guide-tooltip-extra {
  margin-top: 16px;
}

.guide-tooltip-actions {
  padding: 16px 20px;
  background: #f9fafb;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.guide-tooltip-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.guide-step-indicator {
  font-size: 12px;
  color: #6b7280;
  min-width: 40px;
  text-align: center;
}

.guide-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.guide-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.guide-btn-primary {
  background: #3b82f6;
  color: white;
}

.guide-btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.guide-btn-secondary {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.guide-btn-secondary:hover {
  background: #f3f4f6;
}

.guide-btn-outline {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.guide-btn-outline:hover:not(:disabled) {
  background: #eff6ff;
}
</style>