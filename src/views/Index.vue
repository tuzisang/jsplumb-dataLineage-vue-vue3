<template>
  <!-- <LoginDialog v-if="showLoginDialog" @login-success="handleLoginSuccess" /> -->
  <div class="app-container" :class="{ 'blurred': false }">
  <!-- SQL 输入面板 -->
  <div class="sql-container">
    <!-- 最小化按钮单独放置 -->
    <button 
      class="minimize-btn modern"
      @click="toggleMinimize"
      :title="isMinimized ? '展开' : '最小化'"
    >
      <svg v-if="isMinimized" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 14l5-5 5 5" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10l5 5 5-5" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <!-- SQL面板 -->
    <div class="sql-panel" :class="{ 'sql-panel--minimized': isMinimized }">
      <div class="sql-editor" v-show="!isMinimized">
        <div class="sql-textarea-wrapper compact">
          <textarea 
            v-model="sqlQuery" 
            placeholder="请输入 SQL 查询语句..."
            class="sql-textarea compact"
          ></textarea>
          <button 
            v-if="sqlQuery.trim()"
            class="clear-sql-btn"
            @click="clearSqlQuery"
            title="清空 SQL"
          >
            <span class="clear-icon">✕</span>
          </button>
        </div>
        <div class="sql-actions compact">
          <div class="sql-options compact">
            <div class="lineage-level-selector compact">
              <span class="option-label">血缘分析级别：</span>
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="lineageLevel" 
                  value="table"
                >
                <span class="radio-text">表级</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="lineageLevel" 
                  value="column"
                >
                <span class="radio-text">列级</span>
              </label>
            </div>
            <label class="option-label compact">
              <input 
                type="checkbox" 
                v-model="filterCtes"
              >
              <span class="option-text">仅显示物理表</span>
            </label>
          </div>
          <button 
            class="analyze-btn compact"
            @click="analyzeSql"
            :disabled="!sqlQuery.trim() || isAnalyzing"
          >
            {{ isAnalyzing ? '分析中...' : '分析血缘关系' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 复制成功提示 -->
  <div 
    v-if="showToast" 
    class="toast"
    :class="{'toast--show': showToast}"
  >
    {{ toastMessage }}
  </div>

    <!-- 镜头定位按钮 -->
    <div 
      v-if="showOnlyCriticalPath && highlightedFields.length > 0"
      class="camera-controls"
    >
      <div class="camera-info">
        <span class="field-counter">{{ currentFieldIndex + 1 }} / {{ highlightedFields.length }}</span>
      </div>
      <button 
        class="camera-button"
        @click="focusNextField"
        title="移动到下一个相关字段"
      >
        <i class="camera-icon">🎯</i>
      </button>
    </div>

    <!-- 批量操作按钮和关键路径开关 -->
    <div class="batch-actions">
      <button 
        class="batch-action-btn"
        @click="handleShowAllNodes"
        :disabled="hiddenNodes.size === 0"
      >
        <i class="show-icon">👁️</i>
        显示所有隐藏的表
      </button>
      
      <label class="critical-path-toggle">
        <input 
          type="checkbox" 
          v-model="showOnlyCriticalPath"
          @change="handleCriticalPathToggle"
        />
        <span class="toggle-label">仅显示关键路径</span>
      </label>
    </div>

    <div class="flow-wrapper" ref="flowWrap">
      <!-- 添加加载遮罩 -->
      <div v-if="isAnalyzing" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在分析血缘关系...</div>
      </div>
      <div id="table-flow" class="table-flow">
        <TableNode
            v-for="node in computedVisibleNodes"
            :key="node.name"
            :id="node.name"
            :node="node"
            :highlighted-fields="highlightedFields"
            :highlighted-tables="highlightedTables"
            :style="getNodeVisibility(node)"
            :is-disabled="isNodeDisabled(node)"
            :is-hidden="hiddenNodes.has(node.name)"
            :is-table-mode="lineageLevel === 'table'"
            :edges="computedVisibleEdges"
            @field-click="handleFieldClick"
            @table-name-click="handleTableNameClick"
            @table-highlight="handleTableHighlight"
            @copy-success="handleCopySuccess"
            @copy-error="handleCopyError"
            @hide-node="handleNodeVisibility"
        />

        <!-- 辅助线 -->
        <div 
          v-show="auxiliaryLine.isShowXLine" 
          class="auxiliary-line auxiliary-line--x"
          :style="{
            width: auxiliaryLinePos.width,
            top: auxiliaryLinePos.y + 'px',
            left: auxiliaryLinePos.offsetX + 'px'
          }"
        ></div>
        <div 
          v-show="auxiliaryLine.isShowYLine" 
          class="auxiliary-line auxiliary-line--y"
          :style="{
            height: auxiliaryLinePos.height,
            left: auxiliaryLinePos.x + 'px',
            top: auxiliaryLinePos.offsetY + 'px'
          }"
        ></div>
      </div>
    </div>

    <!-- 表类型图例 -->
    <div class="table-type-legend">
      <div class="legend-title">表类型说明</div>
      <div class="legend-items">
        <div 
          v-for="type in tableTypes" 
          :key="type.type" 
          class="legend-item"
        >
          <span 
            class="color-indicator"
            :style="{ backgroundColor: type.color }"
          ></span>
          <span class="type-name">{{ type.label || type.type }}</span>
        </div>
      </div>
    </div>

    <!-- 节点列表面板 -->
    <div 
      class="node-list-panel"
      :style="{ width: panelWidth + 'px' }">
      <div class="panel-header">
        <h3>
          <template v-if="listMode === 'table'">表列表</template>
          <template v-else>字段列表</template>
        </h3>
        <div class="panel-search">
          <input 
            type="text" 
            v-model="nodeSearchQuery" 
            :placeholder="listMode === 'table' ? '搜索表名...' : '搜索字段名...'"
            class="node-search-input"
            @input="handleNodeSearch"
          >
          <span 
            v-if="nodeSearchQuery" 
            class="clear-search"
            @click="clearNodeSearch"
          >✕</span>
        </div>
        <!-- 切换按钮 -->
        <div class="list-toggle" style="margin-top:8px;">
          <button 
            :class="{active: listMode === 'table'}" 
            @click="listMode = 'table'"
            style="margin-right: 4px;"
          >表</button>
          <button 
            :class="{active: listMode === 'field'}" 
            @click="listMode = 'field'"
          >字段</button>
        </div>
        
        <!-- 表类型筛选 -->
        <div class="type-filter-section">
          <div class="filter-header">
            <span class="filter-title">表类型筛选</span>
            <button 
              class="toggle-filter-btn"
              @click="showTypeFilter = !showTypeFilter"
              :title="showTypeFilter ? '收起筛选' : '展开筛选'"
            >
              <span v-if="showTypeFilter">▼</span>
              <span v-else>▶</span>
            </button>
          </div>
          
          <div v-show="showTypeFilter" class="filter-content">
            <div class="type-checkboxes">
              <label 
                v-for="type in tableTypes" 
                :key="type.type"
                class="type-checkbox"
              >
                <input 
                  type="checkbox" 
                  :value="type.type"
                  v-model="selectedTableTypes"
                >
                <span 
                  class="type-indicator"
                  :style="{ backgroundColor: type.color }"
                ></span>
                <span class="type-name">{{ type.label || type.type }}</span>
              </label>
            </div>
            
            <div class="filter-actions">
              <button 
                class="filter-action-btn"
                @click="selectAllTypes"
              >全选</button>
              <button 
                class="filter-action-btn"
                @click="clearAllTypes"
              >清空</button>
            </div>
          </div>
        </div>
        
        <!-- 分组显示开关 -->
        <div class="group-toggle">
          <label class="group-toggle-label">
            <input 
              type="checkbox" 
              v-model="groupByType"
            >
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
            <div 
              v-for="(nodes, type) in groupedNodeList" 
              :key="type"
              class="group-section"
            >
              <div class="group-header">
                <span 
                  class="group-type-indicator"
                  :style="{ backgroundColor: getTableColor(type) }"
                ></span>
                <span class="group-title">{{ getTableTypeLabel(type) }} ({{ nodes.length }})</span>
                <button 
                  type="button"
                  class="group-toggle-btn" 
                  @click.stop.prevent="toggleGroupCollapse(type)"
                  :title="isGroupCollapsed(type) ? '展开' : '折叠'"
                >
                  <span v-if="isGroupCollapsed(type)">▶</span>
                  <span v-else>▼</span>
                </button>
              </div>
              <div v-show="!isGroupCollapsed(type)">
                <div 
                  v-for="node in nodes" 
                  :key="node.name"
                  class="node-list-item"
                  :class="{
                    'node-hidden': hiddenNodes.has(node.name),
                    'node-focused': focusedNode === node.name,
                    'search-highlight': isNodeHighlighted(node)
                  }"
                  @click="focusOnNode(node)"
                >
                  <span 
                    class="node-type-indicator"
                    :style="{ backgroundColor: getTableColor(node.type) }"
                  ></span>
                  <span class="node-name" v-html="highlightSearchText(node.name)"></span>
                  <span class="node-fields-count">
                    {{ getTableReferenceCount(node.name) }}
                  </span>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div 
              v-for="node in filteredNodeList" 
              :key="node.name"
              class="node-list-item"
              :class="{
                'node-hidden': hiddenNodes.has(node.name),
                'node-focused': focusedNode === node.name,
                'search-highlight': isNodeHighlighted(node)
              }"
              @click="focusOnNode(node)"
            >
              <span 
                class="node-type-indicator"
                :style="{ backgroundColor: getTableColor(node.type) }"
              ></span>
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
            <div 
              v-for="(fields, type) in groupedFieldList" 
              :key="type"
              class="group-section"
            >
              <div class="group-header">
                <span 
                  class="group-type-indicator"
                  :style="{ backgroundColor: getTableColor(type) }"
                ></span>
                <span class="group-title">{{ getTableTypeLabel(type) }} ({{ fields.length }})</span>
                <button 
                  type="button"
                  class="group-toggle-btn" 
                  @click.stop.prevent="toggleGroupCollapse(type)"
                  :title="isGroupCollapsed(type) ? '展开' : '折叠'"
                >
                  <span v-if="isGroupCollapsed(type)">▶</span>
                  <span v-else>▼</span>
                </button>
              </div>
              <div v-show="!isGroupCollapsed(type)">
                <div 
                  v-for="field in fields" 
                  :key="field.tableName + '-' + field.fieldName"
                  class="node-list-item"
                  @click="focusFieldFromList(field)"
                >
                  <span class="node-type-indicator" :style="{ backgroundColor: getTableColor(field.tableType) }"></span>
                  <span class="node-name">{{ field.tableName }}.{{ field.fieldName }}</span>
                  <span class="node-fields-count">{{ field.refCount }}</span>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div 
              v-for="field in filteredFieldList" 
              :key="field.tableName + '-' + field.fieldName"
              class="node-list-item"
              @click="focusFieldFromList(field)"
            >
              <span class="node-type-indicator" :style="{ backgroundColor: getTableColor(field.tableType) }"></span>
              <span class="node-name">{{ field.tableName }}.{{ field.fieldName }}</span>
              <span class="node-fields-count">{{ field.refCount }}</span>
            </div>
          </template>
        </template>
      </div>
      <!-- 添加拖动调整宽度的把手 -->
      <div 
        class="resize-handle"
        @mousedown="startResize"
      ></div>
    </div>

    <!-- 虚拟化状态提示 --> -->
     <div v-if="virtualizationEnabled" class="virtualization-status"> -->
      <span>虚拟化渲染已启用 ({{ computedVisibleNodes.length }}/{{ json.nodes.length }} 节点)</span>
    </div>

    <!-- 作者署名 -->
    <div class="author-signature">
      <span>作者：tizisang</span>
    </div>
  </div>
