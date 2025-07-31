<template>
  <!-- <LoginDialog v-if="showLoginDialog" @login-success="handleLoginSuccess" /> -->
  <div class="app-container" :class="{ 'blurred': false }">
    <!-- SQL 输入面板 -->
    <div class="sql-container">
      <!-- 最小化按钮单独放置 -->
      <button class="minimize-btn modern" @click="toggleMinimize" :title="isMinimized ? '展开' : '最小化'">
        <svg v-if="isMinimized" width="22" height="22" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M7 14l5-5 5 5" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <!-- SQL面板 -->
      <div class="sql-panel" :class="{ 'sql-panel--minimized': isMinimized }">
        <div class="sql-editor" v-show="!isMinimized">
          <div class="sql-textarea-wrapper compact">
            <textarea v-model="sqlQuery" placeholder="请输入 SQL 查询语句..." class="sql-textarea compact"></textarea>
            <button v-if="sqlQuery.trim()" class="clear-sql-btn" @click="clearSqlQuery" title="清空 SQL">
              <span class="clear-icon">✕</span>
            </button>
          </div>
          <div class="sql-actions compact">
            <div class="sql-options compact">
              <div class="lineage-level-selector compact">
                <span class="option-label">血缘分析级别：</span>
                <label class="radio-label">
                  <input type="radio" v-model="lineageLevel" value="table">
                  <span class="radio-text">表级</span>
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="lineageLevel" value="column">
                  <span class="radio-text">列级</span>
                </label>
              </div>
              <label class="option-label compact">
                <input type="checkbox" v-model="filterCtes">
                <span class="option-text">仅显示物理表</span>
              </label>
            </div>
            <div class="sql-buttons">
              <label class="upload-btn compact">
                <input type="file" accept=".txt,.sql" @change="handleFileUpload" style="display: none;">
                📁 上传SQL文件
              </label>
              <button class="analyze-btn compact" @click="analyzeSql" :disabled="!sqlQuery.trim() || isAnalyzing">
                {{ isAnalyzing ? '分析中...' : '分析血缘关系' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <div v-if="showToast" class="toast" :class="{ 'toast--show': showToast }">
      {{ toastMessage }}
    </div>

    <!-- 小地图 -->
    <MiniMap v-if="json.nodes.length > 0" :nodes="json.nodes" :edges="json.edges"
      :transform="getTransform()" :container-size="getContainerSize()" :width="miniMapWidth" :height="miniMapHeight"
      @navigate="handleMinimapNavigate" @resize="handleMiniMapResize" />

    <!-- 镜头定位按钮 -->
    <div
      v-if="showOnlyCriticalPath && ((lineageLevel === 'column' && highlightedFields.length > 0) || (lineageLevel === 'table' && highlightedTables.length > 0))"
      class="camera-controls">
      <div class="camera-info">
        <span class="field-counter" v-if="lineageLevel === 'column'">{{ currentFieldIndex + 1 }} / {{
          highlightedFields.length }}</span>
        <span class="field-counter" v-if="lineageLevel === 'table'">{{ currentTableIndex + 1 }} / {{
          highlightedTables.length }}</span>
      </div>
      <button class="camera-button" @click="lineageLevel === 'column' ? focusNextField() : focusNextTable()"
        :title="lineageLevel === 'column' ? '移动到下一个相关字段' : '移动到下一个相关表'">
        <i class="camera-icon">🎯</i>
      </button>
    </div>

    <!-- 批量操作按钮 -->
    <div class="batch-actions">
      <!-- 仅显示关键路径切换按钮 -->
      <button class="batch-action-btn" @click="toggleCriticalPath" :class="{ 'active': showOnlyCriticalPath }">
        <i class="filter-icon">🔍</i>
        {{ showOnlyCriticalPath ? '显示所有节点' : '仅显示关键路径' }}
      </button>



      <!-- 历史记录面板 -->
      <div class="history-panel">
        <div class="history-header">
          <h3>历史记录</h3>
          <button class="toggle-btn" @click="toggleHistoryPanel" :title="showHistoryPanel ? '收起历史记录' : '展开历史记录'">
            <span v-if="showHistoryPanel">▼</span>
            <span v-else>▶</span>
          </button>
        </div>

        <div v-show="showHistoryPanel" class="history-content">
          <div v-if="lineageHistory.length === 0" class="history-empty">
            <div class="empty-icon">📊</div>
            <span>暂无历史记录</span>
            <small>输入SQL查询后，分析结果将自动保存到这里</small>
          </div>

          <!-- 最近5个记录的快速访问列表 -->
          <div v-if="lineageHistory.length > 0" class="recent-history-list">
            <div class="recent-history-items">
              <div v-for="(item, index) in recentHistory" :key="item.id" class="recent-history-item"
                :class="{ 'active': isCurrentHistory(item) }"
                @click="loadHistoryItem(item)">
                <div class="recent-history-title">{{ item.lineageLevel === 'table' ? '表级' : '列级' }}</div>
                <div class="recent-history-time">{{ formatHistoryTime(item.timestamp) }}</div>
                <div class="recent-history-stats">
                  <span>{{ item.stats.nodes }}表</span>
                  <span>{{ item.stats.edges }}关系</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 完整历史记录列表已移除，仅显示最近5条记录 -->
        </div>
      </div>

      <!-- 显示所有节点按钮 -->
      <button v-if="hiddenNodes.size > 0" class="batch-action-btn" @click="handleShowAllNodes">
        <i class="show-all-icon">👁️</i>
        显示所有隐藏节点
      </button>
    </div>

    <div class="flow-wrapper" ref="flowWrap">
      <!-- 添加加载遮罩 -->
      <div v-if="isAnalyzing" class="loading-overlay"
        :class="{ 'high-performance': performanceConfig.highPerformanceMode }">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在分析血缘关系...</div>
      </div>
      <div id="table-flow" class="table-flow">
        <TableNode v-for="node in computedVisibleNodes" :key="node.name" :node="node"
          :highlightedFields="highlightedFields" :highlightedTables="highlightedTables"
          :isDisabled="isNodeDisabled(node)" :edges="json.edges" :isTableMode="lineageLevel === 'table'" :minus="minus"
          :focusedNode="focusedNode" @hide-node="toggleNodeVisibility" @copy-fields="copyFields"
          @field-click="selectField" @table-name-click="handleTableNameClick" />

        <!-- 辅助线 -->
        <div v-show="auxiliaryLine.isShowXLine" class="auxiliary-line auxiliary-line--x" :style="{
          width: auxiliaryLinePos.width,
          top: auxiliaryLinePos.y + 'px',
          left: auxiliaryLinePos.offsetX + 'px'
        }"></div>
        <div v-show="auxiliaryLine.isShowYLine" class="auxiliary-line auxiliary-line--y" :style="{
          height: auxiliaryLinePos.height,
          left: auxiliaryLinePos.x + 'px',
          top: auxiliaryLinePos.offsetY + 'px'
        }"></div>
      </div>
    </div>

    <!-- 表类型图例 -->
    <div class="table-type-legend">
      <div class="legend-title">表类型说明</div>
      <div class="legend-items">
        <div v-for="type in tableTypes" :key="type.type" class="legend-item">
          <span class="color-indicator" :style="{ backgroundColor: type.color }"></span>
          <span class="type-name">{{ type.label || type.type }}</span>
        </div>
      </div>
    </div>

    <!-- 节点列表面板 -->
    <div class="node-list-panel" :style="{ width: panelWidth + 'px' }">
      <div class="panel-header">
        <h3>
          <template v-if="listMode === 'table'">表列表</template>
          <template v-else>字段列表</template>
        </h3>
        <div class="panel-search">
          <input type="text" v-model="nodeSearchQuery" :placeholder="listMode === 'table' ? '搜索表名...' : '搜索字段名...'"
            class="node-search-input" @input="handleNodeSearch">
          <span v-if="nodeSearchQuery" class="clear-search" @click="clearNodeSearch">✕</span>
        </div>
        <!-- 切换按钮 -->
        <div class="list-toggle" style="margin-top:8px;">
          <button :class="{ active: listMode === 'table' }" @click="listMode = 'table'"
            style="margin-right: 4px;">表</button>
          <button :class="{ active: listMode === 'field' }" @click="listMode = 'field'">字段</button>
        </div>

        <!-- 表类型筛选 -->
        <div class="type-filter-section">
          <div class="filter-header">
            <span class="filter-title">表类型筛选</span>
            <button class="toggle-filter-btn" @click="showTypeFilter = !showTypeFilter"
              :title="showTypeFilter ? '收起筛选' : '展开筛选'">
              <span v-if="showTypeFilter">▼</span>
              <span v-else>▶</span>
            </button>
          </div>

          <div v-show="showTypeFilter" class="filter-content">
            <div class="type-checkboxes">
              <label v-for="type in tableTypes" :key="type.type" class="type-checkbox">
                <input type="checkbox" :value="type.type" v-model="selectedTableTypes">
                <span class="type-indicator" :style="{ backgroundColor: type.color }"></span>
                <span class="type-name">{{ type.label || type.type }}</span>
              </label>
            </div>

            <div class="filter-actions">
              <button class="filter-action-btn" @click="selectAllTypes">全选</button>
              <button class="filter-action-btn" @click="clearAllTypes">清空</button>
            </div>
          </div>
        </div>

        <!-- 分组显示开关 -->
        <div class="group-toggle">
          <label class="group-toggle-label">
            <input type="checkbox" v-model="groupByType">
            <span class="toggle-text">按类型分组</span>
          </label>
        </div>
      </div>
      <div class="node-list">
        <!-- 新增：表头说明 -->
        <template v-if="listMode === 'table'">
          <div class="node-list-header">
            <span class="header-name">表名</span>
            <span class="header-count">引用次数</span>
          </div>
        </template>
        <template v-else>
          <div class="node-list-header">
            <span class="header-name">字段</span>
            <span class="header-count">引用次数</span>
          </div>
        </template>
        <!-- 表模式 -->
        <template v-if="listMode === 'table'">
          <template v-if="groupByType">
            <div v-for="(nodes, type) in groupedNodeList" :key="type" class="group-section">
              <div class="group-header">
                <span class="group-type-indicator" :style="{ backgroundColor: getTableColor(type) }"></span>
                <span class="group-title">{{ getTableTypeLabel(type) }} ({{ nodes.length }})</span>
                <button type="button" class="group-toggle-btn" @click.stop.prevent="toggleGroupCollapse(type)"
                  :title="isGroupCollapsed(type) ? '展开' : '折叠'">
                  <span v-if="isGroupCollapsed(type)">▶</span>
                  <span v-else>▼</span>
                </button>
              </div>
              <div v-show="!isGroupCollapsed(type)">
                <div v-for="node in nodes" :key="node.name" class="node-list-item" :class="{
                  'node-hidden': hiddenNodes.has(node.name),
                  'node-focused': focusedNode === node.name,
                  'search-highlight': isNodeHighlighted(node)
                }" @click="focusOnNode(node)">
                  <span class="node-type-indicator" :style="{ backgroundColor: getTableColor(node.type) }"></span>
                  <span class="node-name" v-html="highlightSearchText(node.name)"></span>
                  <span class="node-fields-count">
                    {{ getTableReferenceCount(node.name) }}
                  </span>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div v-for="node in filteredNodeList" :key="node.name" class="node-list-item" :data-node="node.name" :class="{
              'node-hidden': hiddenNodes.has(node.name),
              'node-focused': focusedNode === node.name,
              'search-highlight': isNodeHighlighted(node)
            }" @click="focusOnNode(node)">
              <span class="node-type-indicator" :style="{ backgroundColor: getTableColor(node.type) }"></span>
              <span class="node-name" v-html="highlightSearchText(node.name)"></span>
              <span class="node-fields-count">
                {{ getTableReferenceCount(node.name) }}
              </span>
            </div>
          </template>
        </template>

        <!-- 字段模式 -->
        <template v-else>
          <template v-if="groupByType">
            <div v-for="(fields, type) in groupedFieldList" :key="type" class="group-section">
              <div class="group-header">
                <span class="group-type-indicator" :style="{ backgroundColor: getTableColor(type) }"></span>
                <span class="group-title">{{ getTableTypeLabel(type) }} ({{ fields.length }})</span>
                <button type="button" class="group-toggle-btn" @click.stop.prevent="toggleGroupCollapse(type)"
                  :title="isGroupCollapsed(type) ? '展开' : '折叠'">
                  <span v-if="isGroupCollapsed(type)">▶</span>
                  <span v-else>▼</span>
                </button>
              </div>
              <div v-show="!isGroupCollapsed(type)">
                <div v-for="field in fields" :key="field.tableName + '-' + field.fieldName" class="node-list-item"
                  @click="focusFieldFromList(field)">
                  <span class="node-type-indicator" :style="{ backgroundColor: getTableColor(field.tableType) }"></span>
                  <span class="node-name">{{ field.tableName }}.{{ field.fieldName }}</span>
                  <span class="node-fields-count">{{ field.refCount }}</span>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div v-for="field in filteredFieldList" :key="field.tableName + '-' + field.fieldName"
              class="node-list-item" @click="focusFieldFromList(field)">
              <span class="node-type-indicator" :style="{ backgroundColor: getTableColor(field.tableType) }"></span>
              <span class="node-name">{{ field.tableName }}.{{ field.fieldName }}</span>
              <span class="node-fields-count">{{ field.refCount }}</span>
            </div>
          </template>
        </template>
      </div>
    </div>


  </div>

  <!-- 添加拖动调整宽度的把手 -->
  <div class="resize-handle" @mousedown="startResize">
  </div>

  <!-- 虚拟化状态提示 -->
  <div v-if="virtualizationEnabled" class="virtualization-status">
    <span>虚拟化渲染已启用 ({{ computedVisibleNodes.length }}/{{ json.nodes.length }} 节点)</span>
  </div>

  <!-- 作者署名 -->
  <div class="author-signature">
    <span>作者：tuzisang</span>
  </div>
</template>

<script lang="js">
import jsplumbModule from 'jsplumb'
import commConfig from './config/jsplumbConfig'
import comm from './methods/comm'
import { debounce, throttle } from 'lodash-es'

import TableNode from './components/TableNode.vue'
import MiniMap from './components/MiniMap.vue'
// import LoginDialog from './components/LoginDialog.vue'
import sampleData from './config/sampleData.json'
import colorFields from './config/tableTypeMappingColor'

const VIEWPORT_PADDING = 500; // 可视区域外的缓冲区大小
const BATCH_SIZE = 10; // 批量处理的节点数量
const VIRTUALIZATION_ENABLED = false; // 启用虚拟化渲染
const MAX_NODES_FOR_VIRTUALIZATION = 30; // 降低阈值，更早启用虚拟化

