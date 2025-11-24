import { ref, computed, watch } from 'vue'

// 引导步骤配置
export const GUIDE_STEPS = [
  {
    target: '.sql-input-panel',
    title: '欢迎使用数据血缘分析工具！',
    description: '让我们从第一步开始：在这里输入或粘贴您的SQL查询语句。您也可以上传SQL文件进行分析。',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.lineage-level-selector',
    title: '选择血缘分析级别',
    description: '选择<strong>表级</strong>查看表之间的血缘关系，或选择<strong>列级</strong>查看字段级别的详细血缘。',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.sql-dialect-selector',
    title: 'SQL方言检测',
    description: '系统会自动检测您的SQL方言，也支持手动指定MySQL、PostgreSQL、SparkSQL等多种方言。',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.analyze-button',
    title: '开始分析',
    description: '点击这个按钮开始分析您的SQL查询。系统会自动解析血缘关系并生成可视化图表。',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.lineage-canvas',
    title: '血缘可视化图表',
    description: '在这里查看您的数据血缘关系图。不同颜色代表不同类型的表：<br>🟢 来源表 | 🔵 中间表 | 🟠 结果表',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.search-input',
    title: '智能搜索',
    description: '使用搜索功能快速找到特定的表或字段。支持模糊匹配，响应速度极快！',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.control-panel',
    title: '控制面板',
    description: '在这里可以查看节点列表、批量操作、导出结果等。试试关键路径分析功能！',
    extraContent: null,
    showSkip: true
  },
  {
    target: '.mini-map',
    title: '小地图导航',
    description: '当血缘关系复杂时，使用小地图快速导航。点击小地图可以快速定位到不同区域。',
    extraContent: null,
    showSkip: false
  }
]

export function useGuide() {
  const isGuideVisible = ref(false)
  const currentStepIndex = ref(0)
  const hasCompletedGuide = ref(false)

  // 检查是否已完成引导
  const checkGuideCompletion = () => {
    const completed = localStorage.getItem('guide_completed')
    hasCompletedGuide.value = completed === 'true'
    return hasCompletedGuide.value
  }

  // 开始引导
  const startGuide = () => {
    isGuideVisible.value = true
    currentStepIndex.value = 0
  }

  // 重新开始引导
  const restartGuide = () => {
    localStorage.removeItem('guide_completed')
    hasCompletedGuide.value = false
    startGuide()
  }

  // 完成引导
  const completeGuide = () => {
    isGuideVisible.value = false
    hasCompletedGuide.value = true
    localStorage.setItem('guide_completed', 'true')
    localStorage.setItem('guide_completed_at', new Date().toISOString())
  }

  // 跳过引导
  const skipGuide = () => {
    isGuideVisible.value = false
    localStorage.setItem('guide_completed', 'true')
    localStorage.setItem('guide_skipped_at', new Date().toISOString())
  }

  // 检查是否应该显示引导（首次访问）
  const shouldShowGuide = () => {
    if (checkGuideCompletion()) {
      return false
    }

    // 检查是否是首次访问
    const hasVisitedBefore = localStorage.getItem('first_visit_time')
    if (!hasVisitedBefore) {
      localStorage.setItem('first_visit_time', new Date().toISOString())
      return true
    }

    return false
  }

  // 自动显示引导（如果是首次访问）
  const autoShowGuide = () => {
    if (shouldShowGuide()) {
      // 延迟1秒显示，让页面先完全加载
      setTimeout(() => {
        startGuide()
      }, 1000)
    }
  }

  // 获取引导统计
  const getGuideStats = () => {
    return {
      completed: hasCompletedGuide.value,
      completedAt: localStorage.getItem('guide_completed_at'),
      skippedAt: localStorage.getItem('guide_skipped_at'),
      firstVisitAt: localStorage.getItem('first_visit_time')
    }
  }

  // 监听引导状态变化
  const onGuideStepChange = (stepIndex, step) => {
    currentStepIndex.value = stepIndex
    // 可以在这里添加统计或日志记录
    console.log(`Guide step ${stepIndex + 1}: ${step.title}`)
  }

  const onGuideComplete = () => {
    completeGuide()
    console.log('Guide completed')
  }

  const onGuideSkip = () => {
    skipGuide()
    console.log('Guide skipped')
  }

  // 初始化
  const initGuide = () => {
    checkGuideCompletion()
  }

  return {
    isGuideVisible,
    currentStepIndex,
    hasCompletedGuide,
    guideSteps: GUIDE_STEPS,

    // 方法
    startGuide,
    restartGuide,
    completeGuide,
    skipGuide,
    shouldShowGuide,
    autoShowGuide,
    checkGuideCompletion,
    getGuideStats,
    initGuide,

    // 事件处理
    onGuideStepChange,
    onGuideComplete,
    onGuideSkip
  }
}

// 引导配置
export const GUIDE_CONFIG = {
  // 是否启用引导功能
  enabled: true,

  // 是否在首次访问时自动显示
  autoShow: true,

  // 引导显示延迟（毫秒）
  autoShowDelay: 1000,

  // 是否允许跳过引导
  allowSkip: true,

  // 引导完成后是否显示提示
  showCompletionMessage: true,

  // 是否记录引导统计
  trackStats: true
}