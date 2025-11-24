<template>
  <Transition name="guide-overlay" appear>
    <div
      v-if="guide.isActive && !guide.isPaused"
      class="guide-overlay"
      :class="{
        'guide-overlay--centered': isCentered,
        'guide-overlay--reduced-motion': reducedMotion
      }"
    >
      <!-- 背景遮罩 -->
      <div
        class="guide-overlay__backdrop"
        @click="handleBackdropClick"
      ></div>

      <!-- 进度条 -->
      <div
        v-if="guide.showProgress && currentGuide"
        class="guide-overlay__progress"
      >
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${guide.progressPercentage}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ guide.currentStepIndex + 1 }} / {{ currentGuide.steps.length }}
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="guide-overlay__toolbar">
        <div class="toolbar-left">
          <h3 v-if="currentGuide" class="guide-title">
            {{ currentGuide.name }}
          </h3>
        </div>

        <div class="toolbar-right">
          <!-- 暂停按钮 -->
          <button
            class="toolbar-btn toolbar-btn--pause"
            @click="guide.togglePause"
            title="暂停引导"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
              <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
            </svg>
          </button>

          <!-- 跳过按钮 -->
          <button
            v-if="guide.showSkipButton"
            class="toolbar-btn toolbar-btn--skip"
            @click="handleSkip"
            title="跳过引导"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 5L19 12L5 19V5Z" fill="currentColor"/>
            </svg>
          </button>

          <!-- 关闭按钮 -->
          <button
            class="toolbar-btn toolbar-btn--close"
            @click="handleClose"
            title="关闭引导"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 引导内容 -->
      <Transition name="guide-content" mode="out-in">
        <div
          v-if="currentStep"
          :key="currentStep.id"
          class="guide-overlay__content"
          :class="[
            `guide-overlay__content--${currentStep.position}`,
            currentStep.customClass
          ]"
          :style="contentStyle"
        >
          <!-- 内容卡片 -->
          <div class="guide-content-card">
            <!-- 步骤标题 -->
            <h4 v-if="currentStep.title" class="guide-content__title">
              {{ currentStep.title }}
            </h4>

            <!-- 步骤内容 -->
            <div class="guide-content__body">
              <!-- 支持HTML内容 -->
              <div v-if="currentStep.content" v-html="currentStep.content"></div>

              <!-- 自定义插槽内容 -->
              <slot :step="currentStep" :guide="currentGuide"></slot>
            </div>

            <!-- 操作按钮 -->
            <div class="guide-content__actions">
              <!-- 上一步按钮 -->
              <button
                v-if="guide.showPrevButton"
                class="guide-btn guide-btn--secondary"
                @click="guide.prevStep"
                :disabled="!guide.canGoPrev"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2"/>
                </svg>
                上一步
              </button>

              <!-- 下一步/完成按钮 -->
              <button
                v-if="guide.showNextButton"
                class="guide-btn guide-btn--primary"
                @click="handleNextStep"
                :disabled="!guide.canGoNext"
              >
                {{ guide.canGoNext ? '下一步' : '完成' }}
                <svg v-if="guide.canGoNext" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <!-- 键盘提示 -->
            <div v-if="showKeyboardHints" class="guide-content__keyboard-hints">
              <div class="keyboard-hint">
                <kbd>→</kbd>
                <kbd>Enter</kbd>
                下一步
              </div>
              <div class="keyboard-hint">
                <kbd>←</kbd>
                上一步
              </div>
              <div class="keyboard-hint">
                <kbd>Esc</kbd>
                跳过
              </div>
            </div>
          </div>

          <!-- 指向箭头 -->
          <div
            v-if="showArrow"
            class="guide-arrow"
            :class="`guide-arrow--${arrowDirection}`"
          ></div>
        </div>
      </Transition>

      <!-- 高亮区域指示器 -->
      <div
        v-if="guide.highlightRect && !isCentered"
        class="guide-highlight-indicator"
        :style="highlightIndicatorStyle"
      >
        <div class="highlight-border"></div>
        <div class="highlight-pulse" v-if="!reducedMotion"></div>
      </div>

      <!-- 移动端触摸提示 -->
      <div
        v-if="isMobile && showTouchHint"
        class="guide-touch-hint"
        @click="handleTouchHint"
      >
        <div class="touch-hint-ripple"></div>
        <div class="touch-hint-text">点击这里继续</div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGuide } from '../../composables/useGuide.js'