</template>

<script lang="js">
import jsplumbModule from 'jsplumb'
import commConfig from './config/jsplumbConfig'
import comm from './methods/comm'
import { debounce, throttle } from 'lodash-es'

import TableNode from './components/TableNode.vue'
// import LoginDialog from './components/LoginDialog.vue'
import sampleData from './config/sampleData.json'
import colorFields from './config/tableTypeMappingColor'

const VIEWPORT_PADDING = 500; // 可视区域外的缓冲区大小
const BATCH_SIZE = 10; // 批量处理的节点数量
const VIRTUALIZATION_ENABLED = false; // 启用虚拟化渲染
const MAX_NODES_FOR_VIRTUALIZATION = 50; // 超过此数量启用虚拟化

const jsplumb = jsplumbModule.jsPlumb
export default {
  name: 'Index',
  components: {
    TableNode,
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
      commConfig: commConfig,
      auxiliaryLine: {isShowXLine: false, isShowYLine: false},
      auxiliaryLinePos: {width: '100%', height: '100%', offsetX: 0, offsetY: 0, x: 20, y: 20},
      minus: '-',
      anchorArr: ['Left', 'Right'],
      commGrid: [5, 5],
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
    };
  },
  mounted() {
    // this.checkLogin();
    this.renderDefaultLineage()
    
    // 使用优化的事件监听器添加方法
    this.addOptimizedEventListener(document, 'click', this.handleClickOutside);
    
    // 使用智能节流处理滚动事件
    const throttledScrollHandler = this.createThrottledHandler(this.handleScroll, 16, 'scroll');
    this.addOptimizedEventListener(this.$refs.flowWrap, 'scroll', throttledScrollHandler, { passive: true });
    
    // 使用智能防抖处理窗口调整大小
    const debouncedResizeHandler = this.createDebouncedHandler(this.handleResize, 100, 'resize');
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
    updateViewport: throttle(function() {
      const container = this.$refs.flowWrap;
      if (!container) return;
      
      const scale = this.jsplumbInstance ? this.jsplumbInstance.getZoom() : 1;
      
      this.viewportTop = container.scrollTop / scale;
      this.viewportBottom = (container.scrollTop + container.clientHeight) / scale;
      this.viewportLeft = container.scrollLeft / scale;
      this.viewportRight = (container.scrollLeft + container.clientWidth) / scale;
      
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
    }, 16),
    
    // 更新可见元素
    updateVisibleElements() {
      if (!this.virtualizationEnabled) return;
      
      // 使用智能连接线渲染
      this.$nextTick(() => {
        this.smartRenderConnections();
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
      
      // 将渲染任务加入队列
      this.renderQueue.push(() => {
        this.updateJsPlumbConnections();
      });
      
      // 如果队列中有任务且没有在渲染，开始渲染
      if (this.renderQueue.length > 0 && !this.isRendering) {
        this.processRenderQueue();
      }
    },
    
    // 处理渲染队列
    processRenderQueue() {
      if (this.renderQueue.length === 0) {
        this.isRendering = false;
        return;
      }
      
      this.isRendering = true;
      const renderTask = this.renderQueue.shift();
      
      if (window.requestIdleCallback) {
        requestIdleCallback(() => {
          renderTask();
          // 继续处理队列中的下一个任务
          setTimeout(() => {
            this.processRenderQueue();
          }, 0);
        }, { timeout: 50 });
      } else {
        requestAnimationFrame(() => {
          renderTask();
          // 继续处理队列中的下一个任务
          setTimeout(() => {
            this.processRenderQueue();
          }, 0);
        });
      }
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
      
      // 更新视口
      this.updateViewport();
      
      // 如果启用了虚拟化，不需要重新绘制所有连接线
      if (!this.virtualizationEnabled) {
        // 使用优化的连接线重绘
        this.redrawConnectionsSoft();
      }
    },
    // 处理窗口调整大小 - 优化版本
    handleResize: debounce(function() {
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
      
      // 使用智能节流处理拖动事件
      const throttledDragHandler = this.createThrottledHandler((params) => {
        this.alignForLine(nodeID, params.pos);
        // 更新节点位置缓存
        const node = this.nodePositions.get(nodeID);
        if (node) {
          node.top = params.pos[1];
          node.left = params.pos[0];
        }
        
        // 优化拖动时的渲染性能
        const element = this.getCachedElement(nodeID);
        if (element && this.renderOptimizations.enableLayerOptimization) {
          this.optimizeLayer(element, 'transform');
          
          // 应用 CSS 优化
          this.applyWillChange(element, 'transform');
          this.applyTransformOptimization(element, 'translate3d(0, 0, 0)');
        }
      }, 16, `drag-${nodeID}`);
      
      this.jsplumbInstance.draggable(nodeID, {
        grid: this.commGrid,
        drag: throttledDragHandler,
        stop: (params) => {
          this.auxiliaryLine.isShowXLine = false;
          this.auxiliaryLine.isShowYLine = false;
          this.changeNodePosition(nodeID, params.pos);
          
          // 清理拖动时的图层优化
          const element = this.getCachedElement(nodeID);
          if (element) {
            this.cleanupLayerOptimization(element);
            this.cleanupCSSOptimizations(element);
          }
          
          // 使用优化的连接线重绘
          this.optimizedJsPlumbRepaint();
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
      this.highlightFieldLineage(field.tableName, field.fieldName);
      this.showDropdown = false;

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

      // 4. 添加动画效果
      const tableFlow = this.getCachedQuerySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }

      // 5. 移动到目标位置
      pan.moveTo(targetX, targetY);

      // 6. 添加字段高亮动画
      this.addOptimizedAnimationClass(fieldElement, 'field-focus-animation', 1500);
      
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
      this.copyToClipboard(tableInfo.tableName, `表名 "${tableInfo.tableName}" 已复制到剪贴板`);
    },
    // 高亮字段的上下游链路
    highlightFieldLineage(tableName, fieldName) {
      // 清除之前的高亮
      this.highlightedFields = [];
      
      // 重置字段索引
      this.resetFieldIndex();
      
      // 找到所有相关的字段
      const relatedFields = this.findRelatedFields(tableName, fieldName);
      this.highlightedFields = relatedFields;
      
      // 如果开启了仅显示关键路径，更新关键路径
      if (this.showOnlyCriticalPath) {
        this.updateCriticalPath();
      }
      
      // 高亮相关的连接线
      this.$nextTick(() => {
      this.highlightConnections(relatedFields);
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
      if (!this.jsplumbInstance || this.lineageLevel === 'table') return;
      
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
        
        if (isSourceRelated || isTargetRelated) {
          conn.setPaintStyle(this.commConfig.HoverPaintStyle);
          if (this.showOnlyCriticalPath) {
            conn.setVisible(true);
            this.jsplumbInstance.show(conn.sourceId, true);
            this.jsplumbInstance.show(conn.targetId, true);
          }
        }
      });
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

      this.isAnalyzing = true;
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
        } else {
          this.showToastMessage(data.error || '分析失败');
        }
      } catch (error) {
        console.error('Error analyzing SQL:', error);
        this.showToastMessage('分析过程中发生错误');
      } finally {
        this.isAnalyzing = false;
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

      // 更新jsPlumb实例中节点的可拖动状态
      this.$nextTick(() => {
        this.json.nodes.forEach(node => {
          if (this.criticalPathNodes.has(node.name)) {
            this.jsplumbInstance.setDraggable(node.name, true);
          } else {
            this.jsplumbInstance.setDraggable(node.name, false);
          }
          // 应用节点可见性，这会自动处理相关连接线的可见性
          this.getNodeVisibility(node);
        });

        // 根据模式选择合适的高亮方式
        if (this.lineageLevel === 'table') {
          this.highlightTableConnections(Array.from(this.criticalPathNodes));
        } else {
          this.highlightConnections(this.highlightedFields);
        }
      });
    },
    // 处理关键路径显示切换
    handleCriticalPathToggle() {
      if (this.showOnlyCriticalPath) {
        if (this.lineageLevel === 'table' && this.highlightedTables.length > 0) {
          this.updateCriticalPath();
        } else if (this.lineageLevel === 'column' && this.highlightedFields.length > 0) {
          this.updateCriticalPath();
        }
      } else {
        this.criticalPathNodes.clear();
        // 恢复所有节点的可拖动状态和连接线的显示
        this.json.nodes.forEach(node => {
          this.jsplumbInstance.setDraggable(node.name, true);
        });
        // 恢复所有连接线的显示
        const allConnections = this.jsplumbInstance.getAllConnections();
        allConnections.forEach(conn => {
          conn.setVisible(true);
          conn.setPaintStyle(this.commConfig.PaintStyle);
        });
      }

      // 重新应用节点可见性
      this.$nextTick(() => {
        this.json.nodes.forEach(node => {
          this.getNodeVisibility(node);
        });
        
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

    // 处理节点隐藏/显示
    handleNodeVisibility(data) {
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

    // 改进的聚焦到节点方法 - 优化版本
    async focusOnNode(node) {
      if (!this.jsplumbInstance || !node) return;

      // 更新聚焦状态
      this.focusedNode = node.name;
      
      // 新增：表级模式下高亮表及其上下游链路
      if (this.lineageLevel === 'table') {
        this.handleTableHighlight({ tableName: node.name });
      }
      // 获取panzoom实例
      const pan = this.jsplumbInstance.pan;
      if (!pan) return;

      // 1. 设置固定缩放比例
      const targetZoom = 0.8;
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
      const nodeElement = this.getCachedElement(node.name);
      
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
        
        // 3秒后清除聚焦状态
        setTimeout(() => {
          this.focusedNode = null;
        }, 3000);
      }, 500);
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
    
    // 启用硬件加速
    enableHardwareAcceleration(element) {
      if (!element || !this.renderOptimizations.useTransform3d) return;
      
      // 使用 transform3d 启用硬件加速
      element.style.transform = 'translate3d(0, 0, 0)';
      element.style.willChange = 'transform';
      
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
      
      // 使用 requestAnimationFrame 确保在下一帧执行
      requestAnimationFrame(() => {
        // 挂起绘制操作
        this.jsplumbInstance.setSuspendDrawing(true);
        
        // 执行重绘
        this.jsplumbInstance.repaintEverything();
        
        // 恢复绘制操作
        this.jsplumbInstance.setSuspendDrawing(false, true);
      });
    },
    
    // 优化的连接线更新
    optimizedConnectionUpdate(connections, updateFn) {
      if (!connections || connections.length === 0) return;
      
      // 分批处理连接线更新
      const batchSize = 20;
      
      for (let i = 0; i < connections.length; i += batchSize) {
        const batch = connections.slice(i, i + batchSize);
        
        requestAnimationFrame(() => {
          batch.forEach(conn => {
            try {
              updateFn(conn);
            } catch (error) {
              console.warn('Connection update failed:', error);
            }
          });
        });
      }
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
  }
};
</script>

<style lang="less" scoped>
  .app-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;

  .sql-container {
    position: fixed;
    left: 50%;
    bottom: 32px;
    transform: translateX(-50%);
    z-index: 10001;
    width: 420px;
    min-width: 320px;
    max-width: 95vw;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.13);
    padding: 0 0 12px 0;
    transition: box-shadow 0.3s;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border: 1.5px solid #e6e6e6;
    
    // 最小化按钮现代风格
    .minimize-btn.modern {
      position: absolute;
      top: -38px;
      right: 8px;
      width: 38px;
      height: 38px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #e6f0ff 0%, #f5faff 100%);
      box-shadow: 0 2px 12px rgba(24,144,255,0.10), 0 1.5px 6px rgba(0,0,0,0.07);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10002;
      transition: background 0.22s, box-shadow 0.22s, transform 0.12s;
      outline: none;
      border: 1.5px solid #e6e6e6;
      svg {
        display: block;
        margin: 0 auto;
        transition: stroke 0.2s;
      }
      &:hover {
        background: linear-gradient(135deg, #d0e7ff 0%, #e6f7ff 100%);
        box-shadow: 0 4px 18px rgba(24,144,255,0.16), 0 2px 8px rgba(0,0,0,0.10);
        svg path {
          stroke: #096dd9;
        }
      }
      &:active {
        transform: scale(0.93);
        background: linear-gradient(135deg, #b3d8ff 0%, #e6f7ff 100%);
      }
    }
    
    // SQL面板样式
    .sql-panel {
      width: 100%;
      background: transparent;
      border-radius: 0 0 18px 18px;
      box-shadow: none;
      padding: 0;
      transition: all 0.3s;
      
      // 最小化状态样式
      &--minimized {
        padding: 0;
        height: 0;
        opacity: 0;
        pointer-events: none;
        background: transparent;
        box-shadow: none;
      }
      
      .sql-editor {
        display: flex;
        flex-direction: column;
        gap: 0;
        background: #f8fafd;
        border-radius: 0 0 18px 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        padding: 12px 14px 8px 14px;
        // 紧凑模式
        &.compact {
          padding: 8px 10px 4px 10px;
        }
        .sql-textarea-wrapper {
          position: relative;
          width: 100%;
          &.compact {
            margin-bottom: 6px;
          }
          .sql-textarea {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            height: 48px;
            padding: 8px 32px 8px 8px;
            border: 1.2px solid #e6e6e6;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.5;
            resize: vertical;
            min-height: 36px;
            max-height: 180px;
            background: #fff;
            transition: border-color 0.2s, box-shadow 0.2s;
            &.compact {
              height: 36px;
              min-height: 32px;
              font-size: 13px;
              padding: 6px 28px 6px 8px;
            }
          }
          .clear-sql-btn {
            position: absolute;
            right: 6px;
            top: 6px;
            width: 20px;
            height: 20px;
            border: none;
            background: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #999;
            transition: all 0.2s;
            font-size: 13px;
            &:hover {
              background-color: #f0f0f0;
              color: #666;
            }
            &:active {
              background-color: #e6e6e6;
              transform: scale(0.95);
            }
            .clear-icon {
              font-size: 13px;
              line-height: 1;
            }
          }
        }
        .sql-actions {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          margin-top: 2px;
          gap: 8px;
          &.compact {
            margin-top: 0;
            gap: 4px;
          }
          .sql-options {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            background: #f3f6fa;
            border-radius: 6px;
            padding: 4px 8px;
            &.compact {
              padding: 2px 4px;
              gap: 4px;
            }
            .lineage-level-selector {
              display: flex;
              align-items: center;
              gap: 4px;
              margin-right: 4px;
              &.compact {
                margin-right: 2px;
                gap: 2px;
              }
              .option-label {
                font-size: 12px;
                color: #333;
                margin-right: 2px;
              }
              .radio-label {
                display: flex;
                align-items: center;
                gap: 2px;
                cursor: pointer;
                user-select: none;
                input[type="radio"] {
                  margin: 0;
                  width: 13px;
                  height: 13px;
                  cursor: pointer;
                }
                .radio-text {
                  font-size: 12px;
                  color: #333;
                }
                &:hover .radio-text {
                  color: #1890ff;
                }
              }
            }
            .option-label {
              display: flex;
              align-items: center;
              gap: 2px;
              cursor: pointer;
              user-select: none;
              font-size: 12px;
              input[type="checkbox"] {
                margin: 0;
                width: 13px;
                height: 13px;
                cursor: pointer;
              }
              .option-text {
                font-size: 12px;
                color: #333;
              }
              &:hover .option-text {
                color: #1890ff;
              }
              &.compact {
                gap: 1px;
              }
            }
          }
          .analyze-btn {
            padding: 7px 18px;
            font-size: 14px;
            border-radius: 6px;
            &.compact {
              padding: 5px 12px;
              font-size: 13px;
              border-radius: 5px;
            }
          }
        }
      }
    }
  }

  // 复制成功提示样式
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.75);
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 100001; // 确保在最顶层
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
    pointer-events: none; // 防止toast阻挡鼠标事件
    
    &--show {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // 搜索框样式
  .search-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    width: 300px;
    
    .search-box {
      position: relative;
      
      .search-input {
        width: 100%;
        height: 36px;
        padding: 0 32px 0 12px;
        border: 1px solid #ddd;
        border-radius: 18px;
        font-size: 14px;
        outline: none;
        transition: all 0.3s;
        
        &:focus {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24,144,255,0.2);
        }
      }
      
      .clear-search-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        padding: 4px;
        font-size: 12px;
        
        &:hover {
          color: #666;
        }
      }
      
      .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        max-height: 300px;
        overflow-y: auto;
        
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #eee;
          font-size: 13px;
          color: #666;
        }
        
        .dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          &:hover {
            background: #f5f5f5;
          }
          
          .table-name {
            color: #666;
            font-size: 12px;
          }
          
          .field-name {
            color: #333;
            font-weight: 500;
            font-size: 13px;
          }
        }
      }
    }
  }

  .flow-wrapper {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: auto;
    
    .table-flow {
      position: relative;
      min-width: 100%;
      min-height: 100%;
    }
  }

  .advanced-search {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    width: 400px;
    
    .search-panel {
      .search-header {
        .search-box {
          position: relative;
          width: 100%;
          
          .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #999;
            font-size: 14px;
            pointer-events: none;
          }
          
          .search-input {
            width: 100%;
            height: 40px;
            padding: 0 40px;
            border: 2px solid #e1e4e8;
            border-radius: 20px;
            font-size: 14px;
            color: #24292e;
            background: white;
            outline: none;
            transition: all 0.3s ease;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            
            &::placeholder {
              color: #999;
            }
            
            &:hover {
              border-color: #ccd1d5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }
            
            &:focus {
              border-color: #1890ff;
              box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.15);
            }
          }
          
          .clear-search-btn {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 4px;
            font-size: 14px;
            width: 24px;
            height: 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            
            &:hover {
              background-color: #f0f0f0;
              color: #666;
            }
            
            &:active {
              background-color: #e6e6e6;
            }
          }
        }
      }
    }
    
    .search-dropdown {
      margin-top: 8px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 400px;
      overflow: hidden;
      border: 1px solid #e1e4e8;
      
      .dropdown-header {
        padding: 12px 16px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e1e4e8;
        font-size: 13px;
        color: #666;
        font-weight: 500;
      }
      
      .dropdown-list {
        max-height: 350px;
        overflow-y: auto;
        
        &::-webkit-scrollbar {
          width: 8px;
        }
        
        &::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        &::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
          
          &:hover {
            background: #999;
          }
        }
      }
      
      .dropdown-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: all 0.2s ease;
        
        &:last-child {
          border-bottom: none;
        }
        
        &:hover {
          background-color: #f6f8fa;
        }
        
        .item-header {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
          
          .table-type-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
          }
          
          .table-name {
            color: #666;
            font-size: 12px;
          }
        }
        
        .field-name {
          color: #24292e;
          font-size: 14px;
          font-weight: 500;
        }
      }
    }
  }

  // 表类型图例样式
  .table-type-legend {
    position: fixed;
    right: 20px;
    bottom: 60px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 12px;
    z-index: 1000;

    .legend-title {
      font-size: 11px;
      color: #495057;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .color-indicator {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .type-name {
          font-size: 12px;
          color: #495057;
        }
      }
    }
  }

  // 镜头控制按钮样式
  .camera-controls {
    position: fixed;
    top: 50%;
    left: 65%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10001;
    background: white;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .camera-info {
      .field-counter {
        font-size: 14px;
        color: #666;
        margin-right: 8px;
        transition: all 0.3s ease;
        display: inline-block;
        
        &.counter-update {
          animation: counterPulse 0.5s ease;
        }
      }
    }

    .camera-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: #f8f9fa;
      cursor: pointer;
      transition: all 0.2s ease;
      transform: scale(1);

      &:hover {
        background: #e9ecef;
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.95);
      }

      .camera-icon {
        font-size: 18px;
        transition: transform 0.2s ease;
      }

      &:hover .camera-icon {
        transform: rotate(5deg);
      }
    }
  }

  // 批量操作按钮样式
  .batch-actions {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .batch-action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      width: 100%;
      justify-content: center;
      
      &:hover {
        background-color: #f8f9fa;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        
        &:hover {
          transform: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }
      
      .show-icon {
        font-size: 16px;
      }
    }
    
    .critical-path-toggle {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      width: 100%;
      justify-content: center;
      
      &:hover {
        background-color: #f8f9fa;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      input[type="checkbox"] {
        margin-right: 8px;
      }
      
      .toggle-label {
        color: #333;
        font-size: 14px;
      }
    }
  }

  // 节点列表面板样式
  .node-list-panel {
    position: fixed;
    left: 24px;
    top: 24px;
    bottom: 24px;
    height: auto;
    min-width: 220px;
    max-width: 520px;
    background: linear-gradient(135deg, #fafdff 0%, #f3f8ff 100%);
    border-radius: 14px;
    box-shadow: 0 4px 18px rgba(24,144,255,0.10), 0 2px 8px rgba(0,0,0,0.07);
    border: 1.5px solid #e6eaf0;
    z-index: 10001;
    display: flex;
    flex-direction: column;
    font-size: 13px;
    transition: box-shadow 0.2s, border 0.2s;
    .panel-header {
      padding: 18px 18px 10px 18px;
      border-bottom: 1.5px solid #e6eaf0;
      width: 100%;
      box-sizing: border-box;
      h3 {
        margin: 0 0 10px 0;
        font-size: 15px;
        color: #1890ff;
        font-weight: 600;
        letter-spacing: 1px;
      }
      .panel-search {
        position: relative;
        width: 100%;
        .node-search-input {
          width: 100%;
          height: 30px;
          padding: 0 32px 0 12px;
          border: 1.5px solid #e6eaf0;
          border-radius: 7px;
          font-size: 13px;
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          background: #fafdff;
          &:focus {
            border-color: #1890ff;
            box-shadow: 0 0 0 2px rgba(24,144,255,0.13);
          }
        }
        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: #b0b0b0;
          font-size: 13px;
          padding: 4px;
          border-radius: 50%;
          background: none;
          transition: background 0.2s, color 0.2s;
          &:hover {
            color: #1890ff;
            background: #e6f0ff;
          }
        }
      }
    }
    .node-list {
      flex: 1 1 0;
      min-height: 0;
      max-height: 100%;
      overflow-y: auto;
      overflow-x: auto;
      padding: 10px 8px 8px 8px;
      box-sizing: border-box;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      border-bottom: 1.5px solid #e6eaf0;
      scrollbar-width: thin;
      scrollbar-color: #e6eaf0 #fafdff;
      &::-webkit-scrollbar {
        width: 7px;
      }
      &::-webkit-scrollbar-thumb {
        background: #e6eaf0;
        border-radius: 6px;
      }
      &::-webkit-scrollbar-track {
        background: #fafdff;
      }
      .node-list-item {
        display: flex;
        min-width: 0;
        width: auto;
        white-space: nowrap;
        align-items: center;
        padding: 6px 10px;
        margin-bottom: 3px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
        font-size: 13px;
        font-weight: 500;
        &:hover {
          background: #e6f0ff;
          color: #1890ff;
        }
        &.node-hidden {
          opacity: 0.5;
        }
        &.node-focused {
          background: #e6f7ff;
          border: 1.5px solid #91d5ff;
          color: #1890ff;
        }
        &.search-highlight {
          background: #fff7e6;
          color: #d48806;
          &:hover {
            background: #fff1d6;
          }
        }
        .node-type-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 10px;
          flex-shrink: 0;
        }
        .node-name {
          flex: none;
          font-size: 13px;
          color: #333;
          white-space: nowrap;
          overflow: visible;
          text-overflow: unset;
          .highlight {
            background-color: #ffd591;
            padding: 0 2px;
            border-radius: 2px;
          }
        }
        .node-fields-count {
          padding: 2px 7px;
          background: #f0f4fa;
          border-radius: 10px;
          font-size: 12px;
          color: #666;
          margin-left: 10px;
          flex-shrink: 0;
        }
      }
      .node-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px 4px 10px;
        font-size: 12px;
        color: #8c8c8c;
        font-weight: 500;
        letter-spacing: 1px;
        border-bottom: 1px dashed #e6eaf0;
        margin-bottom: 2px;
        .header-name {
          flex: 1 1 0;
          text-align: left;
        }
        .header-count {
          min-width: 56px;
          text-align: right;
        }
      }
    }
    .resize-handle {
      position: absolute;
      top: 0;
      right: -7px;
      width: 14px;
      height: 100%;
      cursor: ew-resize;
      border-radius: 8px;
      background: none;
      transition: background 0.2s;
      &:hover {
        background: rgba(24, 144, 255, 0.10);
      }
      &:active {
        background: rgba(24, 144, 255, 0.18);
      }
    }
  }

  // 作者署名样式
  .author-signature {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    color: #666;
    z-index: 1000;
    
    span {
      font-weight: 500;
    }
    
    &:hover {
      background-color: rgba(255, 255, 255, 1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .list-toggle {
    display: flex;
    gap: 8px;
    margin-top: 8px;

    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;

      &.active {
        background-color: #1890ff;
        color: white;
      }

      &:hover {
        background-color: #40a9ff;
      }
    }
  }
  
  // 表类型筛选样式
  .type-filter-section {
    margin-top: 12px;
    border-top: 1px solid #e6eaf0;
    padding-top: 12px;
    
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .filter-title {
        font-size: 13px;
        color: #1890ff;
        font-weight: 500;
      }
      
      .toggle-filter-btn {
        background: none;
        border: none;
        color: #1890ff;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
        
        &:hover {
          background: #e6f0ff;
        }
      }
    }
    
    .filter-content {
      .type-checkboxes {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 8px;
        
        .type-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
          
          &:hover {
            background: #f0f8ff;
          }
          
          input[type="checkbox"] {
            margin: 0;
            width: 14px;
            height: 14px;
            cursor: pointer;
          }
          
          .type-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1px solid #e6eaf0;
          }
          
          .type-name {
            font-size: 12px;
            color: #333;
          }
        }
      }
      
      .filter-actions {
        display: flex;
        gap: 6px;
        
        .filter-action-btn {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #e6eaf0;
          border-radius: 4px;
          background: #fff;
          color: #666;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover {
            background: #f0f8ff;
            border-color: #1890ff;
            color: #1890ff;
          }
        }
      }
    }
  }
  
  // 分组显示开关样式
  .group-toggle {
    margin-top: 8px;
    padding: 8px 0;
    border-top: 1px solid #e6eaf0;
    
    .group-toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      
      input[type="checkbox"] {
        margin: 0;
        width: 14px;
        height: 14px;
        cursor: pointer;
      }
      
      .toggle-text {
        font-size: 12px;
        color: #666;
      }
    }
  }
  
  // 分组显示样式
  .group-section {
    margin-bottom: 16px;
    
    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #f8fafd;
      border-radius: 6px;
      margin-bottom: 6px;
      border-left: 3px solid #e6eaf0;
      
      .group-type-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 1px solid #e6eaf0;
      }
      
      .group-title {
        font-size: 12px;
        color: #1890ff;
        font-weight: 500;
      }
      
      .group-toggle-btn {
        margin-left: auto;
        background: none;
        border: none;
        color: #1890ff;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        &:hover {
          background: #e6f0ff;
        }
      }
    }
  }
}

