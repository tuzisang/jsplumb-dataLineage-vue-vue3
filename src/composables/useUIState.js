import { ref, reactive, nextTick } from 'vue';
import { PerformanceConfig, SearchOptions } from '../types/index.js';

/**
 * UI状态管理相关的composable
 */
export function useUIState() {
  // 基础UI状态
  const showToast = ref(false);
  const toastMessage = ref('');
  const toastTimer = ref(null);
  const focusedNode = ref(null);
  const isMinimized = ref(false);
  const isNodeListMinimized = ref(false);
  const panelWidth = ref(350);
  const isResizing = ref(false);
  const lastMouseX = ref(0);

  // 搜索相关状态
  const searchQuery = ref('');
  const showDropdown = ref(false);
  const filteredFields = ref([]);
  const nodeSearchQuery = ref('');
  const searchOptions = reactive({
    mode: 'contains',
    searchInTableNames: true,
    searchInFieldNames: true,
    caseSensitive: false
  });

  // 表类型筛选状态
  const selectedTableTypes = ref(['Origin', 'Middle', 'RS']);
  const showTypeFilter = ref(false);
  const groupByType = ref(true);
  const groupCollapseState = reactive({
    Origin: false,
    Middle: false,
    RS: false
  });

  // 关键路径状态
  const showOnlyCriticalPath = ref(false);
  const listMode = ref('table'); // 'table' | 'field'
  const selectedTables = ref([]);
  const selectedFields = ref([]);
  const highlightedTables = ref([]);
  const highlightedFields = ref([]);

  // 关键血缘显示状态
  const isShowingCriticalLineage = ref(false);
  const currentFieldIndex = ref(0);
  const currentTableIndex = ref(0);

  // 小地图相关
  const miniMapWidth = ref(180);
  const miniMapHeight = ref(120);
  const isMiniMapResizing = ref(false);

  // 历史记录面板
  const showHistoryPanel = ref(true);

  // 面板尺寸限制
  const minPanelWidth = ref(280);
  const maxPanelWidth = ref(600);

  // 性能配置
  const performanceConfig = reactive({
    enableAlignmentLines: false,
    redrawConnectionsWhileDragging: false,
    useHardwareAcceleration: true,
    enableSmoothScroll: false,
    enableAnimations: true,
    highPerformanceMode: true,
    showPerformanceStats: false
  });

  // 引导系统状态
  const guideEnabled = ref(true);
  const showGuideOverlay = ref(false);
  const guideStepIndex = ref(0);
  const guideCompleted = ref(new Set());
  const guideSkipped = ref(new Set());
  const autoStartGuide = ref(true);
  const showGuideProgress = ref(true);

  // 动画系统状态
  const animationEnabled = ref(true);
  const reducedMotion = ref(false);
  const animationPerformanceMode = ref(false);
  const activeAnimationsCount = ref(0);
  const animationSettings = reactive({
    speed: 1.0,
    intensity: 0.8,
    colorTheme: 'default',
    maxConcurrent: 10,
    frameRate: 60
  });

  // 表类型配置（从外部传入）
  let tableTypes = [];

  /**
   * 设置表类型配置
   * @param {Array} types - 表类型配置
   */
  function setTableTypes(types) {
    tableTypes = types;
  }

  /**
   * 显示提示消息
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒）
   */
  function showToastMessage(message, duration = 2000) {
    toastMessage.value = message;
    showToast.value = true;

    if (toastTimer.value) {
      clearTimeout(toastTimer.value);
    }

    toastTimer.value = setTimeout(() => {
      showToast.value = false;
    }, duration);
  }

  /**
   * 清空提示消息
   */
  function clearToast() {
    if (toastTimer.value) {
      clearTimeout(toastTimer.value);
      toastTimer.value = null;
    }
    showToast.value = false;
    toastMessage.value = '';
  }

  /**
   * 切换最小化状态
   */
  function toggleMinimize() {
    isMinimized.value = !isMinimized.value;
  }

  /**
   * 切换节点列表最小化状态
   */
  function toggleNodeListMinimize() {
    isNodeListMinimized.value = !isNodeListMinimized.value;
  }

  /**
   * 切换类型筛选显示
   */
  function toggleTypeFilter() {
    showTypeFilter.value = !showTypeFilter.value;
  }

  /**
   * 切换是否按类型分组
   */
  function toggleGroupByType() {
    groupByType.value = !groupByType.value;
  }

  /**
   * 切换历史记录面板
   */
  function toggleHistoryPanel() {
    showHistoryPanel.value = !showHistoryPanel.value;
  }

  /**
   * 设置搜索查询
   * @param {string} query - 搜索查询
   */
  function setSearchQuery(query) {
    searchQuery.value = query;
    if (!query.trim()) {
      filteredFields.value = [];
      showDropdown.value = false;
    }
  }

  /**
   * 设置节点搜索查询
   * @param {string} query - 节点搜索查询
   */
  function setNodeSearchQuery(query) {
    nodeSearchQuery.value = query;
  }

  /**
   * 添加筛选字段
   * @param {Array} fields - 筛选字段列表
   */
  function setFilteredFields(fields) {
    filteredFields.value = fields;
  }

  /**
   * 显示下拉框
   */
  function showSearchDropdown() {
    showDropdown.value = true;
  }

  /**
   * 隐藏下拉框
   */
  function hideSearchDropdown() {
    showDropdown.value = false;
  }

  /**
   * 清空搜索
   */
  function clearSearch() {
    searchQuery.value = '';
    filteredFields.value = [];
    showDropdown.value = false;
    nodeSearchQuery.value = '';
  }

  /**
   * 设置焦点节点
   * @param {string} nodeId - 节点ID
   */
  function setFocusedNode(nodeId) {
    focusedNode.value = nodeId;
  }

  /**
   * 清除焦点节点
   */
  function clearFocusedNode() {
    focusedNode.value = null;
  }

  /**
   * 选择所有表类型
   */
  function selectAllTypes() {
    selectedTableTypes.value = tableTypes.map(type => type.type);
  }

  /**
   * 清空所有表类型选择
   */
  function clearAllTypes() {
    selectedTableTypes.value = [];
  }

  /**
   * 切换分组折叠状态
   * @param {string} type - 表类型
   */
  function toggleGroupCollapse(type) {
    groupCollapseState[type] = !groupCollapseState[type];
  }

  /**
   * 判断分组是否折叠
   * @param {string} type - 表类型
   * @returns {boolean} 是否折叠
   */
  function isGroupCollapsed(type) {
    return !!groupCollapseState[type];
  }

  /**
   * 设置列表模式
   * @param {string} mode - 列表模式 ('table' | 'field')
   */
  function setListMode(mode) {
    listMode.value = mode;
  }

  /**
   * 切换关键路径显示
   */
  function toggleCriticalPath() {
    showOnlyCriticalPath.value = !showOnlyCriticalPath.value;
  }

  /**
   * 设置关键路径显示状态
   * @param {boolean} show - 是否显示
   */
  function setCriticalPathShow(show) {
    showOnlyCriticalPath.value = show;
  }

  /**
   * 添加选中的表
   * @param {string} tableName - 表名
   */
  function addSelectedTable(tableName) {
    if (!selectedTables.value.includes(tableName)) {
      selectedTables.value.push(tableName);
    }
  }

  /**
   * 移除选中的表
   * @param {string} tableName - 表名
   */
  function removeSelectedTable(tableName) {
    const index = selectedTables.value.indexOf(tableName);
    if (index !== -1) {
      selectedTables.value.splice(index, 1);
    }
  }

  /**
   * 清空选中的表
   */
  function clearSelectedTables() {
    selectedTables.value = [];
  }

  /**
   * 添加选中的字段
   * @param {string} field - 字段名 (格式: tableName.fieldName)
   */
  function addSelectedField(field) {
    if (!selectedFields.value.includes(field)) {
      selectedFields.value.push(field);
    }
  }

  /**
   * 移除选中的字段
   * @param {string} field - 字段名
   */
  function removeSelectedField(field) {
    const index = selectedFields.value.indexOf(field);
    if (index !== -1) {
      selectedFields.value.splice(index, 1);
    }
  }

  /**
   * 清空选中的字段
   */
  function clearSelectedFields() {
    selectedFields.value = [];
  }

  /**
   * 设置高亮的表
   * @param {Array} tables - 表名列表
   */
  function setHighlightedTables(tables) {
    highlightedTables.value = [...tables];
  }

  /**
   * 添加高亮的表
   * @param {string} tableName - 表名
   */
  function addHighlightedTable(tableName) {
    if (!highlightedTables.value.includes(tableName)) {
      highlightedTables.value.push(tableName);
    }
  }

  /**
   * 清空高亮的表
   */
  function clearHighlightedTables() {
    highlightedTables.value = [];
  }

  /**
   * 设置高亮的字段
   * @param {Array} fields - 字段名列表
   */
  function setHighlightedFields(fields) {
    highlightedFields.value = [...fields];
  }

  /**
   * 添加高亮的字段
   * @param {string} field - 字段名
   */
  function addHighlightedField(field) {
    if (!highlightedFields.value.includes(field)) {
      highlightedFields.value.push(field);
    }
  }

  /**
   * 清空高亮的字段
   */
  function clearHighlightedFields() {
    highlightedFields.value = [];
  }

  /**
   * 设置当前字段索引
   * @param {number} index - 索引
   */
  function setCurrentFieldIndex(index) {
    currentFieldIndex.value = index;
  }

  /**
   * 设置当前表索引
   * @param {number} index - 索引
   */
  function setCurrentTableIndex(index) {
    currentTableIndex.value = index;
  }

  /**
   * 重置所有选择和高亮状态
   */
  function resetSelections() {
    selectedTables.value = [];
    selectedFields.value = [];
    highlightedTables.value = [];
    highlightedFields.value = [];
    currentFieldIndex.value = 0;
    currentTableIndex.value = 0;
  }

  /**
   * 设置关键血缘显示状态
   * @param {boolean} showing - 是否显示
   */
  function setShowingCriticalLineage(showing) {
    isShowingCriticalLineage.value = showing;
  }

  /**
   * 开始面板调整大小
   * @param {MouseEvent} event - 鼠标事件
   */
  function startResize(event) {
    isResizing.value = true;
    lastMouseX.value = event.clientX;
  }

  /**
   * 停止面板调整大小
   */
  function stopResize() {
    isResizing.value = false;
  }

  /**
   * 更新面板宽度
   * @param {number} deltaX - 水平移动距离
   */
  function updatePanelWidth(deltaX) {
    const newWidth = panelWidth.value + deltaX;
    if (newWidth >= minPanelWidth.value && newWidth <= maxPanelWidth.value) {
      panelWidth.value = newWidth;
    }
  }

  /**
   * 设置小地图尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  function setMiniMapSize(width, height) {
    miniMapWidth.value = width;
    miniMapHeight.value = height;
  }

  /**
   * 切换小地图调整大小状态
   */
  function toggleMiniMapResizing() {
    isMiniMapResizing.value = !isMiniMapResizing.value;
  }

  /**
   * 切换高性能模式
   */
  function toggleHighPerformanceMode() {
    performanceConfig.highPerformanceMode = !performanceConfig.highPerformanceMode;
    
    if (performanceConfig.highPerformanceMode) {
      // 启用高性能模式
      performanceConfig.enableAnimations = false;
      performanceConfig.enableSmoothScroll = false;
      performanceConfig.enableAlignmentLines = false;
      showToastMessage('已启用高性能模式，提升操作流畅度');
    } else {
      // 恢复标准模式
      performanceConfig.enableAnimations = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
      performanceConfig.enableSmoothScroll = true;
      performanceConfig.enableAlignmentLines = true;
      showToastMessage('已切换到标准模式，视觉效果更佳');
    }

    // 保存用户偏好到localStorage
    try {
      localStorage.setItem('highPerformanceMode', performanceConfig.highPerformanceMode ? 'true' : 'false');
    } catch (e) {
      console.warn('无法保存性能模式偏好:', e);
    }
  }

  /**
   * 设置性能配置
   * @param {Partial<PerformanceConfig>} config - 性能配置
   */
  function setPerformanceConfig(config) {
    Object.assign(performanceConfig, config);
  }

  /**
   * 应用高性能模式配置
   */
  function applyHighPerformanceMode() {
    // 减少缓存大小等优化配置
    // 这里可以添加更多的性能优化设置
  }

  /**
   * 检测设备性能并自动设置性能模式
   */
  function detectDevicePerformance() {
    try {
      // 读取用户保存的性能模式偏好
      const savedPreference = localStorage.getItem('highPerformanceMode');
      if (savedPreference !== null) {
        performanceConfig.highPerformanceMode = savedPreference === 'true';
        return;
      }
    } catch (e) {
      console.warn('无法加载性能模式偏好:', e);
    }

    // 简单性能检测
    const start = performance.now();
    let count = 0;
    while (performance.now() - start < 5) {
      count++;
    }

    // 如果性能较低，自动启用高性能模式
    if (count < 100000) {
      performanceConfig.highPerformanceMode = true;
      performanceConfig.enableAnimations = false;
      performanceConfig.enableSmoothScroll = false;
      performanceConfig.enableAlignmentLines = false;
      applyHighPerformanceMode();
      showToastMessage('已自动启用高性能模式以提升流畅度');
    }

    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      performanceConfig.highPerformanceMode = true;
      performanceConfig.enableAnimations = false;
      applyHighPerformanceMode();
    }

    // 检测是否为低内存设备
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      performanceConfig.highPerformanceMode = true;
      performanceConfig.enableAnimations = false;
      applyHighPerformanceMode();
    }

    // 检测是否为低端CPU
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      performanceConfig.highPerformanceMode = true;
      performanceConfig.enableAnimations = false;
      applyHighPerformanceMode();
    }
  }

  /**
   * 设置搜索选项
   * @param {Partial<SearchOptions>} options - 搜索选项
   */
  function setSearchOptions(options) {
    Object.assign(searchOptions, options);
  }

  /**
   * 清理所有状态
   */
  function cleanup() {
    clearToast();
    clearSearch();
    clearFocusedNode();
    resetSelections();
    isResizing.value = false;
    isMiniMapResizing.value = false;
  }

  // ================================
  // 引导系统相关方法
  // ================================

  /**
   * 切换引导系统启用状态
   */
  function toggleGuideEnabled() {
    guideEnabled.value = !guideEnabled.value;
    saveUserPreferences();
  }

  /**
   * 显示引导覆盖层
   */
  function showGuide() {
    showGuideOverlay.value = true;
  }

  /**
   * 隐藏引导覆盖层
   */
  function hideGuide() {
    showGuideOverlay.value = false;
  }

  /**
   * 设置引导步骤索引
   * @param {number} index - 步骤索引
   */
  function setGuideStepIndex(index) {
    guideStepIndex.value = index;
  }

  /**
   * 标记引导完成
   * @param {string} guideId - 引导ID
   */
  function markGuideCompleted(guideId) {
    guideCompleted.value.add(guideId);
    saveUserPreferences();
  }

  /**
   * 标记引导跳过
   * @param {string} guideId - 引导ID
   */
  function markGuideSkipped(guideId) {
    guideSkipped.value.add(guideId);
    saveUserPreferences();
  }

  /**
   * 检查引导是否完成
   * @param {string} guideId - 引导ID
   */
  function isGuideCompleted(guideId) {
    return guideCompleted.value.has(guideId);
  }

  /**
   * 检查引导是否跳过
   * @param {string} guideId - 引导ID
   */
  function isGuideSkipped(guideId) {
    return guideSkipped.value.has(guideId);
  }

  /**
   * 重置引导状态
   * @param {string} guideId - 引导ID（可选）
   */
  function resetGuideState(guideId) {
    if (guideId) {
      guideCompleted.value.delete(guideId);
      guideSkipped.value.delete(guideId);
    } else {
      guideCompleted.value.clear();
      guideSkipped.value.clear();
    }
    saveUserPreferences();
  }

  /**
   * 切换自动开始引导
   */
  function toggleAutoStartGuide() {
    autoStartGuide.value = !autoStartGuide.value;
    saveUserPreferences();
  }

  /**
   * 切换引导进度显示
   */
  function toggleGuideProgress() {
    showGuideProgress.value = !showGuideProgress.value;
    saveUserPreferences();
  }

  // ================================
  // 动画系统相关方法
  // ================================

  /**
   * 切换动画启用状态
   */
  function toggleAnimationEnabled() {
    animationEnabled.value = !animationEnabled.value;
    performanceConfig.enableAnimations = animationEnabled.value;
    saveUserPreferences();
  }

  /**
   * 切换减少动画模式
   */
  function toggleReducedMotion() {
    reducedMotion.value = !reducedMotion.value;
    saveUserPreferences();
  }

  /**
   * 切换动画性能模式
   */
  function toggleAnimationPerformanceMode() {
    animationPerformanceMode.value = !animationPerformanceMode.value;
    saveUserPreferences();
  }

  /**
   * 设置活动动画数量
   * @param {number} count - 动画数量
   */
  function setActiveAnimationsCount(count) {
    activeAnimationsCount.value = count;
  }

  /**
   * 更新动画设置
   * @param {Object} settings - 动画设置
   */
  function updateAnimationSettings(settings) {
    Object.assign(animationSettings, settings);
    saveUserPreferences();
  }

  /**
   * 重置动画设置
   */
  function resetAnimationSettings() {
    Object.assign(animationSettings, {
      speed: 1.0,
      intensity: 0.8,
      colorTheme: 'default',
      maxConcurrent: 10,
      frameRate: 60
    });
    saveUserPreferences();
  }

  /**
   * 保存用户偏好设置
   */
  function saveUserPreferences() {
    try {
      const preferences = {
        guide: {
          enabled: guideEnabled.value,
          autoStart: autoStartGuide.value,
          showProgress: showGuideProgress.value,
          completed: Array.from(guideCompleted.value),
          skipped: Array.from(guideSkipped.value)
        },
        animation: {
          enabled: animationEnabled.value,
          reducedMotion: reducedMotion.value,
          performanceMode: animationPerformanceMode.value,
          settings: animationSettings
        },
        performance: performanceConfig
      };
      localStorage.setItem('user-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('保存用户偏好失败:', error);
    }
  }

  /**
   * 加载用户偏好设置
   */
  function loadUserPreferences() {
    try {
      const saved = localStorage.getItem('user-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);

        // 加载引导设置
        if (preferences.guide) {
          guideEnabled.value = preferences.guide.enabled ?? true;
          autoStartGuide.value = preferences.guide.autoStart ?? true;
          showGuideProgress.value = preferences.guide.showProgress ?? true;
          guideCompleted.value = new Set(preferences.guide.completed || []);
          guideSkipped.value = new Set(preferences.guide.skipped || []);
        }

        // 加载动画设置
        if (preferences.animation) {
          animationEnabled.value = preferences.animation.enabled ?? true;
          reducedMotion.value = preferences.animation.reducedMotion ?? false;
          animationPerformanceMode.value = preferences.animation.performanceMode ?? false;
          if (preferences.animation.settings) {
            Object.assign(animationSettings, preferences.animation.settings);
          }
        }

        // 加载性能设置
        if (preferences.performance) {
          Object.assign(performanceConfig, preferences.performance);
        }
      }
    } catch (error) {
      console.warn('加载用户偏好失败:', error);
    }
  }

  /**
   * 检测并应用用户偏好
   */
  function applyUserPreferences() {
    // 应用动画设置
    performanceConfig.enableAnimations = animationEnabled.value;

    // 检测系统偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && !reducedMotion.value) {
      reducedMotion.value = true;
      showToastMessage('已检测到减少动画偏好设置');
    }

    // 监听偏好变化
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      reducedMotion.value = e.matches;
      if (e.matches) {
        showToastMessage('已启用减少动画模式');
      }
    });
  }

  return {
    // 状态
    showToast,
    toastMessage,
    focusedNode,
    isMinimized,
    isNodeListMinimized,
    panelWidth,
    isResizing,
    lastMouseX,
    searchQuery,
    showDropdown,
    filteredFields,
    nodeSearchQuery,
    searchOptions,
    selectedTableTypes,
    showTypeFilter,
    groupByType,
    groupCollapseState,
    showOnlyCriticalPath,
    listMode,
    selectedTables,
    selectedFields,
    highlightedTables,
    highlightedFields,
    isShowingCriticalLineage,
    currentFieldIndex,
    currentTableIndex,
    miniMapWidth,
    miniMapHeight,
    isMiniMapResizing,
    showHistoryPanel,
    performanceConfig,
    minPanelWidth,
    maxPanelWidth,

    // 引导系统状态
    guideEnabled,
    showGuideOverlay,
    guideStepIndex,
    guideCompleted,
    guideSkipped,
    autoStartGuide,
    showGuideProgress,

    // 动画系统状态
    animationEnabled,
    reducedMotion,
    animationPerformanceMode,
    activeAnimationsCount,
    animationSettings,

    // 方法
    setTableTypes,
    showToastMessage,
    clearToast,
    toggleMinimize,
    toggleNodeListMinimize,
    toggleTypeFilter,
    toggleGroupByType,
    toggleHistoryPanel,
    setSearchQuery,
    setNodeSearchQuery,
    setFilteredFields,
    showSearchDropdown,
    hideSearchDropdown,
    clearSearch,
    setFocusedNode,
    clearFocusedNode,
    selectAllTypes,
    clearAllTypes,
    toggleGroupCollapse,
    isGroupCollapsed,
    setListMode,
    toggleCriticalPath,
    setCriticalPathShow,
    addSelectedTable,
    removeSelectedTable,
    clearSelectedTables,
    addSelectedField,
    removeSelectedField,
    clearSelectedFields,
    setHighlightedTables,
    addHighlightedTable,
    clearHighlightedTables,
    setHighlightedFields,
    addHighlightedField,
    clearHighlightedFields,
    setCurrentFieldIndex,
    setCurrentTableIndex,
    resetSelections,
    setShowingCriticalLineage,
    startResize,
    stopResize,
    updatePanelWidth,
    setMiniMapSize,
    toggleMiniMapResizing,
    toggleHighPerformanceMode,
    setPerformanceConfig,
    applyHighPerformanceMode,
    detectDevicePerformance,
    setSearchOptions,
    cleanup,

    // 引导系统方法
    toggleGuideEnabled,
    showGuide,
    hideGuide,
    setGuideStepIndex,
    markGuideCompleted,
    markGuideSkipped,
    isGuideCompleted,
    isGuideSkipped,
    resetGuideState,
    toggleAutoStartGuide,
    toggleGuideProgress,

    // 动画系统方法
    toggleAnimationEnabled,
    toggleReducedMotion,
    toggleAnimationPerformanceMode,
    setActiveAnimationsCount,
    updateAnimationSettings,
    resetAnimationSettings,

    // 用户偏好
    saveUserPreferences,
    loadUserPreferences,
    applyUserPreferences
  };
}