export default {
  name: 'GuideOverlay',

  setup() {
    const guide = useGuide()

    // 响应式状态
    const reducedMotion = ref(false)
    const isMobile = ref(false)
    const showKeyboardHints = ref(true)
    const showTouchHint = ref(false)

    // 计算属性
    const currentGuide = computed(() => guide.currentGuide)
    const currentStep = computed(() => guide.currentStep)
    const isCentered = computed(() => currentStep.value?.position === 'center')

    // 内容样式
    const contentStyle = computed(() => {
      if (!currentStep.value || isCentered.value) return {}

      const offset = currentStep.value.offset || { x: 0, y: 0 }
      const highlightRect = guide.highlightRect.value

      if (!highlightRect) return {}

      const position = calculatePosition(currentStep.value.position, highlightRect, offset)

      return {
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: `translate(${position.translateX}px, ${position.translateY}px)`,
        maxWidth: `${position.maxWidth}px`,
        zIndex: 10000
      }
    })

    // 箭头方向
    const arrowDirection = computed(() => {
      if (!currentStep.value || isCentered.value) return 'none'
      return currentStep.value.position || 'top'
    })

    // 是否显示箭头
    const showArrow = computed(() => {
      return !isCentered.value && arrowDirection.value !== 'none'
    })

    // 高亮指示器样式
    const highlightIndicatorStyle = computed(() => {
      const rect = guide.highlightRect.value
      if (!rect) return {}

      const padding = currentStep.value?.highlight?.padding || 8
      const borderRadius = currentStep.value?.highlight?.borderRadius || 4

      return {
        position: 'fixed',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
        borderRadius: `${borderRadius}px`,
        zIndex: 9997,
        pointerEvents: 'none'
      }
    })

    // 计算内容位置
    function calculatePosition(position, highlightRect, offset) {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const contentWidth = 320 // 默认内容宽度
      const contentHeight = 200 // 预估内容高度
      const margin = 20

      let top = 0
      let left = 0
      let translateX = 0
      let translateY = 0
      let maxWidth = Math.min(viewportWidth - margin * 2, 400)

      switch (position) {
        case 'top':
          top = highlightRect.top - contentHeight - margin
          left = highlightRect.left + highlightRect.width / 2
          translateX = -contentWidth / 2
          translateY = -offset.y
          break

        case 'bottom':
          top = highlightRect.bottom + margin
          left = highlightRect.left + highlightRect.width / 2
          translateX = -contentWidth / 2
          translateY = offset.y
          break

        case 'left':
          top = highlightRect.top + highlightRect.height / 2
          left = highlightRect.left - contentWidth - margin
          translateX = -offset.x
          translateY = -contentHeight / 2
          break

        case 'right':
          top = highlightRect.top + highlightRect.height / 2
          left = highlightRect.right + margin
          translateX = offset.x
          translateY = -contentHeight / 2
          break

        default:
          // 居中定位
          top = viewportHeight / 2
          left = viewportWidth / 2
          translateX = -contentWidth / 2
          translateY = -contentHeight / 2
      }

      // 边界检查和调整
      if (left + translateX < margin) {
        translateX = margin - left
      } else if (left + translateX + contentWidth > viewportWidth - margin) {
        translateX = viewportWidth - margin - left - contentWidth
      }

      if (top + translateY < margin) {
        translateY = margin - top
      } else if (top + translateY + contentHeight > viewportHeight - margin) {
        translateY = viewportHeight - margin - top - contentHeight
      }

      return {
        top,
        left,
        translateX,
        translateY,
        maxWidth
      }
    }

    // 事件处理
    function handleBackdropClick() {
      const step = currentStep.value
      if (step?.allowClickOutside) {
        guide.nextStep()
      }
    }

    function handleNextStep() {
      if (guide.canGoNext) {
        guide.nextStep()
      } else {
        guide.stopGuide('complete')
      }
    }

    function handleSkip() {
      guide.stopGuide('skip')
    }

    function handleClose() {
      guide.stopGuide('skip', '用户手动关闭')
    }

    function handleTouchHint() {
      showTouchHint.value = false
      guide.nextStep()
    }

    // 检测设备特性
    function detectDeviceFeatures() {
      // 检测移动设备
      isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      // 检测减少动画偏好
      reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // 监听偏好变化
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handleChange = (e) => {
        reducedMotion.value = e.matches
      }
      mediaQuery.addEventListener('change', handleChange)

      // 监听窗口大小变化
      const handleResize = () => {
        // 重新计算位置
        if (currentStep.value) {
          guide.updateHighlight(currentStep.value)
        }
      }
      window.addEventListener('resize', handleResize, { passive: true })

      // 清理函数
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
        window.removeEventListener('resize', handleResize)
      }
    }

    // 监听步骤变化
    const unwatchStep = guide.$watch(() => guide.currentStepIndex, (newIndex, oldIndex) => {
      if (newIndex !== oldIndex) {
        // 移动端显示触摸提示
        if (isMobile.value && newIndex === 0) {
          showTouchHint.value = true
          setTimeout(() => {
            showTouchHint.value = false
          }, 3000)
        }
      }
    })

    onMounted(() => {
      const cleanup = detectDeviceFeatures()

      // 保存清理函数
      onUnmounted(() => {
        cleanup?.()
        unwatchStep?.()
      })
    })

    return {
      // 状态
      guide,
      reducedMotion,
      isMobile,
      showKeyboardHints,
      showTouchHint,

      // 计算属性
      currentGuide,
      currentStep,
      isCentered,
      contentStyle,
      arrowDirection,
      showArrow,
      highlightIndicatorStyle,

      // 方法
      handleBackdropClick,
      handleNextStep,
      handleSkip,
      handleClose,
      handleTouchHint
    }
  }
}
</script>