// 添加节点淡入淡出过渡效果
.table-node {
  transition: opacity 0.3s ease;
}

// jsPlumb 连接线样式
.jtk-connector {
  z-index: 4;
  transition: all 0.3s ease;
  
  &.jtk-connection-hover {
    z-index: 5;

  path {
      transition: all 0.3s ease;
      stroke: #5c7cfa !important;
      stroke-width: 3px !important;
    }
  }
  
  &.jtk-connection-highlighted {
    z-index: 6;
  
  path {
      transition: all 0.3s ease;
      stroke: #ff5722 !important;
      stroke-width: 3px !important;
      stroke-dasharray: none !important;
      animation: connection-pulse 2s infinite;
    }
  }
}

@keyframes connection-pulse {
  0% {
    stroke-width: 3px;
    stroke-opacity: 1;
  }
  50% {
    stroke-width: 4px;
    stroke-opacity: 0.8;
  }
  100% {
    stroke-width: 3px;
    stroke-opacity: 1;
  }
}

@keyframes fieldFocus {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 128, 20, 0.4);
    background-color: #fff3e0;
  }
  25% {
    transform: scale(1.08);
    box-shadow: 0 0 0 8px rgba(239, 128, 20, 0.3);
    background-color: #ffe0b2;
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 12px rgba(239, 128, 20, 0.2);
    background-color: #ffcc80;
  }
  75% {
    transform: scale(1.02);
    box-shadow: 0 0 0 6px rgba(239, 128, 20, 0.1);
    background-color: #ffe0b2;
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 128, 20, 0);
    background-color: #fff3e0;
  }
}

