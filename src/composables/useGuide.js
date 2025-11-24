import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { GuideStep, GuideConfig, GuideState, GuideEvent, KeyboardShortcuts } from '../types/guide-animation.ts'

/**
 * 新手引导相关的Composable
 * 提供完整的引导流程控制、状态管理和用户交互功能
 */
export function useGuide() {
  // 核心状态
  const isActive = ref(false)
  const currentStepIndex = ref(0)
  const currentGuideId = ref('')
  const isPaused = ref(false)
  const isLoading = ref(false)
  const showProgress = ref(true)

  // 引导状态管理
  const guideState = reactive<GuideState>({
    isActive: false,
    currentStep: 0,
    completedGuides: [],
    skippedGuides: [],
    progress: {},
    lastActiveTime: 0,
    userPreferences: {
      autoStart: true,
      showTooltips: true,
      animationSpeed: 1.0,
      enableKeyboardNavigation: true
    }
  })

  // 引导配置存储
  const guides = ref<Map<string, GuideConfig>>(new Map())
  const currentGuide = ref<GuideConfig | null>(null)
  const currentStep = ref<GuideStep | null>(null)

  // 高亮元素相关
  const highlightedElement = ref<HTMLElement | null>(null)
  const highlightOverlay = ref<HTMLElement | null>(null)
  const highlightRect = ref<DOMRect | null>(null)

  // 事件系统
  const eventListeners = new Map<string, Function[]>()

  // 键盘快捷键配置
  const shortcuts: KeyboardShortcuts = {
    nextStep: ['ArrowRight', 'Enter'],
    prevStep: ['ArrowLeft'],
    skipGuide: ['Escape'],
    pauseGuide: [' '],
    toggleAnimation: ['a'],
    resetGuide: ['r']
  }

  /**
   * 注册引导配置
   * @param {GuideConfig} guideConfig - 引导配置
   */
  function registerGuide(guideConfig) {
    guides.value.set(guideConfig.id, guideConfig)

    // 检查是否需要自动启动
    if (guideConfig.showOnFirstVisit && !hasGuideCompleted(guideConfig.id)) {
      nextTick(() => {
        if (shouldAutoStart(guideConfig)) {
          startGuide(guideConfig.id)
        }
      })
    }
  }

  /**
   * 启动引导
   * @param {string} guideId - 引导ID
   * @param {number} startStep - 起始步骤索引
   */
  async function startGuide(guideId, startStep = 0) {
    const guide = guides.value.get(guideId)
    if (!guide) {
      console.error(`引导配置不存在: ${guideId}`)
      return false
    }

    // 检查启动条件
    if (!checkGuideConditions(guide)) {
      return false
    }

    isLoading.value = true

    try {
      currentGuideId.value = guideId
      currentGuide.value = guide
      currentStepIndex.value = startStep
      isActive.value = true
      isPaused.value = false
      guideState.isActive = true
      guideState.currentStep = startStep

      // 触发开始事件
      emitEvent('start', guideId)

      await nextTick()
      await updateCurrentStep()
      setupKeyboardNavigation()
      setupScrollListener()

      guideState.lastActiveTime = Date.now()
      isLoading.value = false

      return true
    } catch (error) {
      console.error('启动引导失败:', error)
      isLoading.value = false
      return false
    }
  }

  /**
   * 停止引导
   * @param {'complete' | 'skip' | 'error'} reason - 停止原因
   * @param {string} message - 附加消息
   */
  function stopGuide(reason = 'skip', message = '') {
    if (!isActive.value) return

    // 记录引导结果
    if (reason === 'complete') {
      markGuideCompleted(currentGuideId.value)
    } else if (reason === 'skip') {
      markGuideSkipped(currentGuideId.value)
    }

    // 触发事件
    emitEvent(reason, currentGuideId.value, { message })

    // 清理状态
    cleanup()
    resetHighlight()

    isActive.value = false
    isPaused.value = false
    currentGuide.value = null
    currentStep.value = null
    currentStepIndex.value = 0
    currentGuideId.value = ''

    guideState.isActive = false
    guideState.currentStep = 0
  }

  /**
   * 暂停/恢复引导
   */
  function togglePause() {
    if (!isActive.value) return

    isPaused.value = !isPaused.value
    emitEvent(isPaused.value ? 'pause' : 'resume', currentGuideId.value)
  }

  /**
   * 下一步
   */
  async function nextStep() {
    if (!isActive.value || isPaused.value) return false

    const guide = currentGuide.value
    if (!guide || currentStepIndex.value >= guide.steps.length - 1) {
      stopGuide('complete')
      return true
    }

    // 验证当前步骤
    if (currentStep.value?.validation && !currentStep.value.validation()) {
      return false
    }

    // 执行当前步骤回调
    if (currentStep.value?.callback) {
      try {
        await currentStep.value.callback()
      } catch (error) {
        console.error('引导步骤回调执行失败:', error)
      }
    }

    currentStepIndex.value++
    guideState.currentStep = currentStepIndex.value

    await updateCurrentStep()
    emitEvent('step', currentGuideId.value, {
      stepIndex: currentStepIndex.value,
      stepId: currentStep.value?.id,
      direction: 'next'
    })

    return true
  }

  /**
   * 上一步
   */
  async function prevStep() {
    if (!isActive.value || isPaused.value) return false
    if (currentStepIndex.value <= 0) return false

    currentStepIndex.value--
    guideState.currentStep = currentStepIndex.value

    await updateCurrentStep()
    emitEvent('step', currentGuideId.value, {
      stepIndex: currentStepIndex.value,
      stepId: currentStep.value?.id,
      direction: 'prev'
    })

    return true
  }

  /**
   * 跳转到指定步骤
   * @param {number} stepIndex - 步骤索引
   */
  async function goToStep(stepIndex) {
    if (!isActive.value) return false

    const guide = currentGuide.value
    if (!guide || stepIndex < 0 || stepIndex >= guide.steps.length) {
      return false
    }

    currentStepIndex.value = stepIndex
    guideState.currentStep = stepIndex

    await updateCurrentStep()
    emitEvent('step', currentGuideId.value, {
      stepIndex,
      stepId: currentStep.value?.id,
      direction: 'jump'
    })

    return true
  }

  /**
   * 更新当前步骤
   */
  async function updateCurrentStep() {
    if (!currentGuide.value) return

    const guide = currentGuide.value
    const step = guide.steps[currentStepIndex.value]
    currentStep.value = step

    if (!step) return

    // 延迟执行（如果有配置）
    if (step.delay && step.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delay))
    }

    // 滚动到目标元素
    if (step.scrollIntoView) {
      await scrollToTarget(step)
    }

    // 更新高亮
    await updateHighlight(step)

    // 更新进度
    updateProgress()
  }

  /**
   * 更新高亮元素
   * @param {GuideStep} step - 当前步骤
   */
  async function updateHighlight(step) {
    resetHighlight()

    if (!step.target || step.position === 'center') return

    try {
      const element = document.querySelector(step.target)
      if (!element) {
        console.warn(`未找到目标元素: ${step.target}`)
        return
      }

      highlightedElement.value = element
      highlightRect.value = element.getBoundingClientRect()

      // 添加高亮样式
      if (step.highlight) {
        applyHighlightStyles(element, step.highlight)
      }

      // 创建遮罩层
      createHighlightOverlay(step)

    } catch (error) {
      console.error('更新高亮失败:', error)
    }
  }

  /**
   * 重置高亮
   */
  function resetHighlight() {
    // 移除元素高亮样式
    if (highlightedElement.value) {
      highlightedElement.value.style.removeProperty('z-index')
      highlightedElement.value.style.removeProperty('position')
      highlightedElement.value.style.removeProperty('box-shadow')
      highlightedElement.value = null
    }

    // 移除遮罩层
    if (highlightOverlay.value && highlightOverlay.value.parentNode) {
      highlightOverlay.value.parentNode.removeChild(highlightOverlay.value)
      highlightOverlay.value = null
    }

    highlightRect.value = null
  }

  /**
   * 应用高亮样式
   * @param {HTMLElement} element - 目标元素
   * @param {Object} config - 高亮配置
   */
  function applyHighlightStyles(element, config) {
    const computedStyle = getComputedStyle(element)

    element.style.zIndex = '10000'
    if (computedStyle.position === 'static') {
      element.style.position = 'relative'
    }

    if (!config.hideBackground) {
      const padding = config.padding || 8
      const borderRadius = config.borderRadius || 4

      element.style.boxShadow = `0 0 0 ${padding}px rgba(24, 144, 255, 0.3), 0 0 0 ${padding + 2}px rgba(24, 144, 255, 0.6)`
      element.style.borderRadius = `${borderRadius}px`
    }
  }

  /**
   * 创建高亮遮罩层
   * @param {GuideStep} step - 当前步骤
   */
  function createHighlightOverlay(step) {
    if (!highlightRect.value) return

    const overlay = document.createElement('div')
    overlay.className = 'guide-highlight-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      pointer-events: auto;
    `

    // 创建高亮窗口（镂空效果）
    const highlight = step.highlight || {}
    const padding = highlight.padding || 8

    const highlightWindow = document.createElement('div')
    highlightWindow.style.cssText = `
      position: absolute;
      top: ${highlightRect.value.top - padding}px;
      left: ${highlightRect.value.left - padding}px;
      width: ${highlightRect.value.width + padding * 2}px;
      height: ${highlightRect.value.height + padding * 2}px;
      background: transparent;
      border-radius: ${highlight.borderRadius || 4}px;
      box-shadow: 0 0 0 10000px rgba(0, 0, 0, 0.5);
    `

    overlay.appendChild(highlightWindow)
    document.body.appendChild(overlay)
    highlightOverlay.value = overlay

    // 点击遮罩层处理
    if (!step.allowClickOutside) {
      overlay.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
      })
    }
  }

  /**
   * 滚动到目标元素
   * @param {GuideStep} step - 当前步骤
   */
  async function scrollToTarget(step) {
    if (!step.target) return

    try {
      const element = document.querySelector(step.target)
      if (!element) return

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })

      // 等待滚动完成
      await new Promise(resolve => {
        const checkScroll = () => {
          if (Math.abs(element.getBoundingClientRect().top - window.innerHeight / 2) < 100) {
            resolve()
          } else {
            requestAnimationFrame(checkScroll)
          }
        }
        requestAnimationFrame(checkScroll)
      })

    } catch (error) {
      console.error('滚动到目标元素失败:', error)
    }
  }

  /**
   * 检查引导启动条件
   * @param {GuideConfig} guide - 引导配置
   */
  function checkGuideConditions(guide) {
    if (!guide.conditions) return true

    const { pathname, hasData, userRole, featureFlag } = guide.conditions

    // 检查路径
    if (pathname && !window.location.pathname.includes(pathname)) {
      return false
    }

    // 检查数据条件（需要根据实际应用调整）
    if (hasData !== undefined) {
      const hasAnyData = checkHasData()
      if (hasData !== hasAnyData) {
        return false
      }
    }

    // 检查用户角色（需要根据实际应用调整）
    if (userRole) {
      const currentUser = getCurrentUser()
      if (!currentUser || currentUser.role !== userRole) {
        return false
      }
    }

    // 检查功能开关（需要根据实际应用调整）
    if (featureFlag) {
      if (!isFeatureEnabled(featureFlag)) {
        return false
      }
    }

    return true
  }

  /**
   * 检查是否应该自动启动
   * @param {GuideConfig} guide - 引导配置
   */
  function shouldAutoStart(guide) {
    if (!guide.autoStart) return false
    if (hasGuideCompleted(guide.id)) return false
    if (hasGuideSkipped(guide.id)) return false

    // 检查用户偏好
    return guideState.userPreferences.autoStart
  }

  /**
   * 设置键盘导航
   */
  function setupKeyboardNavigation() {
    if (!guideState.userPreferences.enableKeyboardNavigation) return

    const handleKeydown = (event) => {
      if (!isActive.value || isPaused.value) return

      const key = event.key
      let handled = false

      // 检查快捷键
      if (shortcuts.nextStep.includes(key)) {
        handled = nextStep()
      } else if (shortcuts.prevStep.includes(key)) {
        handled = prevStep()
      } else if (shortcuts.skipGuide.includes(key)) {
        stopGuide('skip')
        handled = true
      } else if (shortcuts.pauseGuide.includes(key)) {
        togglePause()
        handled = true
      } else if (shortcuts.resetGuide.includes(key)) {
        goToStep(0)
        handled = true
      }

      if (handled) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleKeydown)
  }

  /**
   * 设置滚动监听
   */
  function setupScrollListener() {
    const handleScroll = () => {
      if (currentStep.value && currentStep.value.scrollIntoView) {
        updateHighlight(currentStep.value)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  /**
   * 清理资源
   */
  function cleanup() {
    // 移除事件监听器
    document.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('scroll', handleScroll)

    // 清理高亮
    resetHighlight()
  }

  /**
   * 更新进度
   */
  function updateProgress() {
    if (!currentGuide.value) return

    const progress = (currentStepIndex.value + 1) / currentGuide.value.steps.length
    guideState.progress[currentGuideId.value] = progress
  }

  /**
   * 标记引导完成
   * @param {string} guideId - 引导ID
   */
  function markGuideCompleted(guideId) {
    if (!guideState.completedGuides.includes(guideId)) {
      guideState.completedGuides.push(guideId)
      saveToStorage()
    }
  }

  /**
   * 标记引导跳过
   * @param {string} guideId - 引导ID
   */
  function markGuideSkipped(guideId) {
    if (!guideState.skippedGuides.includes(guideId)) {
      guideState.skippedGuides.push(guideId)
      saveToStorage()
    }
  }

  /**
   * 检查引导是否完成
   * @param {string} guideId - 引导ID
   */
  function hasGuideCompleted(guideId) {
    return guideState.completedGuides.includes(guideId)
  }

  /**
   * 检查引导是否跳过
   * @param {string} guideId - 引导ID
   */
  function hasGuideSkipped(guideId) {
    return guideState.skippedGuides.includes(guideId)
  }

  /**
   * 重置引导状态
   * @param {string} guideId - 引导ID（可选，不传则重置所有）
   */
  function resetGuide(guideId) {
    if (guideId) {
      const index = guideState.completedGuides.indexOf(guideId)
      if (index !== -1) {
        guideState.completedGuides.splice(index, 1)
      }

      const skipIndex = guideState.skippedGuides.indexOf(guideId)
      if (skipIndex !== -1) {
        guideState.skippedGuides.splice(skipIndex, 1)
      }

      delete guideState.progress[guideId]
    } else {
      guideState.completedGuides = []
      guideState.skippedGuides = []
      guideState.progress = {}
    }

    saveToStorage()
  }

  /**
   * 触发事件
   * @param {string} type - 事件类型
   * @param {string} guideId - 引导ID
   * @param {any} data - 事件数据
   */
  function emitEvent(type, guideId, data = {}) {
    const event = {
      type,
      guideId,
      data,
      timestamp: Date.now()
    }

    // 触发注册的监听器
    const listeners = eventListeners.get(type) || []
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('事件监听器执行失败:', error)
      }
    })

    // 触发全局事件
    window.dispatchEvent(new CustomEvent('guide-event', { detail: event }))
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
   * 保存状态到本地存储
   */
  function saveToStorage() {
    try {
      const stateToSave = {
        completedGuides: guideState.completedGuides,
        skippedGuides: guideState.skippedGuides,
        progress: guideState.progress,
        userPreferences: guideState.userPreferences
      }
      localStorage.setItem('guide-state', JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('保存引导状态失败:', error)
    }
  }

  /**
   * 从本地存储加载状态
   */
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('guide-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.assign(guideState, parsed)
      }
    } catch (error) {
      console.warn('加载引导状态失败:', error)
    }
  }

  /**
   * 获取当前进度百分比
   */
  const progressPercentage = computed(() => {
    if (!currentGuide.value) return 0
    return ((currentStepIndex.value + 1) / currentGuide.value.steps.length) * 100
  })

  /**
   * 检查是否可以下一步
   */
  const canGoNext = computed(() => {
    if (!currentGuide.value) return false
    return currentStepIndex.value < currentGuide.value.steps.length - 1
  })

  /**
   * 检查是否可以上一步
   */
  const canGoPrev = computed(() => {
    return currentStepIndex.value > 0
  })

  /**
   * 检查是否显示跳过按钮
   */
  const showSkipButton = computed(() => {
    if (!currentStep.value) return false
    return currentStep.value.showSkip !== false
  })

  /**
   * 检查是否显示上一步按钮
   */
  const showPrevButton = computed(() => {
    if (!currentStep.value) return false
    return canGoPrev.value && currentStep.value.showPrev !== false
  })

  /**
   * 检查是否显示下一步按钮
   */
  const showNextButton = computed(() => {
    if (!currentStep.value) return false
    return canGoNext.value && currentStep.value.showNext !== false
  })

  /**
   * 辅助函数（需要根据实际应用实现）
   */
  function checkHasData() {
    // 检查应用是否有数据
    return document.querySelector('[data-has-data="true"]') !== null
  }

  function getCurrentUser() {
    // 获取当前用户信息
    return window.currentUser || { role: 'user' }
  }

  function isFeatureEnabled(feature) {
    // 检查功能开关是否启用
    return window.featureFlags?.[feature] === true
  }

  // 组件挂载时加载状态
  onMounted(() => {
    loadFromStorage()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  // 监听用户偏好变化
  watch(() => guideState.userPreferences, () => {
    saveToStorage()
  }, { deep: true })

  return {
    // 状态
    isActive,
    isPaused,
    isLoading,
    showProgress,
    currentGuide,
    currentStep,
    currentStepIndex,
    guideState,
    highlightRect,

    // 计算属性
    progressPercentage,
    canGoNext,
    canGoPrev,
    showSkipButton,
    showPrevButton,
    showNextButton,

    // 方法
    registerGuide,
    startGuide,
    stopGuide,
    togglePause,
    nextStep,
    prevStep,
    goToStep,
    resetGuide,

    // 事件
    addEventListener,
    removeEventListener,

    // 辅助
    hasGuideCompleted,
    hasGuideSkipped,
    markGuideCompleted,
    markGuideSkipped,
    saveToStorage,
    loadFromStorage,

    // 样式相关
    updateHighlight,
    resetHighlight,
    scrollToTarget
  }
}