<style scoped>
/* 遮罩层 */
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: auto;
}

.guide-overlay__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  animation: fadeIn 0.3s ease-out;
}

/* 进度条 */
.guide-overlay__progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10001;
  padding: 16px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.progress-text {
  text-align: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.8;
}

/* 工具栏 */
.guide-overlay__toolbar {
  position: absolute;
  top: 60px;
  right: 20px;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 200px;
}

.toolbar-left {
  flex: 1;
  margin-right: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.guide-title {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.toolbar-btn--close:hover {
  background: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
}

.toolbar-btn--skip:hover {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

/* 引导内容 */
.guide-overlay__content {
  position: absolute;
  z-index: 10000;
  min-width: 280px;
  max-width: 400px;
}

.guide-overlay__content--centered {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.guide-content-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.guide-content__title {
  padding: 20px 20px 12px;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}

.guide-content__body {
  padding: 0 20px 20px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.guide-content__body :deep(p) {
  margin: 0 0 12px;
}

.guide-content__body :deep(p:last-child) {
  margin-bottom: 0;
}

.guide-content__body :deep(ul),
.guide-content__body :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.guide-content__body :deep(li) {
  margin: 4px 0;
}

.guide-content__body :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
}

.guide-content__actions {
  padding: 16px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.guide-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  user-select: none;
}

.guide-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.guide-btn--secondary {
  background: #ffffff;
  color: #6b7280;
  border-color: #d1d5db;
}

.guide-btn--secondary:hover:not(:disabled) {
  background: #f9fafb;
  color: #4b5563;
  border-color: #9ca3af;
}

.guide-btn--primary {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.guide-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #096dd9, #1890ff);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}

/* 键盘提示 */
.guide-content__keyboard-hints {
  padding: 12px 20px;
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
}

.keyboard-hint {
  display: flex;
  align-items: center;
  gap: 6px;
}

.keyboard-hint kbd {
  display: inline-block;
  padding: 3px 6px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 11px;
  color: #374151;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 指向箭头 */
.guide-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  z-index: 9999;
}

.guide-arrow--top {
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: #ffffff;
  border-bottom: none;
}

.guide-arrow--bottom {
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #ffffff;
  border-top: none;
}

.guide-arrow--left {
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: #ffffff;
  border-right: none;
}

.guide-arrow--right {
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: #ffffff;
  border-left: none;
}

/* 高亮指示器 */
.guide-highlight-indicator {
  pointer-events: none;
  animation: highlightPulse 2s ease-in-out infinite;
}

.highlight-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 3px solid #1890ff;
  border-radius: inherit;
  background: rgba(24, 144, 255, 0.1);
}

.highlight-pulse {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid #1890ff;
  border-radius: inherit;
  opacity: 0;
  animation: pulseEffect 2s ease-in-out infinite;
}

/* 移动端触摸提示 */
.guide-touch-hint {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 24px;
  font-size: 14px;
  z-index: 10002;
  cursor: pointer;
  animation: bounceIn 0.6s ease-out;
}

.touch-hint-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  border: 2px solid #1890ff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: rippleEffect 1.5s ease-out infinite;
}

.touch-hint-text {
  position: relative;
  z-index: 1;
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes highlightPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes pulseEffect {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.1);
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(100px);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) translateY(-10px);
  }
  70% {
    transform: translateX(-50%) translateY(5px);
  }
  100% {
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes rippleEffect {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(3);
  }
}

/* 过渡动画 */
.guide-overlay-enter-active,
.guide-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.guide-overlay-enter-from,
.guide-overlay-leave-to {
  opacity: 0;
}

.guide-content-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.guide-content-leave-active {
  transition: all 0.2s ease-in;
}

.guide-content-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.guide-content-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

/* 减少动画模式 */
.guide-overlay--reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

.guide-overlay--reduced-motion .guide-highlight-indicator,
.guide-overlay--reduced-motion .highlight-pulse,
.guide-overlay--reduced-motion .touch-hint-ripple {
  animation: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .guide-overlay__toolbar {
    top: auto;
    bottom: 20px;
    right: 20px;
    left: 20px;
    min-width: auto;
  }

  .guide-title {
    display: none;
  }

  .guide-overlay__content {
    max-width: calc(100vw - 40px);
  }

  .guide-content__actions {
    flex-direction: column;
    gap: 8px;
  }

  .guide-btn {
    width: 100%;
    justify-content: center;
  }

  .guide-content__keyboard-hints {
    display: none;
  }

  .guide-touch-hint {
    bottom: 100px;
  }
}

@media (max-width: 480px) {
  .guide-overlay__progress {
    padding: 12px;
  }

  .guide-content-card {
    border-radius: 8px;
  }

  .guide-content__title {
    font-size: 16px;
    padding: 16px 16px 8px;
  }

  .guide-content__body {
    padding: 0 16px 16px;
    font-size: 13px;
  }

  .guide-content__actions {
    padding: 12px 16px;
  }
}
</style>