@keyframes counterPulse {
  0% {
    transform: scale(1);
    color: #666;
  }
  50% {
    transform: scale(1.2);
    color: #ff5722;
  }
  100% {
    transform: scale(1);
    color: #666;
  }
}

.table-flow.camera-animate {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

// 节点聚焦动画
@keyframes nodeFocus {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
}

.node-focus-animation {
  animation: nodeFocus 1s ease;
}

// 添加用户选择限制，防止拖动时选中文本
.user-select-none {
  user-select: none;
}

/* 添加加载遮罩样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 18px;
  color: #333;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.lineage-level-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
  
  .option-label {
    font-size: 14px;
    color: #333;
    margin-right: 8px;
  }
  
  .radio-label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    user-select: none;
    
    input[type="radio"] {
      margin: 0;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    
    .radio-text {
      font-size: 14px;
      color: #333;
    }
    
    &:hover .radio-text {
      color: #1890ff;
    }
  }
}

/* 虚拟化状态提示样式 */
.virtualization-status {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border: 1.5px solid #91d5ff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
  font-size: 13px;
  color: #1890ff;
  font-weight: 500;
  z-index: 1000;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #d0e7ff 0%, #e6f7ff 100%);
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
  }
}

/* 作者署名样式 */
.author-signature {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: #666;
  z-index: 1000;
  
  span {
    font-weight: 500;
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.list-toggle {
  display: flex;
  gap: 8px;
  margin-top: 8px;

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;

    &.active {
      background-color: #1890ff;
      color: white;
    }

    &:hover {
      background-color: #40a9ff;
    }
  }
}

.table-type-legend {
  position: fixed;
  right: 28px;
  bottom: 36px;
  background: linear-gradient(135deg, #fafdff 0%, #f3f8ff 100%);
  border-radius: 12px;
  box-shadow: 0 4px 18px rgba(24,144,255,0.10), 0 2px 8px rgba(0,0,0,0.07);
  border: 1.5px solid #e6eaf0;
  padding: 16px 18px 14px 18px;
  z-index: 1000;
  min-width: 120px;
  .legend-title {
    font-size: 13px;
    color: #1890ff;
    margin-bottom: 10px;
    font-weight: 600;
    letter-spacing: 1px;
  }
  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      .color-indicator {
        width: 18px;
        height: 18px;
        border-radius: 7px;
        border: 1.5px solid #e6eaf0;
      }
      .type-name {
        font-size: 13px;
        color: #495057;
        font-weight: 500;
      }
    }
  }
}

.blurred {
  filter: blur(3px);
  pointer-events: none;
  user-select: none;
}

</style>