const jsplumb = jsplumbModule.jsPlumb
export default {
  name: 'Index',
  components: {
    TableNode,
    MiniMap,
    // LoginDialog
  },
  data() {
    return {
      sqlQuery: '',
      isAnalyzing: false,
      jsplumbInstance: null,
      json: {
        nodes: [],
        edges: []
      },
      lineageLevel: 'column', // 默认为列级分析
      showMiniMap: true, // 控制小地图显示
      commConfig: commConfig,
      auxiliaryLine: { isShowXLine: false, isShowYLine: false },
      auxiliaryLinePos: { width: '100%', height: '100%', offsetX: 0, offsetY: 0, x: 20, y: 20 },
      minus: '-',
      anchorArr: ['Left', 'Right'],
      commGrid: [2, 2],
      searchQuery: '',
      showDropdown: false,
      filteredFields: [],
      highlightedFields: [],
      showToast: false,
      toastMessage: '',
      toastTimer: null,
      tableTypes: colorFields.filter(color => color.type !== 'HighLight' && color.type !== 'NormalLight'),
      selectedTableTypes: ['Origin', 'Middle', 'RS'], // 选中的表类型
      searchMode: 'contains',
      searchInTableNames: true,
      searchInFieldNames: true,
      showOnlyCriticalPath: false,
      criticalPathNodes: new Set(),
      viewportTop: 0,
      viewportBottom: 0,
      viewportLeft: 0,
      viewportRight: 0,
      nodePositions: new Map(),
      isInitializing: false,
      currentFieldIndex: 0,
      currentTableIndex: 0, // 表级关键路径跳转索引
      hiddenNodes: new Set(),
      hiddenNodesConnections: null,
      nodeSearchQuery: '',
      focusedNode: null,
      panelWidth: 350,
      isResizing: false,
      lastMouseX: 0,
      minPanelWidth: 280,
      maxPanelWidth: 600,
      filterCtes: false,
      isMinimized: false,
      highlightedTables: [], // 新增：存储高亮的表名
      listMode: 'table', // 新增：表/字段切换
      // 表类型筛选相关
      showTypeFilter: false, // 是否显示类型筛选
      groupByType: true, // 是否按类型分组显示
      groupCollapseState: {
        Origin: false,
        Middle: false,
        RS: false
      }, // 分组折叠/展开状态
      // 虚拟化相关
      virtualizationEnabled: false,
      viewportBounds: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      // 连接线渲染优化相关
      connectionCache: new Map(), // 缓存连接线状态
      lastVisibleEdgesHash: '', // 上次可见边的哈希值
      renderQueue: [], // 渲染队列
      isRendering: false, // 是否正在渲染
      // DOM 操作优化相关
      cachedElements: new Map(), // 缓存 DOM 元素引用
      elementCacheExpiry: new Map(), // 元素缓存过期时间
      cacheExpiryTime: 30000, // 缓存过期时间 30 秒
      // 事件处理优化相关
      eventListeners: new Map(), // 存储事件监听器引用
      passiveEvents: ['scroll', 'touchstart', 'touchmove', 'wheel'], // 支持 passive 的事件
      eventThrottleMap: new Map(), // 事件节流映射
      eventDebounceMap: new Map(), // 事件防抖映射
      // 内存管理优化相关
      memoryStats: {
        cacheSize: 0,
        lastCleanup: Date.now(),
        cleanupCount: 0
      },
      weakRefs: new WeakMap(), // 使用 WeakMap 存储弱引用
      objectPool: new Map(), // 对象池，复用常用对象
      maxCacheSize: 1000, // 最大缓存大小
      maxObjectPoolSize: 100, // 最大对象池大小
      // 渲染性能优化相关
      renderStats: {
        frameCount: 0,
        lastFrameTime: 0,
        averageFrameTime: 0,
        renderQueueSize: 0
      },
      renderOptimizations: {
        useTransform3d: true, // 使用 transform3d 启用硬件加速
        enableLayerOptimization: true, // 启用图层优化
        useCompositorOnlyAnimations: true, // 使用合成器动画
        batchDOMUpdates: true // 批量 DOM 更新
      },
      pendingUpdates: new Set(), // 待更新的元素
      updateScheduled: false, // 是否已安排更新
      layerCache: new Map(), // 图层缓存
      // CSS 优化相关
      cssOptimizations: {
        useContainment: true, // 使用 CSS containment
        enableWillChange: true, // 启用 will-change 优化
        useBackfaceVisibility: true, // 使用 backface-visibility 优化
        enableTransformOptimization: true, // 启用 transform 优化
        useFilterOptimization: true // 启用 filter 优化
      },
      cssCache: new Map(), // CSS 样式缓存
      styleSheet: null, // 动态样式表
      repaintRequestId: null, // 用于存储渲染请求ID

      // 性能配置
      performanceConfig: {
        // 是否启用辅助线
        enableAlignmentLines: false,
        // 拖动时是否重绘连接线
        redrawConnectionsWhileDragging: false,
        // 是否使用硬件加速
        useHardwareAcceleration: true,
        // 是否启用平滑滚动
        enableSmoothScroll: false,
        // 是否启用动画
        enableAnimations: false,
        // 是否使用高性能模式(默认启用)
        highPerformanceMode: true,
        // 是否显示性能统计
        showPerformanceStats: false
      },
      // 小地图尺寸配置
      miniMapWidth: 180,
      miniMapHeight: 120,
      // 小地图是否正在调整大小
      isMiniMapResizing: false,
      // 历史记录缓存
      lineageHistory: [],
      showHistoryPanel: true,
      maxHistoryItems: 5
    };
  },
  mounted() {
    // this.checkLogin();

    // 先应用高性能模式
    this.applyHighPerformanceMode();

    // 加载历史记录
    this.loadHistoryFromStorage();

    this.renderDefaultLineage();

    // 使用优化的事件监听器添加方法
    this.addOptimizedEventListener(document, 'click', this.handleClickOutside);

    // 使用智能节流处理滚动事件 - 减少节流时间提高响应速度
    const throttledScrollHandler = this.createThrottledHandler(this.handleScroll, 8, 'scroll');
    this.addOptimizedEventListener(this.$refs.flowWrap, 'scroll', throttledScrollHandler, { passive: true });

    // 使用智能防抖处理窗口调整大小 - 减少防抖时间提高响应速度
    const debouncedResizeHandler = this.createDebouncedHandler(this.handleResize, 50, 'resize');
    this.addOptimizedEventListener(window, 'resize', debouncedResizeHandler);

    this.addOptimizedEventListener(document, 'mousemove', this.handleResize);
    this.addOptimizedEventListener(document, 'mouseup', this.stopResize);

    // 初始化虚拟化
    this.initVirtualization()

    // 定期清理过期的 DOM 缓存
    this.cacheCleanupInterval = setInterval(() => {
      this.clearExpiredElementCache();
    }, 60000); // 每分钟清理一次

    // 定期执行智能内存清理
    this.memoryCleanupInterval = setInterval(() => {
      this.smartMemoryCleanup();
    }, 300000); // 每5分钟清理一次

    // 启动渲染性能监控
    this.startRenderMonitoring();

    // 初始化动态样式表
    this.initDynamicStyleSheet();

    // 保存高性能模式设置到 localStorage
    try {
      localStorage.setItem('highPerformanceMode', 'true');
    } catch (e) {
      console.warn('无法保存性能模式偏好:', e);
    }
  },
  beforeDestroy() {
    // 清理连接线缓存
    this.clearConnectionCache();

    // 清理 DOM 缓存
    this.clearElementCache();

    // 清理事件监听器
    this.clearAllEventListeners();

    // 清理定时器
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
    }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    // 清理 jsPlumb 事件处理器
    if (this.jsplumbEventHandlers && this.jsplumbInstance) {
      Object.keys(this.jsplumbEventHandlers).forEach(eventName => {
        this.jsplumbInstance.unbind(eventName, this.jsplumbEventHandlers[eventName]);
      });
    }

    // 清理 panzoom 事件处理器
    if (this.panzoomEventHandlers && this.jsplumbInstance && this.jsplumbInstance.mainContainerWrap) {
      const container = this.jsplumbInstance.mainContainerWrap;
      Object.keys(this.panzoomEventHandlers).forEach(eventName => {
        container.removeEventListener(eventName, this.panzoomEventHandlers[eventName]);
      });
    }
    this.jsplumbInstance.reset();
    // 清理 CSS 优化
    this.cleanupAllCSSOptimizations();
  },
  created() {
    // 初始化选中的表类型为所有类型
    this.selectedTableTypes = this.tableTypes.map(type => type.type);
    // 初始化分组折叠状态，默认全部展开
    const initialState = {};
    this.tableTypes.forEach(type => {
      initialState[type.type] = false;
    });
    this.groupCollapseState = initialState;
  },
  watch: {
    // 监听节点数据变化，重新初始化虚拟化
    'json.nodes': {
      handler() {
        if (this.virtualizationEnabled !== this.shouldEnableVirtualization) {
          this.$nextTick(() => {
            this.initVirtualization();
          });
        }
      },
      deep: true
    },
    // 监听视口边界变化
    viewportBounds: {
      handler() {
        if (this.virtualizationEnabled) {
          this.updateVisibleElements();
        }
      },
      deep: true
    }
  },
  computed: {
    hasOriginTables() {
      return this.json.nodes.some(node => node.type === 'Origin')
    },
    // 虚拟化相关计算属性
    shouldEnableVirtualization() {
      return VIRTUALIZATION_ENABLED && this.json.nodes.length > MAX_NODES_FOR_VIRTUALIZATION;
    },
    // 计算可视区域内的节点
    computedVisibleNodes() {
      if (!this.shouldEnableVirtualization) {
        return this.json.nodes;
      }

      // 如果视口边界还没有初始化，返回所有节点
      if (!this.viewportBounds || this.viewportBounds.bottom === 0) {
        return this.json.nodes;
      }

      const { top, bottom, left, right } = this.viewportBounds;
      const padding = VIEWPORT_PADDING;

      return this.json.nodes.filter(node => {
        // 检查节点是否在可视区域内（包括缓冲区）
        const nodeTop = node.top;
        const nodeLeft = node.left;
        const nodeBottom = nodeTop + (node.fields ? node.fields.length * 25 + 60 : 60); // 估算节点高度
        const nodeRight = nodeLeft + 200; // 估算节点宽度

        return nodeTop <= bottom + padding &&
          nodeBottom >= top - padding &&
          nodeLeft <= right + padding &&
          nodeRight >= left - padding;
      });
    },
    // 计算可视区域内的连接线
    computedVisibleEdges() {
      if (!this.shouldEnableVirtualization) {
        return this.json.edges;
      }

      const visibleNodeNames = new Set(this.computedVisibleNodes.map(n => n.name));

      return this.json.edges.filter(edge =>
        visibleNodeNames.has(edge.from.name) && visibleNodeNames.has(edge.to.name)
      );
    },
    filteredNodeList() {
      // 表模式下的表过滤
      if (this.listMode !== 'table') return [];
      let nodes = this.json.nodes.slice();

      // 表类型筛选
      if (this.selectedTableTypes.length > 0) {
        nodes = nodes.filter(node => this.selectedTableTypes.includes(node.type));
      }

      // 搜索过滤
      if (this.nodeSearchQuery) {
        const query = this.nodeSearchQuery.toLowerCase();
        nodes = nodes.filter(node => {
          const nodeName = node.name.toLowerCase();
          return nodeName.includes(query);
        });
      }

      // 按引用次数降序
      return nodes.sort((a, b) => {
        const refDiff = this.getTableReferenceCount(b.name) - this.getTableReferenceCount(a.name);
        if (refDiff !== 0) return refDiff;
        const aStartsWith = a.name.toLowerCase().startsWith(this.nodeSearchQuery.toLowerCase());
        const bStartsWith = b.name.toLowerCase().startsWith(this.nodeSearchQuery.toLowerCase());
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.name.localeCompare(b.name);
      });
    },
    filteredFieldList() {
      // 字段模式下的字段过滤和引用计数
      if (this.listMode !== 'field') return [];
      let fields = [];

      // 先按表类型筛选节点
      let filteredNodes = this.json.nodes;
      if (this.selectedTableTypes.length > 0) {
        filteredNodes = this.json.nodes.filter(node => this.selectedTableTypes.includes(node.type));
      }

      filteredNodes.forEach(node => {
        if (node.fields) {
          node.fields.forEach(field => {
            fields.push({
              tableName: node.name,
              fieldName: field.name,
              tableType: node.type,
              refCount: this.getFieldReferenceCount(node.name, field.name)
            });
          });
        }
      });

      // 搜索过滤
      if (this.nodeSearchQuery) {
        const query = this.nodeSearchQuery.toLowerCase();
        fields = fields.filter(f =>
          f.tableName.toLowerCase().includes(query) ||
          f.fieldName.toLowerCase().includes(query)
        );
      }

      // 按引用次数降序
      return fields.sort((a, b) => b.refCount - a.refCount || a.tableName.localeCompare(b.tableName) || a.fieldName.localeCompare(b.fieldName));
    },

    // 分组显示的表列表
    groupedNodeList() {
      if (!this.groupByType) {
        return { all: this.filteredNodeList };
      }

      const groups = {};
      this.filteredNodeList.forEach(node => {
        if (!groups[node.type]) {
          groups[node.type] = [];
        }
        groups[node.type].push(node);
      });

      return groups;
    },

    // 最近5个历史记录
    recentHistory() {
      return this.lineageHistory.slice(-5).reverse();
    },

    // 分组显示的字段列表
    groupedFieldList() {
      if (!this.groupByType) {
        return { all: this.filteredFieldList };
      }

      const groups = {};
      this.filteredFieldList.forEach(field => {
        if (!groups[field.tableType]) {
          groups[field.tableType] = [];
        }
        groups[field.tableType].push(field);
      });

      return groups;
    }
  },
  methods: {
    ...comm,
    toggleMinimize() {
      this.isMinimized = !this.isMinimized
    },
    renderDefaultLineage() {
      // 对源表节点按字段数量降序排序
      const sortedNodes = [...sampleData.nodes].sort((a, b) => {
        // 只对源表进行排序
        if (a.type === 'Origin' && b.type === 'Origin') {
          return (b.fields?.length || 0) - (a.fields?.length || 0);
        }
        // 非源表保持原有顺序
        return 0;
      });

      // 重新计算源表的位置
      let currentTop = 20; // 起始位置
      sortedNodes.forEach(node => {
        if (node.type === 'Origin') {
          node.top = currentTop;
          currentTop += 80 + (node.fields?.length || 0) * 30; // 基础高度80px + 每个字段30px
        }
      });

      this.json.nodes = sortedNodes;
      this.json.edges = sampleData.edges;
      this.init();
    },
    //初始化
    async init() {
      this.isInitializing = true;
      this.fixNodesPosition();

      await this.$nextTick();

      jsplumb.ready(() => {
        this.jsplumbInstance = jsplumb.getInstance();

        // 配置默认值
        this.jsplumbInstance.importDefaults({
          ...this.commConfig,
          ConnectionsDetachable: false,
        });

        this.jsplumbInstance.setContainer('table-flow');
        this.jsplumbInstance.reset();

        // 初始化节点位置缓存
        this.initNodePositions();

        // 计算可视区域
        this.updateViewport();

        // 初始化所有节点的端点
        this.initializeNodesAndConnections();

        this.jsplumbInstance.setSuspendDrawing(false, true);
        this.initPanZoom();

        this.bindConnectionEvents();

        this.isInitializing = false;

        // 在初始化完成后重新初始化虚拟化
        this.$nextTick(() => {
          this.initVirtualization();
        });
      });
    },
    // 初始化节点位置缓存
    initNodePositions() {
      this.nodePositions.clear();
      this.json.nodes.forEach(node => {
        this.nodePositions.set(node.name, {
          top: node.top,
          left: node.left
        });
      });
    },
    // 初始化所有节点和连接 - 优化版本
    async initializeNodesAndConnections() {
      if (!this.json.nodes.length) return;

      this.jsplumbInstance.setSuspendDrawing(true);

      // 使用批量处理初始化节点
      await this.processLargeArray(this.json.nodes, (node) => {
        this.draggableNode(node.name);
        // 为节点添加端点，即使没有字段
        this.addEndpoint(node.name.concat(this.minus), this.anchorArr);

        // 如果有字段，为每个字段添加端点
        if (node.fields && node.fields.length > 0) {
          node.fields.forEach(field => {
            this.addEndpoint(node.name.concat(this.minus, field.name), this.anchorArr);
          });
        }

        // 应用 CSS 优化到节点
        this.$nextTick(() => {
          const nodeElement = this.getCachedElement(node.name);
          if (nodeElement) {
            this.applyBatchCSSOptimizations([nodeElement], {
              containment: 'layout style paint',
              willChange: 'transform',
              backfaceVisibility: true,
              transform: 'translate3d(0, 0, 0)'
            });
          }
        });
      }, 20); // 每批处理20个节点

      // 使用批量处理创建连接
      await this.processLargeArray(this.json.edges, (edge) => {
        const from = edge.from.name.concat(this.minus, edge.from.field, this.minus, "Right");
        const to = edge.to.name.concat(this.minus, edge.to.field, this.minus, "Left");
        this.connectEndpoint(from, to);
      }, 50); // 每批处理50个连接

      this.jsplumbInstance.setSuspendDrawing(false, true);

      // 如果启用了虚拟化，初始化可见元素
      if (this.virtualizationEnabled) {
        this.$nextTick(() => {
          this.updateVisibleElements();
        });
      }
    },
    // 初始化虚拟化
    initVirtualization() {
      this.virtualizationEnabled = this.shouldEnableVirtualization;
      this.updateViewport();

      // 如果启用了虚拟化，更新连接线
      if (this.virtualizationEnabled) {
        this.updateVisibleElements();
      }
    },

    // 更新视口范围（使用节流）
    updateViewport: throttle(function () {
      const container = this.$refs.flowWrap;
      if (!container) return;

      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        const scale = this.jsplumbInstance ? this.jsplumbInstance.getZoom() : 1;

        // 优化计算，减少重排
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        const clientHeight = container.clientHeight;
        const clientWidth = container.clientWidth;

        this.viewportTop = scrollTop / scale;
        this.viewportBottom = (scrollTop + clientHeight) / scale;
        this.viewportLeft = scrollLeft / scale;
        this.viewportRight = (scrollLeft + clientWidth) / scale;

        // 更新视口边界
        this.viewportBounds = {
          top: this.viewportTop,
          bottom: this.viewportBottom,
          left: this.viewportLeft,
          right: this.viewportRight
        };

        // 如果启用了虚拟化，更新可见元素
        if (this.virtualizationEnabled) {
          this.updateVisibleElements();
        }
      });
    }, 8), // 减少节流时间，提高响应速度

    // 更新可见元素
    updateVisibleElements() {
      if (!this.virtualizationEnabled) return;

      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        // 计算当前可见节点的哈希值，用于判断是否需要更新
        const visibleNodesHash = this.computedVisibleNodes
          .map(node => node.name)
          .sort()
          .join('|');

        // 如果可见节点没有变化，只更新连接线
        if (visibleNodesHash === this._lastVisibleNodesHash) {
          this.smartRenderConnections();
          return;
        }

        // 更新节点哈希值
        this._lastVisibleNodesHash = visibleNodesHash;

        // 使用智能连接线渲染
        this.smartRenderConnections();

        // 优化不可见节点的性能
        this.optimizeOffscreenNodes();
      });
    },

    // 优化屏幕外节点性能
    optimizeOffscreenNodes() {
      if (!this.virtualizationEnabled) return;

      const { top, bottom, left, right } = this.viewportBounds;
      const padding = VIEWPORT_PADDING;
      const visibleNodeNames = new Set(this.computedVisibleNodes.map(node => node.name));

      // 对所有节点进行优化
      this.json.nodes.forEach(node => {
        const isVisible = visibleNodeNames.has(node.name);
        const element = this.getCachedElement(node.name);

        if (element) {
          if (isVisible) {
            // 可见节点启用硬件加速
            element.style.willChange = 'transform';
            element.style.transform = 'translate3d(0, 0, 0)';
            element.style.visibility = 'visible';
            element.style.pointerEvents = 'auto';
          } else {
            // 不可见节点优化性能
            element.style.willChange = 'auto';
            element.style.visibility = 'hidden';
            element.style.pointerEvents = 'none';
          }
        }
      });
    },

    // 更新 jsPlumb 连接线 - 渲染性能优化版本
    updateJsPlumbConnections() {
      if (!this.jsplumbInstance) return;

      // 挂起绘制以提高性能
      this.jsplumbInstance.setSuspendDrawing(true);

      // 创建可见边的映射表，提高查找效率
      const visibleEdgeMap = new Map();
      this.computedVisibleEdges.forEach(edge => {
        const from = edge.from.name.concat(this.minus, edge.from.field, this.minus, "Right");
        const to = edge.to.name.concat(this.minus, edge.to.field, this.minus, "Left");
        visibleEdgeMap.set(`${from}-${to}`, true);
      });

      // 使用优化的连接线更新方法
      const allConnections = this.jsplumbInstance.getAllConnections();
      this.optimizedConnectionUpdate(allConnections, (conn) => {
        const edgeKey = `${conn.sourceId}-${conn.targetId}`;
        const shouldBeVisible = visibleEdgeMap.has(edgeKey);
        conn.setVisible(shouldBeVisible);
      });

      // 恢复绘制
      this.jsplumbInstance.setSuspendDrawing(false, true);
    },

    // 批量更新连接线的辅助方法
    updateJsPlumbConnectionsBatch(allConnections, visibleEdgeMap, startIndex, batchSize) {
      for (let i = startIndex; i < allConnections.length; i += batchSize) {
        const batch = allConnections.slice(i, i + batchSize);

        batch.forEach(conn => {
          const edgeKey = `${conn.sourceId}-${conn.targetId}`;
          const shouldBeVisible = visibleEdgeMap.has(edgeKey);
          conn.setVisible(shouldBeVisible);
        });

        // 如果还有更多批次，继续分批处理
        if (i + batchSize < allConnections.length) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              this.updateJsPlumbConnectionsBatch(allConnections, visibleEdgeMap, i + batchSize, batchSize);
            }, 0);
          });
          break;
        }
      }
    },

    // 智能连接线渲染 - 只在必要时更新
    smartRenderConnections() {
      if (!this.jsplumbInstance || this.isRendering) return;

      // 计算当前可见边的哈希值
      const currentEdgesHash = this.computedVisibleEdges
        .map(edge => `${edge.from.name}-${edge.from.field}-${edge.to.name}-${edge.to.field}`)
        .sort()
        .join('|');

      // 如果哈希值没有变化，跳过渲染
      if (currentEdgesHash === this.lastVisibleEdgesHash) {
        return;
      }

      // 更新哈希值
      this.lastVisibleEdgesHash = currentEdgesHash;

      // 缓存连接线状态
      this.smartCacheSet(this.connectionCache, currentEdgesHash, {
        timestamp: Date.now(),
        edges: this.computedVisibleEdges
      });

      // 优先处理可视区域内的连接线
      const visibleConnections = this.getVisibleConnections();

      // 将渲染任务加入队列，优先处理可视区域内的连接
      this.renderQueue.push(() => {
        if (visibleConnections.length > 0) {
          // 挂起绘制以提高性能
          this.jsplumbInstance.setSuspendDrawing(true);

          // 批量处理可见连接
          this.batchProcessConnections(visibleConnections, conn => {
            const sourceId = conn.sourceId.split(this.minus)[0];
            const targetId = conn.targetId.split(this.minus)[0];

            // 检查源节点和目标节点是否在可见节点列表中
            const isSourceVisible = this.computedVisibleNodes.some(node => node.name === sourceId);
            const isTargetVisible = this.computedVisibleNodes.some(node => node.name === targetId);

            // 如果两个端点都可见，显示连接线，否则隐藏
            conn.setVisible(isSourceVisible && isTargetVisible);

            // 对可见的连接线应用硬件加速
            if (isSourceVisible && isTargetVisible) {
              const connector = conn.getConnector();
              if (connector && connector.canvas) {
                connector.canvas.style.willChange = 'transform';
                connector.canvas.style.transform = 'translateZ(0)';
              }
            }
          });

          // 恢复绘制
          this.jsplumbInstance.setSuspendDrawing(false, true);
        } else {
          // 如果没有可见连接，使用默认方法更新
          this.updateJsPlumbConnections();
        }
      });

      // 如果队列中有任务且没有在渲染，开始渲染
      if (this.renderQueue.length > 0 && !this.isRendering) {
        this.processRenderQueue();
      }
    },

    // 处理渲染队列 - 优化版本
    processRenderQueue() {
      if (this.renderQueue.length === 0) {
        this.isRendering = false;
        return;
      }

      this.isRendering = true;

      // 优先处理队列中的任务
      const taskCount = Math.min(this.renderQueue.length, 3); // 每次最多处理3个任务
      const tasks = [];

      for (let i = 0; i < taskCount; i++) {
        tasks.push(this.renderQueue.shift());
      }

      // 使用 requestAnimationFrame 确保视觉流畅性
      requestAnimationFrame(() => {
        // 批量执行任务
        tasks.forEach(task => {
          try {
            task();
          } catch (error) {
            console.warn('Render task failed:', error);
          }
        });

        // 如果还有任务，继续处理
        if (this.renderQueue.length > 0) {
          // 使用 setTimeout 避免阻塞主线程
          setTimeout(() => {
            this.processRenderQueue();
          }, 0);
        } else {
          this.isRendering = false;
        }
      });
    },
    // 获取节点位置样式 - 渲染性能优化版本
    getNodePosition(node) {
      const element = this.getCachedElement(node.name);

      // 如果元素存在，启用硬件加速
      if (element && this.renderOptimizations.useTransform3d) {
        this.enableHardwareAcceleration(element);
      }

      return {
        position: 'absolute',
        top: node.top + 'px',
        left: node.left + 'px',
        transform: this.renderOptimizations.useTransform3d ? 'translate3d(0, 0, 0)' : 'none'
      };
    },
    // 获取节点可见性样式
    getNodeVisibility(node) {
      // 如果节点被手动隐藏
      if (this.hiddenNodes.has(node.name)) {
        if (this.jsplumbInstance) {
          // 隐藏节点的所有端点
          const nodeId = node.name + this.minus;
          this.jsplumbInstance.hide(nodeId);

          // 隐藏字段的所有端点
          if (node.fields) {
            node.fields.forEach(field => {
              const fieldId = node.name + this.minus + field.name;
              this.jsplumbInstance.hide(fieldId);
            });
          }
        }
        return {
          opacity: 0,
          visibility: 'hidden'
        };
      }

      // 原有的关键路径逻辑
      if (this.showOnlyCriticalPath && this.criticalPathNodes.size > 0) {
        const isVisible = this.criticalPathNodes.has(node.name);
        if (!isVisible && this.jsplumbInstance) {
          const allConnections = this.jsplumbInstance.getAllConnections();
          allConnections.forEach(conn => {
            const sourceNodeId = conn.sourceId.split(this.minus)[0];
            const targetNodeId = conn.targetId.split(this.minus)[0];
            if (sourceNodeId === node.name || targetNodeId === node.name) {
              conn.setVisible(false);
            }
          });
        }
        return {
          opacity: isVisible ? 1 : 0.1,
          visibility: 'visible'
        };
      }

      // 显示所有节点时，确保其连接和端点可见
      if (this.jsplumbInstance) {
        // 显示节点的所有端点
        const nodeId = node.name + this.minus;
        this.jsplumbInstance.show(nodeId);

        // 显示字段的所有端点
        if (node.fields) {
          node.fields.forEach(field => {
            const fieldId = node.name + this.minus + field.name;
            this.jsplumbInstance.show(fieldId);
          });
        }
      }
      return {
        opacity: 1,
        visibility: 'visible'
      };
    },
    // 处理滚动事件 - 优化版本
    handleScroll() {
      if (this.isInitializing) return;

      // 更新视口 - 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        this.updateViewport();

        // 如果启用了虚拟化，不需要重新绘制所有连接线
        if (!this.virtualizationEnabled) {
          // 使用优化的连接线重绘
          this.redrawConnectionsSoft();
        }
      });
    },
    // 处理窗口调整大小 - 优化版本
    handleResize: debounce(function () {
      if (!this.jsplumbInstance || this.isInitializing) return;

      // 清理 DOM 缓存，因为窗口大小改变可能影响元素位置
      this.clearElementCache();

      requestAnimationFrame(() => {
        this.jsplumbInstance.repaintEverything();
      });
    }, 100),
    // 重写拖动方法 - 优化版本
    draggableNode(nodeID) {
      if (!this.jsplumbInstance) return;

      // 直接处理拖动事件，不使用节流
      const dragHandler = (params) => {
        // 更新节点位置缓存
        const node = this.nodePositions.get(nodeID);
        if (node) {
          node.top = params.pos[1];
          node.left = params.pos[0];
        }

        // 在拖动过程中完全暂停连接线重绘
        this.jsplumbInstance.setSuspendDrawing(true);

        // 优化拖动时的渲染性能
        const element = this.getCachedElement(nodeID);
        if (element) {
          // 使用硬件加速提高拖动流畅度
          element.style.willChange = 'transform';
          element.style.transform = 'translate3d(0, 0, 0)';

          // 添加更多优化以提高跟手感
          if (this.renderOptimizations.enableLayerOptimization) {
            this.optimizeLayer(element, 'transform');
            this.applyTransformOptimization(element, 'translate3d(0, 0, 0)');
          }
        }
      };

      this.jsplumbInstance.draggable(nodeID, {
        // 使用更小的网格尺寸以获得更平滑的拖动体验
        grid: [2, 2],
        drag: dragHandler,
        stop: (params) => {
          this.auxiliaryLine.isShowXLine = false;
          this.auxiliaryLine.isShowYLine = false;
          this.changeNodePosition(nodeID, params.pos);

          // 清理拖动时的图层优化
          const element = this.getCachedElement(nodeID);
          if (element) {
            this.cleanupLayerOptimization(element);
            this.cleanupCSSOptimizations(element);

            // 恢复默认状态
            element.style.willChange = 'auto';
          }

          // 恢复连接线绘制并重绘
          this.jsplumbInstance.setSuspendDrawing(false, true);
        }
      });
    },
    // 优化连接线重绘 - 使用渲染性能优化
    redrawConnectionsSoft() {
      if (!this.jsplumbInstance) return;

      // 使用优化的 jsPlumb 重绘方法
      this.optimizedJsPlumbRepaint();
    },
    // 获取表的类型
    getTableType(tableName) {
      const node = this.json.nodes.find(node => node.name === tableName);
      return node ? node.type : null;
    },

    // 获取表类型对应的颜色
    getTableColor(type) {
      const colorField = this.tableTypes.find(t => t.type === type);
      return colorField ? colorField.color : '#ddd';
    },

    // 获取表类型对应的中文标签
    getTableTypeLabel(type) {
      const colorField = this.tableTypes.find(t => t.type === type);
      return colorField ? (colorField.label || colorField.type) : type;
    },

    // 增强的搜索处理
    handleSearch() {
      if (!this.searchQuery.trim()) {
        this.filteredFields = [];
        return;
      }

      const query = this.searchQuery.trim().toLowerCase();
      this.filteredFields = [];

      // 遍历所有节点
      this.json.nodes.forEach(node => {
        // 只搜索字段名
        if (node.fields) {
          node.fields.forEach(field => {
            if (field.name.toLowerCase().includes(query)) {
              this.filteredFields.push({
                tableName: node.name,
                fieldName: field.name
              });
            }
          });
        }
      });

      // 按字段名排序
      this.filteredFields.sort((a, b) => {
        // 优先显示以搜索词开头的字段
        const aStartsWith = a.fieldName.toLowerCase().startsWith(query);
        const bStartsWith = b.fieldName.toLowerCase().startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.fieldName.localeCompare(b.fieldName);
      });

      // 限制显示数量
      this.filteredFields = this.filteredFields.slice(0, 20);
    },
    // 清除搜索
    clearSearch() {
      this.searchQuery = '';
      this.filteredFields = [];
      this.showDropdown = false;
    },
    // 选择字段 - 优化版本
    async selectField(field) {
      console.log("选择字段:", field.tableName, field.fieldName);
      this.highlightFieldLineage(field.tableName, field.fieldName);
      this.showDropdown = false;

      // 确保表节点可见（如果被隐藏）
      if (this.hiddenNodes.has(field.tableName)) {
        this.toggleNodeVisibility({ tableName: field.tableName, isHidden: false });
        // 等待节点显示
        await this.$nextTick();
      }

      // 直接获取DOM元素，避免缓存问题
      const fieldId = `${field.tableName}${this.minus}${field.fieldName}`;
      const fieldElement = document.getElementById(fieldId);

      if (!fieldElement) {
        console.warn("无法找到字段元素:", fieldId);
        return;
      }

      // 获取panzoom实例
      const pan = this.jsplumbInstance.pan;
      if (!pan) {
        console.warn("无法获取panzoom实例");
        return;
      }

      // 1. 设置固定缩放比例
      const targetZoom = 1.2;
      const currentTransform = pan.getTransform();
      const currentZoom = currentTransform.scale;

      // 如果当前缩放不是目标缩放，先设置缩放
      if (Math.abs(currentZoom - targetZoom) > 0.01) {
        const zoomRatio = targetZoom / currentZoom;
        pan.zoomTo(0, 0, zoomRatio);
        // 等待缩放动作完成
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 2. 获取容器和元素的位置信息
      const mainContainer = this.jsplumbInstance.getContainer();
      const containerRect = mainContainer.getBoundingClientRect();
      const fieldRect = fieldElement.getBoundingClientRect();

      // 3. 计算目标位置（考虑当前缩放和偏移）
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;

      // 计算字段在容器中的相对位置
      const fieldCenterX = fieldRect.left + fieldRect.width / 2 - containerRect.left;
      const fieldCenterY = fieldRect.top + fieldRect.height / 2 - containerRect.top;

      // 计算需要移动的距离，使字段居中
      const targetX = containerCenterX - fieldCenterX;
      const targetY = containerCenterY - fieldCenterY;

      console.log("移动到位置:", targetX, targetY);

      // 4. 添加动画效果
      const tableFlow = document.querySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }

      // 5. 移动到目标位置
      try {
        pan.moveTo(targetX, targetY);
      } catch (error) {
        console.error("移动画布失败:", error);
      }

      // 6. 添加字段高亮动画
      fieldElement.classList.add('field-focus-animation');
      setTimeout(() => {
        fieldElement.classList.remove('field-focus-animation');
      }, 1500);

      // 7. 清理动画类
      setTimeout(() => {
        if (tableFlow) {
          tableFlow.classList.remove('camera-animate');
        }
        this.jsplumbInstance.repaintEverything();
      }, 500);
    },
    // 点击外部关闭下拉框
    handleClickOutside(event) {
      if (!event.target.closest('.search-box')) {
        this.showDropdown = false;
      }
    },
    // 处理字段点击事件
    handleFieldClick(fieldInfo) {
      this.highlightFieldLineage(fieldInfo.tableName, fieldInfo.fieldName);
      this.copyToClipboard(fieldInfo.fieldName, `字段名 "${fieldInfo.fieldName}" 已复制到剪贴板`);
    },
    // 处理表名点击事件
    handleTableNameClick(tableInfo) {
      // 复制表名到剪贴板
      this.copyToClipboard(tableInfo.tableName, `表名 "${tableInfo.tableName}" 已复制到剪贴板`);

      // 查找对应的节点并聚焦
      const node = this.json.nodes.find(n => n.name === tableInfo.tableName);
      if (node) {
        // 确保节点可见
        if (this.hiddenNodes.has(node.name)) {
          this.toggleNodeVisibility({ tableName: node.name, isHidden: false });
        }

        // 延迟聚焦以确保节点已渲染
        setTimeout(() => {
          this.focusOnNode(node);
        }, 100);
      }
    },

    // 处理复制字段事件
    copyFields(data) {
      this.copyToClipboard(data.fieldNames, `已复制 ${data.tableName} 的所有字段名`);
    },
    // 高亮字段的上下游链路
    highlightFieldLineage(tableName, fieldName) {
      // 清除之前的高亮
      this.resetFieldIndex();

      // 找到所有相关的字段
      const relatedFields = this.findRelatedFields(tableName, fieldName);

      // 更新高亮字段列表
      this.highlightedFields = relatedFields;

      // 如果开启了仅显示关键路径，更新关键路径
      if (this.showOnlyCriticalPath) {
        this.updateCriticalPath();
      }

      // 高亮相关的连接线
      this.$nextTick(() => {
        this.highlightConnections(relatedFields);

        // 移除这里的selectField调用，防止循环调用
        // const field = { tableName, fieldName };
        // this.selectField(field);
      });
    },
    // 查找相关字段
    findRelatedFields(tableName, fieldName) {
      const relatedFields = [];
      const visited = new Set();

      const traverse = (currentTable, currentField) => {
        const key = `${currentTable}-${currentField}`;
        if (visited.has(key)) return;
        visited.add(key);

        relatedFields.push({
          tableName: currentTable,
          fieldName: currentField
        });

        // 查找上游字段
        this.json.edges.forEach(edge => {
          if (edge.to.name === currentTable && edge.to.field === currentField) {
            traverse(edge.from.name, edge.from.field);
          }
        });

        // 查找下游字段
        this.json.edges.forEach(edge => {
          if (edge.from.name === currentTable && edge.from.field === currentField) {
            traverse(edge.to.name, edge.to.field);
          }
        });
      };

      traverse(tableName, fieldName);
      return relatedFields;
    },
    // 高亮连接线
    highlightConnections(relatedFields) {
      if (!this.jsplumbInstance || this.lineageLevel === 'table' || !relatedFields || relatedFields.length === 0) return;

      const allConnections = this.jsplumbInstance.getAllConnections();

      // 重置所有连接线样式
      allConnections.forEach(conn => {
        conn.setPaintStyle(this.commConfig.PaintStyle);
      });

      // 高亮相关连接线
      allConnections.forEach(conn => {
        const sourceId = conn.sourceId.split(this.minus)[0];
        const targetId = conn.targetId.split(this.minus)[0];
        const sourceField = conn.sourceId.split(this.minus)[1];
        const targetField = conn.targetId.split(this.minus)[1];

        const isSourceRelated = relatedFields.some(f =>
          f.tableName === sourceId && f.fieldName === sourceField
        );
        const isTargetRelated = relatedFields.some(f =>
          f.tableName === targetId && f.fieldName === targetField
        );

        if (isSourceRelated && isTargetRelated) {
          // 如果源和目标都是相关字段，高亮连接线
          conn.setPaintStyle(this.commConfig.HoverPaintStyle);

          // 确保连接线和端点在关键路径模式下可见
          if (this.showOnlyCriticalPath) {
            conn.setVisible(true);

            // 确保源节点和目标节点在关键路径中
            this.criticalPathNodes.add(sourceId);
            this.criticalPathNodes.add(targetId);

            // 从隐藏节点集合中移除
            if (this.hiddenNodes.has(sourceId)) {
              this.hiddenNodes.delete(sourceId);
            }
            if (this.hiddenNodes.has(targetId)) {
              this.hiddenNodes.delete(targetId);
            }

            // 确保端点可见
            const sourceElement = document.getElementById(conn.sourceId);
            const targetElement = document.getElementById(conn.targetId);

            if (sourceElement) sourceElement.style.display = 'block';
            if (targetElement) targetElement.style.display = 'block';
          }
        }
      });

      // 重绘所有连接
      this.jsplumbInstance.repaintEverything();
    },
    // 复制到剪贴板
    copyToClipboard(text, message) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToastMessage(message);
        }).catch(err => {
          console.error('复制失败:', err);
          this.fallbackCopyToClipboard(text, message);
        });
      } else {
        this.fallbackCopyToClipboard(text, message);
      }
    },
    // 备用复制方法
    fallbackCopyToClipboard(text, message) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToastMessage(message);
      } catch (err) {
        console.error('复制失败:', err);
      }
      document.body.removeChild(textArea);
    },
    // 显示提示消息
    showToastMessage(message) {
      this.toastMessage = message;
      this.showToast = true;

      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
      }

      this.toastTimer = setTimeout(() => {
        this.showToast = false;
      }, 2000);
    },
    // 绑定连接线事件 - 优化版本
    bindConnectionEvents() {
      if (!this.jsplumbInstance) return;

      // 使用智能事件处理，避免重复绑定
      const mouseenterHandler = (conn) => {
        if (!conn.hasClass('jtk-connection-highlighted')) {
          conn.addClass('jtk-connection-hover');
        }
      };

      const mouseexitHandler = (conn) => {
        conn.removeClass('jtk-connection-hover');
      };

      // 绑定事件
      this.jsplumbInstance.bind('mouseenter', mouseenterHandler);
      this.jsplumbInstance.bind('mouseexit', mouseexitHandler);

      // 存储事件处理器引用，以便后续清理
      this.jsplumbEventHandlers = {
        mouseenter: mouseenterHandler,
        mouseexit: mouseexitHandler
      };
    },
    // 处理复制成功事件
    handleCopySuccess(data) {
      this.showToastMessage(data.message);
    },

    // 处理复制失败事件
    handleCopyError(data) {
      this.showToastMessage(data.message);
    },

    // 分析 SQL
    async analyzeSql() {
      if (!this.sqlQuery.trim()) {
        this.showToastMessage('请输入 SQL 查询语句');
        return;
      }

      // 设置分析状态为true，触发加载遮罩显示
      this.isAnalyzing = true;

      // 确保加载遮罩在DOM更新后显示
      await this.$nextTick();

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/lineage';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql_query: this.sqlQuery,
            filter_ctes: this.filterCtes,
            lineage_level: this.lineageLevel // 添加血缘分析级别参数
          })
        });

        const data = await response.json();
        if (response.ok) {
          await this.handleNewLineageData(data);
          // 将分析结果添加到历史记录
          this.addToHistory(data);
        } else {
          this.showToastMessage(data.error || '分析失败');
        }
      } catch (error) {
        console.error('Error analyzing SQL:', error);
        this.showToastMessage('分析过程中发生错误');
      } finally {
        // 即使在高性能模式下，也确保加载遮罩有平滑的淡出效果
        if (this.performanceConfig.highPerformanceMode) {
          // 在高性能模式下添加短暂延迟，确保加载遮罩可见
          setTimeout(() => {
            this.isAnalyzing = false;
          }, 300);
        } else {
          this.isAnalyzing = false;
        }
      }
    },

    // 判断节点是否禁用
    isNodeDisabled(node) {
      return this.showOnlyCriticalPath &&
        this.criticalPathNodes.size > 0 &&
        !this.criticalPathNodes.has(node.name);
    },
    // 更新关键路径节点集合
    updateCriticalPath() {
      this.criticalPathNodes.clear();

      if (this.lineageLevel === 'table') {
        // 表级模式：如果有高亮的表，则只显示高亮的表及其相关表
        if (this.highlightedTables.length > 0) {
          this.highlightedTables.forEach(tableName => {
            this.criticalPathNodes.add(tableName);
          });
        }
      } else {
        // 列级模式：如果没有高亮字段，不需要继续处理
        if (this.highlightedFields.length === 0) return;

        // 获取所有相关的表
        this.highlightedFields.forEach(field => {
          this.criticalPathNodes.add(field.tableName);
        });

        // 递归查找上游节点和边
        const findUpstream = (tableName, fieldName) => {
          this.json.edges.forEach(edge => {
            if (edge.to.name === tableName && edge.to.field === fieldName) {
              this.criticalPathNodes.add(edge.from.name);
              findUpstream(edge.from.name, edge.from.field);
            }
          });
        };

        // 递归查找下游节点和边
        const findDownstream = (tableName, fieldName) => {
          this.json.edges.forEach(edge => {
            if (edge.from.name === tableName && edge.from.field === fieldName) {
              this.criticalPathNodes.add(edge.to.name);
              findDownstream(edge.to.name, edge.to.field);
            }
          });
        };

        // 对每个高亮字段查找其上下游
        this.highlightedFields.forEach(field => {
          findUpstream(field.tableName, field.fieldName);
          findDownstream(field.tableName, field.fieldName);
        });
      }

      // 更新jsPlumb实例中节点的可拖动状态和可见性
      this.$nextTick(() => {
        // 首先设置所有节点的可见性
        this.json.nodes.forEach(node => {
          const isInCriticalPath = this.criticalPathNodes.has(node.name);

          // 设置节点可拖动状态
          this.jsplumbInstance.setDraggable(node.name, isInCriticalPath);

          // 设置节点可见性
          if (isInCriticalPath) {
            // 如果节点在关键路径中，确保它是可见的
            if (this.hiddenNodes.has(node.name)) {
              this.hiddenNodes.delete(node.name);
            }
          } else if (this.showOnlyCriticalPath) {
            // 如果节点不在关键路径中且启用了仅显示关键路径，隐藏节点
            this.hiddenNodes.add(node.name);
          }
        });

        // 更新连接线可见性
        const allConnections = this.jsplumbInstance.getAllConnections();
        allConnections.forEach(conn => {
          const sourceId = conn.sourceId.split(this.minus)[0];
          const targetId = conn.targetId.split(this.minus)[0];

          const isSourceInPath = this.criticalPathNodes.has(sourceId);
          const isTargetInPath = this.criticalPathNodes.has(targetId);

          // 只有当源节点和目标节点都在关键路径中时，连接线才可见
          conn.setVisible(isSourceInPath && isTargetInPath);
        });

        // 根据模式选择合适的高亮方式
        if (this.lineageLevel === 'table') {
          this.highlightTableConnections(Array.from(this.criticalPathNodes));
        } else {
          this.highlightConnections(this.highlightedFields);
        }

        // 重绘所有连接
        this.jsplumbInstance.repaintEverything();
      });
    },
    // 处理关键路径显示切换
    handleCriticalPathToggle() {
      if (this.showOnlyCriticalPath) {
        // 开启关键路径模式
        if (this.lineageLevel === 'table' && this.highlightedTables.length > 0) {
          this.updateCriticalPath();
          this.resetTableIndex(); // 重置表索引
        } else if (this.lineageLevel === 'column' && this.highlightedFields.length > 0) {
          this.updateCriticalPath();
          this.resetFieldIndex(); // 重置字段索引
        }
      } else {
        // 关闭关键路径模式
        this.criticalPathNodes.clear();

        // 恢复所有节点的可拖动状态
        this.json.nodes.forEach(node => {
          this.jsplumbInstance.setDraggable(node.name, true);
        });

        // 清除隐藏节点集合（显示所有节点）
        this.hiddenNodes.clear();

        // 恢复所有连接线的显示和样式
        const allConnections = this.jsplumbInstance.getAllConnections();
        allConnections.forEach(conn => {
          conn.setVisible(true);
          conn.setPaintStyle(this.commConfig.PaintStyle);
        });

        // 重绘所有连接
        this.jsplumbInstance.repaintEverything();
      }

      // 重新应用高亮
      this.$nextTick(() => {
        // 根据模式重新应用高亮
        if (this.lineageLevel === 'table' && this.highlightedTables.length > 0) {
          this.highlightTableConnections(this.highlightedTables);
        } else if (this.lineageLevel === 'column' && this.highlightedFields.length > 0) {
          this.highlightConnections(this.highlightedFields);
        }
      });
    },
    // 聚焦到下一个字段 - 优化版本
    async focusNextField() {
      if (!this.highlightedFields.length) return;

      // 添加按钮点击动画效果
      const cameraButton = this.getCachedQuerySelector('.camera-button');
      if (cameraButton) {
        cameraButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
          cameraButton.style.transform = 'scale(1)';
        }, 150);
      }

      // 更新当前字段索引
      this.currentFieldIndex = (this.currentFieldIndex + 1) % this.highlightedFields.length;
      const field = this.highlightedFields[this.currentFieldIndex];

      // 触发计数器动画
      const counterElement = this.getCachedQuerySelector('.field-counter');
      if (counterElement) {
        counterElement.classList.add('counter-update');
        setTimeout(() => {
          counterElement.classList.remove('counter-update');
        }, 500);
      }

      // 使用缓存的 DOM 元素
      const fieldId = `${field.tableName}${this.minus}${field.fieldName}`;
      const fieldElement = this.getCachedElement(fieldId);

      if (!fieldElement) return;

      // 获取panzoom实例
      const pan = this.jsplumbInstance.pan;
      if (!pan) return;

      // 1. 设置固定缩放比例
      const targetZoom = 1.2;
      const currentTransform = pan.getTransform();
      const currentZoom = currentTransform.scale;

      // 如果当前缩放不是目标缩放，先设置缩放
      if (Math.abs(currentZoom - targetZoom) > 0.01) {
        // 使用panzoom的zoomTo方法设置缩放，需要计算缩放比例
        const zoomRatio = targetZoom / currentZoom;
        pan.zoomTo(0, 0, zoomRatio);
        // 等待缩放动作完成
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 2. 获取容器和元素的位置信息
      const mainContainer = this.jsplumbInstance.getContainer();
      const containerRect = mainContainer.getBoundingClientRect();
      const fieldRect = fieldElement.getBoundingClientRect();

      // 3. 计算目标位置（考虑当前缩放和偏移）
      const currentTransform2 = pan.getTransform();
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;

      // 计算字段在容器中的相对位置
      const fieldCenterX = fieldRect.left + fieldRect.width / 2 - containerRect.left;
      const fieldCenterY = fieldRect.top + fieldRect.height / 2 - containerRect.top;

      // 计算需要移动的距离，使字段居中
      const targetX = containerCenterX - fieldCenterX;
      const targetY = containerCenterY - fieldCenterY;

      // 4. 使用panzoom的moveTo方法移动到目标位置
      // 定位前加动画class
      const tableFlow = this.getCachedQuerySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }
      pan.moveTo(targetX, targetY);
      setTimeout(() => {
        if (tableFlow) tableFlow.classList.remove('camera-animate');
        this.jsplumbInstance.repaintEverything();
      }, 500);

      // 5. 添加高亮动画效果
      this.addOptimizedAnimationClass(fieldElement, 'field-focus-animation', 1500);
    },

    // 重置字段索引
    resetFieldIndex() {
      this.currentFieldIndex = -1;
    },

    // 重置表索引
    resetTableIndex() {
      this.currentTableIndex = -1;
    },

    // 聚焦到下一个表 - 优化版本
    async focusNextTable() {
      if (!this.highlightedTables.length) return;

      // 添加按钮点击动画效果
      const cameraButton = this.getCachedQuerySelector('.camera-button');
      if (cameraButton) {
        cameraButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
          cameraButton.style.transform = 'scale(1)';
        }, 150);
      }

      // 更新当前表索引
      this.currentTableIndex = (this.currentTableIndex + 1) % this.highlightedTables.length;
      const tableName = this.highlightedTables[this.currentTableIndex];

      // 触发计数器动画
      const counterElement = this.getCachedQuerySelector('.field-counter');
      if (counterElement) {
        counterElement.classList.add('counter-update');
        setTimeout(() => {
          counterElement.classList.remove('counter-update');
        }, 500);
      }

      // 找到对应的节点
      const node = this.json.nodes.find(n => n.name === tableName);
      if (!node) return;

      // 获取panzoom实例
      const pan = this.jsplumbInstance.pan;
      if (!pan) return;

      // 1. 设置固定缩放比例
      const targetZoom = 0.9;
      const currentTransform = pan.getTransform();
      const currentZoom = currentTransform.scale;

      // 如果当前缩放不是目标缩放，先设置缩放
      if (Math.abs(currentZoom - targetZoom) > 0.01) {
        const zoomRatio = targetZoom / currentZoom;
        pan.zoomTo(0, 0, zoomRatio);
        // 等待缩放动作完成
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 2. 获取容器和节点元素
      const mainContainer = this.jsplumbInstance.getContainer();
      const nodeElement = this.getCachedElement(tableName);

      if (!nodeElement) return;

      // 3. 获取节点表头元素
      const headerElement = nodeElement.querySelector('.table-node-header');
      if (!headerElement) return;

      const containerRect = mainContainer.getBoundingClientRect();
      const headerRect = headerElement.getBoundingClientRect();

      // 4. 计算目标位置（以表头为中心）
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 3; // 将表头定位在视图上方1/3处

      const headerCenterX = headerRect.left + headerRect.width / 2 - containerRect.left;
      const headerCenterY = headerRect.top + headerRect.height / 2 - containerRect.top;

      const targetX = containerCenterX - headerCenterX;
      const targetY = containerCenterY - headerCenterY;

      // 5. 添加动画效果
      const tableFlow = this.getCachedQuerySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }

      // 6. 移动到目标位置
      pan.moveTo(targetX, targetY);

      // 7. 添加节点高亮动画
      this.addOptimizedAnimationClass(nodeElement, 'node-focus-animation', 1000);

      // 8. 清理动画类
      setTimeout(() => {
        if (tableFlow) {
          tableFlow.classList.remove('camera-animate');
        }
        this.jsplumbInstance.repaintEverything();
      }, 500);
    },

    // 处理节点隐藏/显示
    toggleNodeVisibility(data) {
      const { tableName, isHidden } = data;
      if (isHidden) {
        // 存储节点的连接信息，以便后续恢复
        const nodeConnections = [];

        // 使用循环确保所有连接都被清理
        let hasRemainingConnections = true;
        while (hasRemainingConnections) {
          hasRemainingConnections = false;
          const allConnections = this.jsplumbInstance.getAllConnections();

          // 找到并删除所有与该节点相关的连接
          allConnections.forEach(conn => {
            const sourceNodeId = conn.sourceId.split(this.minus)[0];
            const targetNodeId = conn.targetId.split(this.minus)[0];
            if (sourceNodeId === tableName || targetNodeId === tableName) {
              hasRemainingConnections = true;
              // 存储连接信息
              nodeConnections.push({
                from: conn.sourceId,
                to: conn.targetId,
                sourceEndpoint: conn.endpoints[0],
                targetEndpoint: conn.endpoints[1]
              });

              // 删除连接前先分离端点
              if (conn.endpoints) {
                conn.endpoints.forEach(endpoint => {
                  if (endpoint && endpoint.elementId) {
                    try {
                      this.jsplumbInstance.deleteEndpoint(endpoint);
                    } catch (e) {
                      console.warn('Failed to delete endpoint:', e);
                    }
                  }
                });
              }

              try {
                this.jsplumbInstance.deleteConnection(conn);
              } catch (e) {
                console.warn('Failed to delete connection:', e);
              }
            }
          });
        }

        // 确保删除该节点的所有端点
        const node = this.json.nodes.find(n => n.name === tableName);
        if (node) {
          // 删除表头端点
          let hasRemainingEndpoints = true;
          while (hasRemainingEndpoints) {
            hasRemainingEndpoints = false;

            // 检查并删除表头端点
            const headerEndpoints = this.jsplumbInstance.getEndpoints(node.name + this.minus);
            if (headerEndpoints && headerEndpoints.length > 0) {
              hasRemainingEndpoints = true;
              headerEndpoints.forEach(endpoint => {
                try {
                  this.jsplumbInstance.deleteEndpoint(endpoint);
                } catch (e) {
                  console.warn('Failed to delete header endpoint:', e);
                }
              });
            }

            // 检查并删除字段端点
            if (node.fields) {
              node.fields.forEach(field => {
                const fieldEndpoints = this.jsplumbInstance.getEndpoints(node.name + this.minus + field.name);
                if (fieldEndpoints && fieldEndpoints.length > 0) {
                  hasRemainingEndpoints = true;
                  fieldEndpoints.forEach(endpoint => {
                    try {
                      this.jsplumbInstance.deleteEndpoint(endpoint);
                    } catch (e) {
                      console.warn('Failed to delete field endpoint:', e);
                    }
                  });
                }
              });
            }
          }
        }

        // 存储节点的连接信息
        this.hiddenNodesConnections = this.hiddenNodesConnections || new Map();
        this.hiddenNodesConnections.set(tableName, nodeConnections);

        // 添加到隐藏节点集合
        this.hiddenNodes.add(tableName);
      } else {
        // 从隐藏节点集合中移除
        this.hiddenNodes.delete(tableName);

        // 重新初始化节点的端点
        const node = this.json.nodes.find(n => n.name === tableName);
        if (node) {
          // 为表头添加端点
          this.addEndpoint(node.name + this.minus, this.anchorArr);

          // 为每个字段添加端点
          if (node.fields) {
            node.fields.forEach(field => {
              this.addEndpoint(node.name + this.minus + field.name, this.anchorArr);
            });
          }
        }

        // 恢复节点的连接
        if (this.hiddenNodesConnections && this.hiddenNodesConnections.has(tableName)) {
          const connections = this.hiddenNodesConnections.get(tableName);
          connections.forEach(conn => {
            try {
              this.jsplumbInstance.connect({
                uuids: [
                  conn.from + this.minus + "Right",
                  conn.to + this.minus + "Left"
                ]
              }, this.commConfig);
            } catch (e) {
              console.warn('Failed to restore connection:', e);
            }
          });
          this.hiddenNodesConnections.delete(tableName);
        }
      }

      // 重新应用节点可见性
      this.$nextTick(() => {
        this.json.nodes.forEach(node => {
          this.getNodeVisibility(node);
        });
        // 重绘所有连接
        this.jsplumbInstance.repaintEverything();
      });
    },
    // 新增：处理批量隐藏/显示来源表
    async handleShowAllNodes() {
      // 清空隐藏节点集合
      this.hiddenNodes.clear();
      this.hiddenNodesConnections = null;

      // 重新初始化画布
      await this.reinitializeCanvas();
    },

    // 新增：重新初始化画布的方法
    async reinitializeCanvas() {
      // 保存当前的节点位置
      const nodePositions = new Map();
      this.json.nodes.forEach(node => {
        nodePositions.set(node.name, {
          top: node.top,
          left: node.left
        });
      });

      // 重置jsPlumb实例
      if (this.jsplumbInstance) {
        this.jsplumbInstance.reset();
        await this.$nextTick();
      }

      // 恢复节点位置
      this.json.nodes.forEach(node => {
        const pos = nodePositions.get(node.name);
        if (pos) {
          node.top = pos.top;
          node.left = pos.left;
        }
      });

      // 重新初始化
      await this.init();

      // 重新应用节点可见性
      this.$nextTick(() => {
        this.json.nodes.forEach(node => {
          this.getNodeVisibility(node);
        });
      });
    },

    // 开始调整面板宽度
    startResize(e) {
      this.isResizing = true;
      this.lastMouseX = e.clientX;
    },

    // 处理面板宽度调整
    handleResize(e) {
      if (!this.isResizing) return;

      const deltaX = e.clientX - this.lastMouseX;
      const newWidth = this.panelWidth + deltaX;

      if (newWidth >= this.minPanelWidth && newWidth <= this.maxPanelWidth) {
        this.panelWidth = newWidth;
        this.lastMouseX = e.clientX;
      }
    },

    // 停止调整面板宽度
    stopResize() {
      this.isResizing = false;
    },

    // 处理节点搜索
    handleNodeSearch() {
      // 如果搜索框为空，重置过滤
      if (!this.nodeSearchQuery) {
        this.clearNodeSearch();
        return;
      }
    },

    // 清除搜索
    clearNodeSearch() {
      this.nodeSearchQuery = '';
    },

    // 判断节点是否需要高亮显示
    isNodeHighlighted(node) {
      if (!this.nodeSearchQuery) return false;
      return node.name.toLowerCase().includes(this.nodeSearchQuery.toLowerCase());
    },

    // 高亮搜索文本
    highlightSearchText(text) {
      if (!this.nodeSearchQuery) return text;

      const query = this.nodeSearchQuery.toLowerCase();
      const index = text.toLowerCase().indexOf(query);

      if (index === -1) return text;

      const before = text.slice(0, index);
      const match = text.slice(index, index + query.length);
      const after = text.slice(index + query.length);

      return `${before}<span class="highlight">${match}</span>${after}`;
    },

    // 改进的聚焦到节点方法 - 持久高亮版本
    async focusOnNode(node) {
      if (!this.jsplumbInstance || !node) return;

      console.log("聚焦节点:", node.name);

      try {
        // 更新聚焦状态 - 不再自动清除
        this.focusedNode = node.name;

        // 新增：表级模式下高亮表及其上下游链路
        if (this.lineageLevel === 'table') {
          this.handleTableHighlight({ tableName: node.name });

          // 等待高亮状态更新
          await this.$nextTick();
        }

        // 确保节点可见（如果被隐藏）
        if (this.hiddenNodes.has(node.name)) {
          this.toggleNodeVisibility({ tableName: node.name, isHidden: false });
          // 等待节点显示
          await this.$nextTick();
        }

        // 确保节点已渲染
        await this.$nextTick();

        // 获取panzoom实例
        const pan = this.jsplumbInstance.pan;
        if (!pan) {
          console.warn("无法获取panzoom实例");
          return;
        }

        // 1. 设置固定缩放比例 - 增加缩放比例使节点更大
        const targetZoom = 0.9;
        const currentTransform = pan.getTransform();
        const currentZoom = currentTransform.scale;

        // 如果当前缩放不是目标缩放，先设置缩放
        if (Math.abs(currentZoom - targetZoom) > 0.01) {
          const zoomRatio = targetZoom / currentZoom;
          pan.zoomTo(0, 0, zoomRatio);
          // 等待缩放动作完成
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 2. 获取容器和节点元素 - 确保在DOM中能找到
        const mainContainer = this.jsplumbInstance.getContainer();

        // 等待一小段时间确保DOM更新完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 查找节点元素 - 使用更可靠的选择器
        const nodeElements = document.querySelectorAll('.table-node');
        let nodeElement = null;

        // 遍历所有节点元素，查找匹配的节点
        for (const element of nodeElements) {
          if (element.id === node.name) {
            nodeElement = element;
            break;
          }
        }

        if (!nodeElement) {
          console.warn("无法找到节点元素:", node.name);
          console.log("当前DOM中的节点:", Array.from(nodeElements).map(el => el.id));
          return;
        }

        // 3. 获取节点表头元素
        const headerElement = nodeElement.querySelector('.table-node-header');
        if (!headerElement) {
          console.warn("无法找到节点表头元素");
          return;
        }

        const containerRect = mainContainer.getBoundingClientRect();
        const headerRect = headerElement.getBoundingClientRect();

        // 4. 计算目标位置（以表头为中心）
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 3; // 将表头定位在视图上方1/3处

        const headerCenterX = headerRect.left + headerRect.width / 2 - containerRect.left;
        const headerCenterY = headerRect.top + headerRect.height / 2 - containerRect.top;

        const targetX = containerCenterX - headerCenterX;
        const targetY = containerCenterY - headerCenterY;

        console.log("移动到位置:", targetX, targetY);

        // 5. 添加动画效果 - 使用更平滑的动画
        const tableFlow = document.querySelector('.table-flow');
        if (tableFlow) {
          tableFlow.classList.add('camera-animate');
        }

        // 6. 移动到目标位置
        try {
          pan.moveTo(targetX, targetY);
        } catch (error) {
          console.error("移动画布失败:", error);
        }

        // 7. 添加节点高亮动画 - 初始动画效果
        if (nodeElement) {
          nodeElement.classList.add('node-focus-animation');
          setTimeout(() => {
            nodeElement.classList.remove('node-focus-animation');
          }, 1500);
        }

        // 在画布中找到对应的列表项并添加动画效果
        const listItem = document.querySelector(`.node-list-item[data-node="${node.name}"]`);
        if (listItem) {
          // 确保列表项可见
          listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 添加持久高亮效果
          listItem.classList.add('node-focused');
          listItem.classList.add('node-persistent-focus');

          // 添加初始脉冲动画效果
          listItem.style.animation = 'pulse 1.5s cubic-bezier(0.22, 1, 0.36, 1)';

          // 清除初始动画后保持高亮状态
          setTimeout(() => {
            listItem.style.animation = '';
          }, 1500);
        }

        // 8. 清理动画类但保持高亮状态
        setTimeout(() => {
          if (tableFlow) {
            tableFlow.classList.remove('camera-animate');
          }
          this.jsplumbInstance.repaintEverything();

          // 不再自动清除聚焦状态
          // this.focusedNode = null;
        }, 500);
      } catch (error) {
        console.error("聚焦节点时出错:", error);
      }
    },

    // 清理画布
    cleanupCanvas() {
      if (!this.jsplumbInstance) return;

      // 挂起绘制操作
      this.jsplumbInstance.setSuspendDrawing(true);

      // 删除所有连接
      this.jsplumbInstance.deleteEveryConnection();

      // 删除所有端点
      this.jsplumbInstance.deleteEveryEndpoint();

      // 重置缩放和平移
      if (this.jsplumbInstance.pan) {
        this.jsplumbInstance.pan.moveTo(0, 0);
        this.jsplumbInstance.pan.zoomAbs(0, 0, 1);
      }

      // 清理连接线缓存
      this.clearConnectionCache();

      // 恢复绘制
      this.jsplumbInstance.setSuspendDrawing(false, true);
    },

    // 清理连接线缓存
    clearConnectionCache() {
      this.connectionCache.clear();
      this.lastVisibleEdgesHash = '';
      this.renderQueue = [];
      this.isRendering = false;
    },

    // 获取缓存的 DOM 元素 - 优化版本
    getCachedElement(id) {
      const now = Date.now();

      // 检查缓存是否存在且未过期
      if (this.cachedElements.has(id)) {
        const expiry = this.elementCacheExpiry.get(id);
        if (expiry && now < expiry) {
          return this.cachedElements.get(id);
        } else {
          // 缓存已过期，清理
          this.cachedElements.delete(id);
          this.elementCacheExpiry.delete(id);
        }
      }

      // 获取新元素并缓存
      const element = document.getElementById(id);
      if (element) {
        // 使用智能缓存管理
        this.smartCacheSet(this.cachedElements, id, element);
        this.elementCacheExpiry.set(id, now + this.cacheExpiryTime);
      }

      return element;
    },

    // 获取缓存的查询选择器元素 - 优化版本
    getCachedQuerySelector(selector) {
      const now = Date.now();
      const cacheKey = `query:${selector}`;

      // 检查缓存是否存在且未过期
      if (this.cachedElements.has(cacheKey)) {
        const expiry = this.elementCacheExpiry.get(cacheKey);
        if (expiry && now < expiry) {
          return this.cachedElements.get(cacheKey);
        } else {
          // 缓存已过期，清理
          this.cachedElements.delete(cacheKey);
          this.elementCacheExpiry.delete(cacheKey);
        }
      }

      // 获取新元素并缓存
      const element = document.querySelector(selector);
      if (element) {
        // 使用智能缓存管理
        this.smartCacheSet(this.cachedElements, cacheKey, element);
        this.elementCacheExpiry.set(cacheKey, now + this.cacheExpiryTime);
      }

      return element;
    },

    // 清理 DOM 缓存
    clearElementCache() {
      this.cachedElements.clear();
      this.elementCacheExpiry.clear();
    },

    // 清理过期的 DOM 缓存
    clearExpiredElementCache() {
      const now = Date.now();
      const expiredKeys = [];

      this.elementCacheExpiry.forEach((expiry, key) => {
        if (now >= expiry) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach(key => {
        this.cachedElements.delete(key);
        this.elementCacheExpiry.delete(key);
      });
    },

    // 批量更新元素样式 - 优化性能
    batchUpdateElementStyles(elements, styleUpdates) {
      if (!elements || elements.length === 0) return;

      // 使用 requestAnimationFrame 批量更新
      requestAnimationFrame(() => {
        elements.forEach(element => {
          if (element && element.style) {
            Object.assign(element.style, styleUpdates);
          }
        });
      });
    },

    // 批量添加/移除 CSS 类
    batchUpdateElementClasses(elements, classUpdates) {
      if (!elements || elements.length === 0) return;

      requestAnimationFrame(() => {
        elements.forEach(({ element, addClasses = [], removeClasses = [] }) => {
          if (element && element.classList) {
            addClasses.forEach(className => {
              element.classList.add(className);
            });
            removeClasses.forEach(className => {
              element.classList.remove(className);
            });
          }
        });
      });
    },

    // 优化的事件监听器添加方法
    addOptimizedEventListener(element, event, handler, options = {}) {
      const key = `${element}-${event}`;

      // 如果已经存在监听器，先移除
      if (this.eventListeners.has(key)) {
        this.removeOptimizedEventListener(element, event);
      }

      // 自动添加 passive 选项以提高性能
      if (this.passiveEvents.includes(event) && !options.hasOwnProperty('passive')) {
        options.passive = true;
      }

      // 添加事件监听器
      element.addEventListener(event, handler, options);

      // 存储监听器引用
      this.eventListeners.set(key, {
        element,
        event,
        handler,
        options
      });
    },

    // 优化的事件监听器移除方法
    removeOptimizedEventListener(element, event) {
      const key = `${element}-${event}`;
      const listener = this.eventListeners.get(key);

      if (listener) {
        listener.element.removeEventListener(listener.event, listener.handler, listener.options);
        this.eventListeners.delete(key);
      }
    },

    // 清理所有事件监听器
    clearAllEventListeners() {
      this.eventListeners.forEach((listener, key) => {
        listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      });
      this.eventListeners.clear();
    },

    // 智能节流事件处理
    createThrottledHandler(handler, delay, key) {
      if (this.eventThrottleMap.has(key)) {
        return this.eventThrottleMap.get(key);
      }

      const throttledHandler = throttle(handler, delay, { leading: true, trailing: true });
      this.eventThrottleMap.set(key, throttledHandler);
      return throttledHandler;
    },

    // 智能防抖事件处理
    createDebouncedHandler(handler, delay, key) {
      if (this.eventDebounceMap.has(key)) {
        return this.eventDebounceMap.get(key);
      }

      const debouncedHandler = debounce(handler, delay);
      this.eventDebounceMap.set(key, debouncedHandler);
      return debouncedHandler;
    },

    // 批量事件绑定 - 优化性能
    batchAddEventListeners(elements, event, handler, options = {}) {
      if (!elements || elements.length === 0) return;

      // 使用 requestAnimationFrame 批量处理
      requestAnimationFrame(() => {
        elements.forEach(element => {
          if (element) {
            this.addOptimizedEventListener(element, event, handler, options);
          }
        });
      });
    },

    // 批量事件解绑
    batchRemoveEventListeners(elements, event) {
      if (!elements || elements.length === 0) return;

      elements.forEach(element => {
        if (element) {
          this.removeOptimizedEventListener(element, event);
        }
      });
    },

    // 内存管理优化方法
    // 智能缓存管理 - 限制缓存大小
    smartCacheSet(cache, key, value, maxSize = this.maxCacheSize) {
      if (cache.size >= maxSize) {
        // 删除最旧的条目（Map 保持插入顺序）
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
      this.updateMemoryStats();
    },

    // 更新内存统计
    updateMemoryStats() {
      this.memoryStats.cacheSize = this.cachedElements.size + this.connectionCache.size;
      this.memoryStats.lastCleanup = Date.now();
    },

    // 对象池管理 - 复用常用对象
    getFromObjectPool(type, createFn) {
      if (this.objectPool.has(type)) {
        const pool = this.objectPool.get(type);
        if (pool.length > 0) {
          return pool.pop();
        }
      }
      return createFn();
    },

    // 归还对象到对象池
    returnToObjectPool(type, obj, resetFn) {
      if (!this.objectPool.has(type)) {
        this.objectPool.set(type, []);
      }

      const pool = this.objectPool.get(type);
      if (pool.length < this.maxObjectPoolSize) {
        // 重置对象状态
        if (resetFn) {
          resetFn(obj);
        }
        pool.push(obj);
      }
    },

    // 智能内存清理
    smartMemoryCleanup() {
      const now = Date.now();
      const timeSinceLastCleanup = now - this.memoryStats.lastCleanup;

      // 如果距离上次清理超过5分钟，或者缓存过大，进行清理
      if (timeSinceLastCleanup > 300000 || this.memoryStats.cacheSize > this.maxCacheSize) {
        this.performMemoryCleanup();
        this.memoryStats.cleanupCount++;
      }
    },

    // 执行内存清理
    performMemoryCleanup() {
      // 清理过期的 DOM 缓存
      this.clearExpiredElementCache();

      // 清理连接线缓存
      if (this.connectionCache.size > this.maxCacheSize / 2) {
        this.connectionCache.clear();
        this.lastVisibleEdgesHash = '';
      }

      // 清理事件节流和防抖缓存
      if (this.eventThrottleMap.size > 50) {
        this.eventThrottleMap.clear();
      }
      if (this.eventDebounceMap.size > 50) {
        this.eventDebounceMap.clear();
      }

      // 清理对象池
      this.objectPool.forEach((pool, type) => {
        if (pool.length > this.maxObjectPoolSize / 2) {
          pool.splice(0, pool.length - this.maxObjectPoolSize / 2);
        }
      });

      // 强制垃圾回收（如果支持）
      if (window.gc) {
        window.gc();
      }

      this.updateMemoryStats();
      console.log('Memory cleanup completed. Cache size:', this.memoryStats.cacheSize);
    },

    // 使用 WeakMap 存储弱引用
    setWeakRef(key, value) {
      this.weakRefs.set(key, value);
    },

    // 获取弱引用
    getWeakRef(key) {
      return this.weakRefs.get(key);
    },

    // 优化的大数组处理
    processLargeArray(array, processor, batchSize = 100) {
      return new Promise((resolve) => {
        let index = 0;

        const processBatch = () => {
          const endIndex = Math.min(index + batchSize, array.length);

          for (let i = index; i < endIndex; i++) {
            processor(array[i], i);
          }

          index = endIndex;

          if (index < array.length) {
            // 使用 requestIdleCallback 在空闲时处理下一批
            if (window.requestIdleCallback) {
              requestIdleCallback(processBatch, { timeout: 50 });
            } else {
              requestAnimationFrame(processBatch);
            }
          } else {
            resolve();
          }
        };

        processBatch();
      });
    },

    // 内存使用监控
    getMemoryUsage() {
      const usage = {
        cacheSize: this.memoryStats.cacheSize,
        domCacheSize: this.cachedElements.size,
        connectionCacheSize: this.connectionCache.size,
        eventListenersSize: this.eventListeners.size,
        objectPoolSize: Array.from(this.objectPool.values()).reduce((sum, pool) => sum + pool.length, 0),
        lastCleanup: new Date(this.memoryStats.lastCleanup).toLocaleTimeString(),
        cleanupCount: this.memoryStats.cleanupCount
      };

      // 如果支持 performance.memory，添加更多信息
      if (window.performance && window.performance.memory) {
        const mem = window.performance.memory;
        usage.usedJSHeapSize = Math.round(mem.usedJSHeapSize / 1024 / 1024) + 'MB';
        usage.totalJSHeapSize = Math.round(mem.totalJSHeapSize / 1024 / 1024) + 'MB';
        usage.jsHeapSizeLimit = Math.round(mem.jsHeapSizeLimit / 1024 / 1024) + 'MB';
      }

      return usage;
    },

    // 手动触发内存清理（用于调试）
    manualMemoryCleanup() {
      console.log('Manual memory cleanup triggered');
      this.performMemoryCleanup();
      console.log('Memory usage after cleanup:', this.getMemoryUsage());
    },

    // 渲染性能优化方法
    // 智能 DOM 更新调度
    scheduleDOMUpdate(element, updateFn) {
      this.pendingUpdates.add({ element, updateFn });

      if (!this.updateScheduled) {
        this.updateScheduled = true;
        requestAnimationFrame(() => {
          this.flushDOMUpdates();
        });
      }
    },

    // 批量执行 DOM 更新
    flushDOMUpdates() {
      if (this.pendingUpdates.size === 0) {
        this.updateScheduled = false;
        return;
      }

      // 挂起重排和重绘
      const updates = Array.from(this.pendingUpdates);
      this.pendingUpdates.clear();

      // 批量执行更新
      updates.forEach(({ element, updateFn }) => {
        try {
          updateFn(element);
        } catch (error) {
          console.warn('DOM update failed:', error);
        }
      });

      this.updateScheduled = false;
    },

    // 启用硬件加速 - 增强版
    enableHardwareAcceleration(element) {
      if (!element || !this.renderOptimizations.useTransform3d) return;

      // 使用 transform3d 启用硬件加速
      element.style.transform = 'translate3d(0, 0, 0)';
      element.style.willChange = 'transform';

      // 添加更多硬件加速优化
      element.style.backfaceVisibility = 'hidden';
      element.style.perspective = '1000px';
      element.style.transformStyle = 'preserve-3d';

      // 减少重排和重绘
      element.style.contain = 'paint layout';

      // 缓存图层信息
      this.layerCache.set(element, {
        hasHardwareAcceleration: true,
        timestamp: Date.now()
      });
    },

    // 优化图层
    optimizeLayer(element, layerType = 'auto') {
      if (!element || !this.renderOptimizations.enableLayerOptimization) return;

      const layerTypes = {
        auto: 'auto',
        transform: 'transform',
        opacity: 'opacity',
        scroll: 'scroll',
        paint: 'paint'
      };

      const layerTypeValue = layerTypes[layerType] || 'auto';
      element.style.willChange = layerTypeValue;

      // 缓存图层信息
      this.layerCache.set(element, {
        layerType: layerTypeValue,
        timestamp: Date.now()
      });
    },

    // 清理图层优化
    cleanupLayerOptimization(element) {
      if (!element) return;

      // 延迟清理，避免频繁切换
      setTimeout(() => {
        if (element.style) {
          element.style.willChange = 'auto';
        }
        this.layerCache.delete(element);
      }, 1000);
    },

    // 优化的样式更新
    updateElementStyleOptimized(element, styles) {
      if (!element) return;

      this.scheduleDOMUpdate(element, (el) => {
        Object.assign(el.style, styles);
      });
    },

    // 优化的类名更新
    updateElementClassOptimized(element, { add = [], remove = [] } = {}) {
      if (!element) return;

      this.scheduleDOMUpdate(element, (el) => {
        add.forEach(className => el.classList.add(className));
        remove.forEach(className => el.classList.remove(className));
      });
    },

    // 渲染性能监控
    startRenderMonitoring() {
      let lastTime = performance.now();

      const measureFrame = () => {
        const currentTime = performance.now();
        const frameTime = currentTime - lastTime;

        this.renderStats.frameCount++;
        this.renderStats.lastFrameTime = frameTime;

        // 计算平均帧时间
        this.renderStats.averageFrameTime =
          (this.renderStats.averageFrameTime * (this.renderStats.frameCount - 1) + frameTime) / this.renderStats.frameCount;

        this.renderStats.renderQueueSize = this.renderQueue.length;

        lastTime = currentTime;
        requestAnimationFrame(measureFrame);
      };

      requestAnimationFrame(measureFrame);
    },

    // 获取渲染性能统计
    getRenderStats() {
      return {
        ...this.renderStats,
        fps: this.renderStats.averageFrameTime > 0 ? Math.round(1000 / this.renderStats.averageFrameTime) : 0,
        layerCount: this.layerCache.size,
        pendingUpdates: this.pendingUpdates.size
      };
    },

    // 优化的 jsPlumb 重绘
    optimizedJsPlumbRepaint() {
      if (!this.jsplumbInstance) return;

      // 取消之前的渲染请求
      if (this.repaintRequestId) {
        cancelAnimationFrame(this.repaintRequestId);
      }

      // 使用 requestAnimationFrame 确保在下一帧执行
      this.repaintRequestId = requestAnimationFrame(() => {
        // 挂起绘制操作
        this.jsplumbInstance.setSuspendDrawing(true);

        // 优先处理可视区域内的连接
        const visibleConnections = this.getVisibleConnections();
        if (visibleConnections.length > 0) {
          // 批量处理可见连接
          this.batchProcessConnections(visibleConnections, conn => {
            conn.repaint();
          });
        } else {
          // 如果没有可见连接，执行全局重绘
          this.jsplumbInstance.repaintEverything();
        }

        // 恢复绘制操作
        this.jsplumbInstance.setSuspendDrawing(false, true);

        // 清除请求ID
        this.repaintRequestId = null;
      });
    },

    // 获取可视区域内的连接
    getVisibleConnections() {
      if (!this.jsplumbInstance) return [];

      const allConnections = this.jsplumbInstance.getAllConnections();
      const { top, bottom, left, right } = this.viewportBounds;
      const padding = VIEWPORT_PADDING;

      return allConnections.filter(conn => {
        // 检查连接是否在可视区域内
        const sourceElement = document.getElementById(conn.sourceId);
        const targetElement = document.getElementById(conn.targetId);

        if (!sourceElement || !targetElement) return false;

        const sourceBounds = sourceElement.getBoundingClientRect();
        const targetBounds = targetElement.getBoundingClientRect();

        // 计算连接线的边界框
        const connTop = Math.min(sourceBounds.top, targetBounds.top);
        const connBottom = Math.max(sourceBounds.bottom, targetBounds.bottom);
        const connLeft = Math.min(sourceBounds.left, targetBounds.left);
        const connRight = Math.max(sourceBounds.right, targetBounds.right);

        return connBottom >= top - padding &&
          connTop <= bottom + padding &&
          connRight >= left - padding &&
          connLeft <= right + padding;
      });
    },

    // 批量处理连接
    batchProcessConnections(connections, processor, batchSize = 20) {
      if (!connections || connections.length === 0) return;

      const totalConnections = connections.length;
      let processedCount = 0;

      const processBatch = () => {
        const end = Math.min(processedCount + batchSize, totalConnections);

        for (let i = processedCount; i < end; i++) {
          processor(connections[i]);
        }

        processedCount = end;

        if (processedCount < totalConnections) {
          requestAnimationFrame(processBatch);
        }
      };

      processBatch();
    },

    // 优化的连接线更新 - 高性能版本
    optimizedConnectionUpdate(connections, updateFn) {
      if (!connections || connections.length === 0) return;

      // 挂起绘制操作
      if (this.jsplumbInstance) {
        this.jsplumbInstance.setSuspendDrawing(true);
      }

      // 优先处理可视区域内的连接
      const visibleConnections = this.getVisibleConnections();
      const nonVisibleConnections = connections.filter(conn =>
        !visibleConnections.includes(conn)
      );

      // 分批处理连接线更新 - 先处理可见连接，再处理不可见连接
      const processBatch = (conns, batchSize, callback) => {
        let index = 0;

        const processNextBatch = () => {
          if (index >= conns.length) {
            if (callback) callback();
            return;
          }

          const end = Math.min(index + batchSize, conns.length);
          const batch = conns.slice(index, end);

          batch.forEach(conn => {
            try {
              updateFn(conn);

              // 对可见连接应用硬件加速
              if (visibleConnections.includes(conn)) {
                const connector = conn.getConnector();
                if (connector && connector.canvas) {
                  connector.canvas.style.willChange = 'transform';
                  connector.canvas.style.transform = 'translateZ(0)';
                }
              }
            } catch (error) {
              console.warn('Connection update failed:', error);
            }
          });

          index = end;

          // 使用 requestAnimationFrame 处理下一批
          requestAnimationFrame(() => {
            processNextBatch();
          });
        };

        processNextBatch();
      };

      // 先处理可见连接，再处理不可见连接
      processBatch(visibleConnections, 20, () => {
        processBatch(nonVisibleConnections, 50, () => {
          // 所有连接处理完成后，恢复绘制
          if (this.jsplumbInstance) {
            this.jsplumbInstance.setSuspendDrawing(false, true);
          }
        });
      });
    },

    // 渲染性能调试
    debugRenderPerformance() {
      const renderStats = this.getRenderStats();
      const memoryUsage = this.getMemoryUsage();

      console.log('=== 渲染性能统计 ===');
      console.log('FPS:', renderStats.fps);
      console.log('平均帧时间:', renderStats.averageFrameTime.toFixed(2) + 'ms');
      console.log('渲染队列大小:', renderStats.renderQueueSize);
      console.log('图层数量:', renderStats.layerCount);
      console.log('待更新元素:', renderStats.pendingUpdates);

      console.log('=== 内存使用统计 ===');
      console.log('缓存大小:', memoryUsage.cacheSize);
      console.log('DOM缓存:', memoryUsage.domCacheSize);
      console.log('连接线缓存:', memoryUsage.connectionCacheSize);
      console.log('事件监听器:', memoryUsage.eventListenersSize);
      console.log('对象池大小:', memoryUsage.objectPoolSize);

      return { renderStats, memoryUsage };
    },

    // CSS 优化方法
    // 初始化动态样式表
    initDynamicStyleSheet() {
      if (this.styleSheet) return;

      const style = document.createElement('style');
      style.id = 'dynamic-optimizations';
      document.head.appendChild(style);
      this.styleSheet = style.sheet;
    },

    // 添加优化的 CSS 规则
    addOptimizedCSSRule(selector, properties) {
      if (!this.styleSheet) {
        this.initDynamicStyleSheet();
      }

      const ruleKey = `${selector}-${JSON.stringify(properties)}`;
      if (this.cssCache.has(ruleKey)) return;

      const cssText = `${selector} { ${Object.entries(properties)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')} }`;

      try {
        this.styleSheet.insertRule(cssText, this.styleSheet.cssRules.length);
        this.cssCache.set(ruleKey, true);
      } catch (error) {
        console.warn('Failed to add CSS rule:', error);
      }
    },

    // 应用 CSS containment 优化
    applyCSSContainment(element, containment = 'layout style paint') {
      if (!element || !this.cssOptimizations.useContainment) return;

      this.addOptimizedCSSRule(`#${element.id}`, {
        'contain': containment
      });
    },

    // 应用 will-change 优化
    applyWillChange(element, property = 'transform') {
      if (!element || !this.cssOptimizations.enableWillChange) return;

      this.scheduleDOMUpdate(element, (el) => {
        el.style.willChange = property;
      });
    },

    // 应用 backface-visibility 优化
    applyBackfaceVisibility(element) {
      if (!element || !this.cssOptimizations.useBackfaceVisibility) return;

      this.addOptimizedCSSRule(`#${element.id}`, {
        'backface-visibility': 'hidden',
        'transform-style': 'preserve-3d'
      });
    },

    // 应用 transform 优化
    applyTransformOptimization(element, transform = 'translate3d(0, 0, 0)') {
      if (!element || !this.cssOptimizations.enableTransformOptimization) return;

      this.scheduleDOMUpdate(element, (el) => {
        el.style.transform = transform;
      });
    },

    // 应用 filter 优化
    applyFilterOptimization(element, filter = 'none') {
      if (!element || !this.cssOptimizations.useFilterOptimization) return;

      this.scheduleDOMUpdate(element, (el) => {
        el.style.filter = filter;
      });
    },

    // 批量应用 CSS 优化
    applyBatchCSSOptimizations(elements, optimizations = {}) {
      if (!elements || elements.length === 0) return;

      elements.forEach(element => {
        if (optimizations.containment) {
          this.applyCSSContainment(element, optimizations.containment);
        }
        if (optimizations.willChange) {
          this.applyWillChange(element, optimizations.willChange);
        }
        if (optimizations.backfaceVisibility) {
          this.applyBackfaceVisibility(element);
        }
        if (optimizations.transform) {
          this.applyTransformOptimization(element, optimizations.transform);
        }
        if (optimizations.filter) {
          this.applyFilterOptimization(element, optimizations.filter);
        }
      });
    },

    // 清理 CSS 优化
    cleanupCSSOptimizations(element) {
      if (!element) return;

      this.scheduleDOMUpdate(element, (el) => {
        el.style.willChange = 'auto';
        el.style.filter = 'none';
      });
    },

    // 优化的动画类添加
    addOptimizedAnimationClass(element, className, duration = 1000) {
      if (!element) return;

      this.scheduleDOMUpdate(element, (el) => {
        el.classList.add(className);

        // 自动清理动画类
        setTimeout(() => {
          if (el.classList.contains(className)) {
            el.classList.remove(className);
          }
        }, duration);
      });
    },

    // 优化的样式切换
    toggleOptimizedStyle(element, styles, duration = 300) {
      if (!element) return;

      this.scheduleDOMUpdate(element, (el) => {
        Object.assign(el.style, styles);

        // 自动恢复样式
        setTimeout(() => {
          this.scheduleDOMUpdate(element, (el) => {
            Object.keys(styles).forEach(key => {
              el.style[key] = '';
            });
          });
        }, duration);
      });
    },

    // CSS 性能调试
    debugCSSPerformance() {
      const cssStats = {
        cssCacheSize: this.cssCache.size,
        styleSheetRules: this.styleSheet ? this.styleSheet.cssRules.length : 0,
        cssOptimizations: this.cssOptimizations,
        layerCacheSize: this.layerCache.size
      };

      console.log('=== CSS 性能统计 ===');
      console.log('CSS 缓存大小:', cssStats.cssCacheSize);
      console.log('动态样式表规则数:', cssStats.styleSheetRules);
      console.log('图层缓存大小:', cssStats.layerCacheSize);
      console.log('CSS 优化配置:', cssStats.cssOptimizations);

      return cssStats;
    },

    // 处理新的血缘数据
    async handleNewLineageData(data) {
      this.isAnalyzing = true;
      try {
        // 清理现有画布
        this.cleanupCanvas();

        // 清除所有高亮状态
        this.highlightedFields = [];
        this.highlightedTables = [];

        // 更新数据
        this.json.nodes = data.nodes;
        this.json.edges = data.edges;

        // 检查是否需要启用虚拟化
        if (this.shouldEnableVirtualization) {
          this.showToastMessage(`节点数量较多(${data.nodes.length})，已启用虚拟化渲染以提高性能`);
        }

        // 重新初始化画布
        await this.reinitializeCanvas();

        // 定位到第一个来源表
        this.$nextTick(() => {
          // 获取所有来源表
          const originNodes = this.json.nodes.filter(node => node.type === 'Origin');
          if (originNodes.length > 0) {
            // 聚焦到第一个来源表
            this.focusOnNode(originNodes[0]);
          }
        });
      } finally {
        this.isAnalyzing = false;
      }
    },

    // 新增：处理表级高亮
    handleTableHighlight(data) {
      const { tableName } = data;

      // 清除之前的高亮
      this.highlightedTables = [];
      this.highlightedFields = [];

      // 重置表索引
      this.resetTableIndex();

      // 添加新的高亮表
      this.highlightedTables.push(tableName);

      // 找到与该表相关的所有表（上下游）
      const relatedTables = new Set([tableName]);

      // 遍历边找相关表
      this.json.edges.forEach(edge => {
        if (edge.from.name === tableName) {
          relatedTables.add(edge.to.name);
        }
        if (edge.to.name === tableName) {
          relatedTables.add(edge.from.name);
        }
      });

      // 更新高亮表集合
      this.highlightedTables = Array.from(relatedTables);

      // 高亮相关的连接线
      this.$nextTick(() => {
        this.highlightTableConnections(this.highlightedTables);
      });
    },

    // 修改：高亮表级连接线
    highlightTableConnections(highlightedTables) {
      if (!this.jsplumbInstance) return;

      const allConnections = this.jsplumbInstance.getAllConnections();

      // 重置所有连接线样式
      allConnections.forEach(conn => {
        conn.setPaintStyle(this.commConfig.PaintStyle);
        conn.setHoverPaintStyle(this.commConfig.HoverPaintStyle);
      });

      // 高亮相关连接线
      allConnections.forEach(conn => {
        const sourceId = conn.sourceId.split(this.minus)[0];
        const targetId = conn.targetId.split(this.minus)[0];

        // 如果连接线的两端都在高亮表集合中，则高亮该连接线
        if (highlightedTables.includes(sourceId) && highlightedTables.includes(targetId)) {
          conn.setPaintStyle(this.commConfig.HoverPaintStyle);

          // 如果启用了仅显示关键路径，确保连接线可见
          if (this.showOnlyCriticalPath) {
            conn.setVisible(true);
            this.jsplumbInstance.show(conn.sourceId, true);
            this.jsplumbInstance.show(conn.targetId, true);
          }
        }
      });
    },

    // 新增：清空 SQL 查询 - 优化版本
    clearSqlQuery() {
      this.sqlQuery = '';
      // 聚焦回输入框
      const textarea = this.getCachedQuerySelector('.sql-textarea');
      if (textarea) {
        textarea.focus();
      }
    },
    // 表被引用次数（参与所有血缘关系的次数，无论是from还是to）
    getTableReferenceCount(tableName) {
      if (!this.json.edges || !Array.isArray(this.json.edges)) return 0;
      return this.json.edges.filter(
        edge =>
          edge.to.name === tableName ||
          edge.from.name === tableName
      ).length;
    },
    // 字段被引用次数（参与所有血缘关系的次数，无论是from还是to）
    getFieldReferenceCount(tableName, fieldName) {
      if (!this.json.edges || !Array.isArray(this.json.edges)) return 0;
      return this.json.edges.filter(
        edge =>
          (edge.to.name === tableName && edge.to.field === fieldName) ||
          (edge.from.name === tableName && edge.from.field === fieldName)
      ).length;
    },
    // 字段模式下点击字段定位
    focusFieldFromList(field) {
      this.selectField(field);
    },
    // 清理所有 CSS 优化
    cleanupAllCSSOptimizations() {
      // 清理动态样式表
      if (this.styleSheet && this.styleSheet.ownerNode) {
        this.styleSheet.ownerNode.parentNode.removeChild(this.styleSheet.ownerNode);
        this.styleSheet = null;
      }
      // 清理 CSS 缓存
      if (this.cssCache) {
        this.cssCache.clear();
      }
      // 清理图层缓存
      if (this.layerCache) {
        this.layerCache.clear();
      }
    },

    // 表类型筛选相关方法
    selectAllTypes() {
      this.selectedTableTypes = this.tableTypes.map(type => type.type);
    },

    clearAllTypes() {
      this.selectedTableTypes = [];
    },

    // 分组折叠/展开
    toggleGroupCollapse(type) {
      this.groupCollapseState[type] = !this.groupCollapseState[type];
    },
    isGroupCollapsed(type) {
      return !!this.groupCollapseState[type];
    },
    // 检测设备性能
    detectDevicePerformance() {
      // 首先尝试从localStorage加载用户偏好
      try {
        const savedMode = localStorage.getItem('highPerformanceMode');
        if (savedMode === 'true') {
          this.performanceConfig.highPerformanceMode = true;
          this.performanceConfig.enableAnimations = false;
          this.performanceConfig.enableSmoothScroll = false;
          this.performanceConfig.enableAlignmentLines = false;
          this.applyHighPerformanceMode();
          return; // 如果已经有用户偏好，直接使用它
        }
      } catch (e) {
        console.warn('无法加载性能模式偏好:', e);
      }

      // 简单性能检测
      const start = performance.now();
      let count = 0;
      for (let i = 0; i < 1000000; i++) {
        count += i;
      }
      const duration = performance.now() - start;

      // 如果性能测试时间较长，启用高性能模式
      if (duration > 50) {
        this.performanceConfig.highPerformanceMode = true;
        this.performanceConfig.enableAnimations = false;
        this.performanceConfig.enableSmoothScroll = false;
        this.performanceConfig.enableAlignmentLines = false;

        // 应用高性能模式配置
        this.applyHighPerformanceMode();

        // 通知用户
        this.showToastMessage('已自动启用高性能模式以提升流畅度');
      }

      // 检测是否为移动设备
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        // 移动设备上默认启用高性能模式
        this.performanceConfig.highPerformanceMode = true;
        this.performanceConfig.enableAnimations = false;
        this.applyHighPerformanceMode();
      }

      // 检测是否为低内存设备
      if (navigator.deviceMemory && navigator.deviceMemory < 4) {
        // 低内存设备上启用高性能模式
        this.performanceConfig.highPerformanceMode = true;
        this.performanceConfig.enableAnimations = false;
        this.applyHighPerformanceMode();
      }

      // 检测是否为低端CPU
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        // 低端CPU设备上启用高性能模式
        this.performanceConfig.highPerformanceMode = true;
        this.performanceConfig.enableAnimations = false;
        this.applyHighPerformanceMode();
      }
    },

    // 应用高性能模式配置
    applyHighPerformanceMode() {
      // 减少缓存大小
      this.maxCacheSize = 500;
      this.maxObjectPoolSize = 50;
      this.cacheExpiryTime = 15000;

      // 优化渲染配置
      this.renderOptimizations.useCompositorOnlyAnimations = true;
      this.renderOptimizations.batchDOMUpdates = true;

      // 禁用不必要的CSS优化
      this.cssOptimizations.useContainment = false;
      this.cssOptimizations.enableWillChange = true;
      this.cssOptimizations.useFilterOptimization = false;

      // 更新节点拖动网格大小，使拖动更粗糙但更流畅
      this.commGrid = [5, 5];

      // 减少DOM缓存
      this.clearElementCache();

      // 强制执行一次内存清理
      this.performMemoryCleanup();

      console.log('已启用高性能模式');
    },
    togglePerformanceMode() {
      this.performanceConfig.highPerformanceMode = !this.performanceConfig.highPerformanceMode;

      if (this.performanceConfig.highPerformanceMode) {
        // 启用高性能模式
        this.performanceConfig.enableAnimations = false;
        this.performanceConfig.enableSmoothScroll = false;
        this.performanceConfig.enableAlignmentLines = false;

        // 应用高性能模式配置
        this.applyHighPerformanceMode();

        // 通知用户
        this.showToastMessage('已启用高性能模式，提升操作流畅度');
      } else {
        // 恢复标准模式
        this.performanceConfig.enableAnimations = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        this.performanceConfig.enableSmoothScroll = true;
        this.performanceConfig.enableAlignmentLines = true;

        // 恢复标准配置
        this.maxCacheSize = 1000;
        this.maxObjectPoolSize = 100;
        this.cacheExpiryTime = 30000;

        // 恢复渲染配置
        this.renderOptimizations.useCompositorOnlyAnimations = true;
        this.renderOptimizations.batchDOMUpdates = true;

        // 恢复CSS优化
        this.cssOptimizations.useContainment = true;
        this.cssOptimizations.enableWillChange = true;
        this.cssOptimizations.useFilterOptimization = true;

        // 恢复网格大小
        this.commGrid = [2, 2];

        // 清理并重建缓存
        this.clearElementCache();

        // 通知用户
        this.showToastMessage('已切换到标准模式，视觉效果更佳');

        // 重绘连接线
        this.optimizedJsPlumbRepaint();
      }

      // 保存用户偏好到localStorage
      try {
        localStorage.setItem('highPerformanceMode', this.performanceConfig.highPerformanceMode ? 'true' : 'false');
      } catch (e) {
        console.warn('无法保存性能模式偏好:', e);
      }
    },
    // 获取当前视口变换信息
    getTransform() {
      if (!this.jsplumbInstance || !this.jsplumbInstance.pan) {
        return { x: 0, y: 0, scale: 1 };
      }

      return this.jsplumbInstance.pan.getTransform();
    },

    // 获取容器尺寸
    getContainerSize() {
      if (!this.$refs.flowWrap) {
        return { width: 800, height: 600 };
      }

      const container = this.$refs.flowWrap;
      return {
        width: container.clientWidth,
        height: container.clientHeight
      };
    },

    // 处理小地图导航
    handleMinimapNavigate({ x, y }) {
      if (!this.jsplumbInstance || !this.jsplumbInstance.pan) return;

      // 添加动画效果
      const tableFlow = document.querySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }

      // 移动到指定位置（确保位置精确）
      this.jsplumbInstance.pan.moveTo(x, y);

      // 重绘连接线并移除动画类
      setTimeout(() => {
        this.jsplumbInstance.repaintEverything();
        if (tableFlow) {
          tableFlow.classList.remove('camera-animate');
        }

        // 手动触发MiniMap组件更新
        this.$nextTick(() => {
          // 创建一个自定义事件，通知MiniMap组件更新视口指示器
          const event = new CustomEvent('minimap-update');
          window.dispatchEvent(event);
        });
      }, 300);
    },

    // 切换小地图显示状态
    toggleMiniMap() {
      this.showMiniMap = !this.showMiniMap;
    },

    // 处理小地图大小调整
    handleMiniMapResize({ width, height }) {
      // 设置调整大小标志
      this.isMiniMapResizing = true;
      
      this.miniMapWidth = width;
      this.miniMapHeight = height;

      // 保存小地图尺寸到localStorage
      try {
        localStorage.setItem('minimap_width', width);
        localStorage.setItem('minimap_height', height);
      } catch (e) {
        console.warn('无法保存小地图尺寸设置:', e);
      }

      // 动态调整作者信息和表类型说明的位置
      this.$nextTick(() => {
        const authorSignature = document.querySelector('.author-signature');
        const tableTypeLegend = document.querySelector('.table-type-legend');

        if (authorSignature) {
          authorSignature.style.right = (width + 30) + 'px';
        }

        if (tableTypeLegend) {
          // 小地图变大时，表类型说明往上挪，避免重叠
          const baseBottom = 150; // 基础bottom值
          const offset = Math.max(0, height - 120); // 小地图高度超过120时开始上移
          tableTypeLegend.style.bottom = (baseBottom + offset + 20) + 'px';
        }
        
        // 重置调整大小标志
        this.isMiniMapResizing = false;
      });
    },

    // 切换关键路径显示状态
    toggleCriticalPath() {
      this.showOnlyCriticalPath = !this.showOnlyCriticalPath;

      // 调用处理函数来更新视图
      this.handleCriticalPathToggle();
    },

    // 处理文件上传
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // 检查文件类型
      const validExtensions = ['.txt', '.sql'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(fileExtension)) {
        this.showToastMessage('请选择.txt或.sql格式的SQL文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let content = e.target.result;

          // 移除BOM头（UTF-8 BOM: 0xEF 0xBB 0xBF）
          if (content.charCodeAt(0) === 0xFEFF ||
            (content.charCodeAt(0) === 0xEF &&
              content.charCodeAt(1) === 0xBB &&
              content.charCodeAt(2) === 0xBF)) {
            content = content.slice(1);
          }

          // 统一换行符为\n，处理不同操作系统的换行符差异
          content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          // 去除前后空白字符
          content = content.trim();

          this.sqlQuery = content;
          this.showToastMessage(`文件 "${file.name}" 上传成功，共 ${content.length} 字符`);
        } catch (error) {
          this.showToastMessage('文件读取失败，请重试');
          console.error('文件读取错误:', error);
        }
      };

      reader.onerror = () => {
        this.showToastMessage('文件读取失败，请重试');
      };

      // 使用UTF-8编码读取文件
      reader.readAsText(file, 'UTF-8');

      // 清空input值，允许重复上传同一文件
      event.target.value = '';
    },

    // 历史记录相关方法
    // 添加历史记录
    addToHistory(data) {
      const historyItem = {
        id: Date.now().toString(),
        sql: this.sqlQuery,
        lineageLevel: this.lineageLevel,
        filterCtes: this.filterCtes,
        data: JSON.parse(JSON.stringify(data)), // 深拷贝数据
        stats: {
          nodes: data.nodes.length,
          edges: data.edges.length
        },
        timestamp: new Date().toISOString(),
        title: this.generateHistoryTitle(this.sqlQuery)
      };

      // 检查是否已经存在相同的SQL
      const existingIndex = this.lineageHistory.findIndex(item => item.sql === this.sqlQuery);
      if (existingIndex !== -1) {
        // 如果存在，移除旧的记录
        this.lineageHistory.splice(existingIndex, 1);
      }

      // 添加到历史记录的开头
      this.lineageHistory.unshift(historyItem);

      // 限制历史记录数量
      if (this.lineageHistory.length > this.maxHistoryItems) {
        this.lineageHistory = this.lineageHistory.slice(0, this.maxHistoryItems);
      }

      // 保存到本地存储
      this.saveHistoryToStorage();
    },

    // 生成历史记录标题
    generateHistoryTitle(sql) {
      // 从SQL中提取第一个表名或前50个字符
      const trimmed = sql.trim();
      if (trimmed.length <= 30) {
        return trimmed;
      }

      // 尝试提取表名
      const tableMatch = sql.match(/(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
      if (tableMatch) {
        return `表: ${tableMatch[1]}`;
      }

      return trimmed.substring(0, 30) + '...';
    },

    // 格式化历史记录时间
    formatHistoryTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) { // 1分钟内
        return '刚刚';
      } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前';
      } else {
        return date.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },

    // 截断SQL显示
    truncateSQL(sql) {
      const trimmed = sql.trim();
      if (trimmed.length <= 60) {
        return trimmed;
      }
      return trimmed.substring(0, 60) + '...';
    },

    // 判断是否为当前显示的历史记录
    isCurrentHistory(item) {
      return this.json.nodes.length > 0 &&
        this.sqlQuery === item.sql &&
        this.lineageLevel === item.lineageLevel;
    },

    // 加载历史记录
    async loadHistoryItem(item) {
      try {
        this.isAnalyzing = true;

        // 恢复历史记录的设置
        this.sqlQuery = item.sql;
        this.lineageLevel = item.lineageLevel;
        this.filterCtes = item.filterCtes;

        // 使用缓存的数据，无需重新请求后端
        await this.handleNewLineageData(item.data);

        this.showToastMessage('已加载历史记录');
      } catch (error) {
        console.error('加载历史记录失败:', error);
        this.showToastMessage('加载历史记录失败');
      } finally {
        this.isAnalyzing = false;
      }
    },

    // 删除单个历史记录
    deleteHistoryItem(index) {
      this.lineageHistory.splice(index, 1);
      this.saveHistoryToStorage();
    },

    // 清空所有历史记录
    clearHistory() {
      if (confirm('确定要清空所有历史记录吗？')) {
        this.lineageHistory = [];
        this.saveHistoryToStorage();
        this.showToastMessage('已清空历史记录');
      }
    },

    // 切换历史记录面板
    toggleHistoryPanel() {
      this.showHistoryPanel = !this.showHistoryPanel;
    },

    // 保存历史记录到本地存储
    saveHistoryToStorage() {
      try {
        localStorage.setItem('lineageHistory', JSON.stringify(this.lineageHistory));
      } catch (error) {
        console.warn('无法保存历史记录到本地存储:', error);
      }
    },

    // 从本地存储加载历史记录
    loadHistoryFromStorage() {
      try {
        const saved = localStorage.getItem('lineageHistory');
        if (saved) {
          this.lineageHistory = JSON.parse(saved);
        }
        
        // 如果没有历史记录，添加一个示例
        if (this.lineageHistory.length === 0) {
          // 添加示例历史记录（仅在开发环境）
          if (process.env.NODE_ENV === 'development') {
            this.lineageHistory = [
              {
                id: 'demo-1',
                sql: 'SELECT * FROM users u JOIN orders o ON u.id = o.user_id',
                lineageLevel: 'column',
                filterCtes: false,
                data: {
                  nodes: [
                    { name: 'users', type: 'Origin', fields: [{ name: 'id' }, { name: 'name' }] },
                    { name: 'orders', type: 'Origin', fields: [{ name: 'id' }, { name: 'user_id' }] }
                  ],
                  edges: [
                    { from: { name: 'users', field: 'id' }, to: { name: 'orders', field: 'user_id' } }
                  ]
                },
                stats: { nodes: 2, edges: 1 },
                timestamp: new Date(Date.now() - 3600000).toISOString(), // 1小时前
                title: '用户订单关联查询'
              },
              {
                id: 'demo-2',
                sql: 'SELECT * FROM products p JOIN categories c ON p.category_id = c.id',
                lineageLevel: 'column',
                filterCtes: false,
                data: {
                  nodes: [
                    { name: 'products', type: 'Origin', fields: [{ name: 'id' }, { name: 'category_id' }] },
                    { name: 'categories', type: 'Origin', fields: [{ name: 'id' }] }
                  ],
                  edges: [
                    { from: { name: 'categories', field: 'id' }, to: { name: 'products', field: 'category_id' } }
                  ]
                },
                stats: { nodes: 2, edges: 1 },
                timestamp: new Date(Date.now() - 7200000).toISOString(), // 2小时前
                title: '产品分类关联'
              }
            ];
          }
        }
      } catch (error) {
        console.warn('无法从本地存储加载历史记录:', error);
        this.lineageHistory = [];
      }
    }
  }
};
</script>

<style lang="scss" src="./Index.scss"></style>