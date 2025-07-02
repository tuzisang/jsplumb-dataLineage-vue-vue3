<template>
  <div class="app-container">
  <!-- SQL 输入面板 -->
  <div class="sql-container">
    <!-- 最小化按钮单独放置 -->
    <button 
      class="minimize-btn"
      @click="toggleMinimize"
      :title="isMinimized ? '展开' : '最小化'"
    >
      {{ isMinimized ? '↑' : '↓' }}
    </button>
    
    <!-- SQL面板 -->
    <div class="sql-panel" :class="{ 'sql-panel--minimized': isMinimized }">
      <div class="sql-editor" v-show="!isMinimized">
        <textarea 
          v-model="sqlQuery" 
          placeholder="请输入 SQL 查询语句..."
          class="sql-textarea"
        ></textarea>
        <div class="sql-actions">
          <div class="sql-options">
            <label class="option-label">
              <input 
                type="checkbox" 
                v-model="includeIntermediateTables"
              >
              <span class="option-text">显示中间表</span>
            </label>
            <label class="option-label">
              <input 
                type="checkbox" 
                v-model="filterCtes"
              >
              <span class="option-text">仅显示物理表</span>
            </label>
          </div>
          <button 
            class="analyze-btn"
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

    <!-- 高级搜索面板 -->
    <div class="advanced-search">
      <div class="search-panel">
        <div class="search-header">
          <!-- 搜索框 -->
          <div class="search-box">
            <i class="search-icon">🔍</i>
            <input 
              v-model="searchQuery" 
              @input="handleSearch"
              @focus="showDropdown = true"
              @keydown.esc="clearSearch"
              placeholder="搜索字段..."
              class="search-input"
            />
            <button 
              v-if="searchQuery" 
              @click="clearSearch" 
              class="clear-search-btn"
              title="清除搜索"
            >✕</button>
          </div>
        </div>
      </div>

      <!-- 搜索结果下拉框 -->
      <div 
        v-if="showDropdown && filteredFields.length > 0" 
        class="search-dropdown"
      >
        <div class="dropdown-header">
          <span>搜索结果 ({{ filteredFields.length }})</span>
        </div>
        <div class="dropdown-list">
          <div 
            v-for="field in filteredFields" 
            :key="`${field.tableName}-${field.fieldName}`"
            @click="selectField(field)"
            class="dropdown-item"
          >
            <div class="item-header">
              <span 
                class="table-type-indicator"
                :style="{ backgroundColor: getTableColor(getTableType(field.tableName)) }"
              ></span>
              <span class="table-name">{{ field.tableName }}</span>
            </div>
            <span class="field-name">{{ field.fieldName }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flow-wrapper" ref="flowWrap">
      <!-- 添加加载遮罩 -->
      <div v-if="isAnalyzing" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在分析血缘关系...</div>
      </div>
      <div id="table-flow" class="table-flow">
        <TableNode
            v-for="node in json.nodes"
            :key="node.name"
            :id="node.name"
            :node="node"
            :highlighted-fields="highlightedFields"
            :style="getNodeVisibility(node)"
            :is-disabled="isNodeDisabled(node)"
            :is-hidden="hiddenNodes.has(node.name)"
            :edges="json.edges"
            @field-click="handleFieldClick"
            @table-name-click="handleTableNameClick"
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
          <span class="type-name">{{ type.type }}</span>
        </div>
      </div>
    </div>

    <!-- 节点列表面板 -->
    <div 
      class="node-list-panel"
      :style="{ width: panelWidth + 'px' }">
      <div class="panel-header">
        <h3>节点列表</h3>
        <div class="panel-search">
          <input 
            type="text" 
            v-model="nodeSearchQuery" 
            placeholder="搜索表名..."
            class="node-search-input"
            @input="handleNodeSearch"
          >
          <span 
            v-if="nodeSearchQuery" 
            class="clear-search"
            @click="clearNodeSearch"
          >✕</span>
        </div>
      </div>
      <div class="node-list">
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
          <span class="node-fields-count" v-if="node.fields">
            {{ node.fields.length }}
          </span>
        </div>
      </div>
      <!-- 添加拖动调整宽度的把手 -->
      <div 
        class="resize-handle"
        @mousedown="startResize"
      ></div>
    </div>
  </div>
</template>

<script lang="js">
import jsplumbModule from 'jsplumb'
import commConfig from './config/jsplumbConfig'
import comm from './methods/comm'
import { debounce, throttle } from 'lodash-es'

import TableNode from './components/TableNode.vue'
import sampleData from './config/sampleData.json'
import colorFields from './config/tableTypeMappingColor'

const VIEWPORT_PADDING = 500; // 可视区域外的缓冲区大小
const BATCH_SIZE = 10; // 批量处理的节点数量

const jsplumb = jsplumbModule.jsPlumb
export default {
  name: 'Index',
  components: {
    TableNode
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
      selectedTableTypes: [],
      searchMode: 'contains',
      searchInTableNames: true,
      searchInFieldNames: true,
      showOnlyCriticalPath: false,
      criticalPathNodes: new Set(),
      viewportTop: 0,
      viewportBottom: 0,
      nodePositions: new Map(),
      isInitializing: false,
      currentFieldIndex: 0,
      hiddenNodes: new Set(),
      hiddenNodesConnections: null,
      nodeSearchQuery: '',
      focusedNode: null,
      panelWidth: 300,
      isResizing: false,
      lastMouseX: 0,
      minPanelWidth: 200,
      maxPanelWidth: 600,
      includeIntermediateTables: false,
      filterCtes: false,
      isMinimized: false
    };
  },
  mounted() {
    this.renderDefaultLineage()
    document.addEventListener('click', this.handleClickOutside)
    this.$refs.flowWrap.addEventListener('scroll', this.handleScroll)
    window.addEventListener('resize', this.handleResize)
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
  },
  beforeDestroy() {
    this.jsplumbInstance.reset()
    document.removeEventListener('click', this.handleClickOutside)
    this.$refs.flowWrap.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('resize', this.handleResize)
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
    }
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
  },
  created() {
    this.selectedTableTypes = this.tableTypes.map(type => type.type)
  },
  computed: {
    hasOriginTables() {
      return this.json.nodes.some(node => node.type === 'Origin')
    },
    filteredNodeList() {
      if (!this.nodeSearchQuery) {
        return this.json.nodes
      }
      const query = this.nodeSearchQuery.toLowerCase()
      return this.json.nodes.filter(node => {
        const nodeName = node.name.toLowerCase()
        return nodeName.includes(query)
      }).sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(query)
        const bStartsWith = b.name.toLowerCase().startsWith(query)
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        return a.name.localeCompare(b.name)
      })
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
    // 初始化所有节点和连接
    initializeNodesAndConnections() {
      if (!this.json.nodes.length) return;
      
      this.jsplumbInstance.setSuspendDrawing(true);
      
      // 初始化节点
      this.json.nodes.forEach(node => {
        this.draggableNode(node.name);
        // 为节点添加端点，即使没有字段
        this.addEndpoint(node.name.concat(this.minus), this.anchorArr);
        
        // 如果有字段，为每个字段添加端点
        if (node.fields && node.fields.length > 0) {
          node.fields.forEach(field => {
            this.addEndpoint(node.name.concat(this.minus, field.name), this.anchorArr);
          });
        }
      });
      
      // 创建连接
      this.json.edges.forEach(edge => {
        const from = edge.from.name.concat(this.minus, edge.from.field, this.minus, "Right");
        const to = edge.to.name.concat(this.minus, edge.to.field, this.minus, "Left");
        this.connectEndpoint(from, to);
      });
      
      this.jsplumbInstance.setSuspendDrawing(false, true);
    },
    // 更新视口范围（使用节流）
    updateViewport: throttle(function() {
      const container = this.$refs.flowWrap;
      const scale = this.jsplumbInstance ? this.jsplumbInstance.getZoom() : 1;
      
      this.viewportTop = container.scrollTop / scale;
      this.viewportBottom = (container.scrollTop + container.clientHeight) / scale;
    }, 16),
    // 获取节点位置样式
    getNodePosition(node) {
      return {
        position: 'absolute',
        top: node.top + 'px',
        left: node.left + 'px'
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
    // 处理滚动事件
    handleScroll() {
      if (this.isInitializing) return;
      this.updateViewport();
      
      // 重新绘制连接线
      requestAnimationFrame(() => {
        this.redrawConnectionsSoft();
      });
    },
    // 处理窗口调整大小
    handleResize: debounce(function() {
      if (!this.jsplumbInstance || this.isInitializing) return;
      
      requestAnimationFrame(() => {
        this.jsplumbInstance.repaintEverything();
      });
    }, 100),
    // 重写拖动方法
    draggableNode(nodeID) {
      if (!this.jsplumbInstance) return;
      
      this.jsplumbInstance.draggable(nodeID, {
        grid: this.commGrid,
        drag: throttle((params) => {
          this.alignForLine(nodeID, params.pos);
          // 更新节点位置缓存
          const node = this.nodePositions.get(nodeID);
          if (node) {
            node.top = params.pos[1];
            node.left = params.pos[0];
          }
        }, 16),
        stop: (params) => {
          this.auxiliaryLine.isShowXLine = false;
          this.auxiliaryLine.isShowYLine = false;
          this.changeNodePosition(nodeID, params.pos);
          requestAnimationFrame(() => {
            this.redrawConnections();
          });
        }
      });
    },
    // 优化连接线重绘
    redrawConnectionsSoft() {
      if (!this.jsplumbInstance) return;
      
      requestAnimationFrame(() => {
        this.jsplumbInstance.setSuspendDrawing(true);
        this.jsplumbInstance.repaintEverything();
        this.jsplumbInstance.setSuspendDrawing(false, true);
      });
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
    // 选择字段
    selectField(field) {
      this.highlightFieldLineage(field.tableName, field.fieldName);
      this.showDropdown = false;
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
      if (!this.jsplumbInstance) return;
      
      const allConnections = this.jsplumbInstance.getAllConnections();
      
      // 重置所有连接线样式为默认样式
      allConnections.forEach(conn => {
        conn.setPaintStyle(this.commConfig.PaintStyle);
      });
      
      // 高亮相关连接线
      allConnections.forEach(conn => {
        const sourceId = conn.sourceId.split(this.minus)[0];
        const targetId = conn.targetId.split(this.minus)[0];
        const sourceField = conn.sourceId.split(this.minus)[1];
        const targetField = conn.targetId.split(this.minus)[1];
        
        // 检查源端点或目标端点是否在相关字段中
        const isSourceRelated = relatedFields.some(f => 
          f.tableName === sourceId && f.fieldName === sourceField
        );
        const isTargetRelated = relatedFields.some(f => 
          f.tableName === targetId && f.fieldName === targetField
        );
        
        // 只要连接线的任一端点在相关字段中就高亮显示
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
    // 绑定连接线事件
    bindConnectionEvents() {
      if (!this.jsplumbInstance) return;
      
      // 鼠标进入连接线
      this.jsplumbInstance.bind('mouseenter', (conn) => {
        if (!conn.hasClass('jtk-connection-highlighted')) {
          conn.addClass('jtk-connection-hover');
        }
      });
      
      // 鼠标离开连接线
      this.jsplumbInstance.bind('mouseexit', (conn) => {
        conn.removeClass('jtk-connection-hover');
      });
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
        // 使用完整的 API URL
        const apiUrl = import.meta.env.VITE_API_URL || '/api/lineage';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql_query: this.sqlQuery,
            include_intermediate_tables: this.includeIntermediateTables,
            filter_ctes: this.filterCtes
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
      
      // 如果没有高亮字段，不需要继续处理
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

      // 更新jsPlumb实例中节点的可拖动状态
      this.$nextTick(() => {
        this.json.nodes.forEach(node => {
          if (this.criticalPathNodes.has(node.name)) {
            this.jsplumbInstance.setDraggable(node.name, true);
          } else {
            this.jsplumbInstance.setDraggable(node.name, false);
            // 应用节点可见性，这会自动处理相关连接线的可见性
            this.getNodeVisibility(node);
          }
        });
      });
    },
    // 处理关键路径显示切换
    handleCriticalPathToggle() {
      if (this.showOnlyCriticalPath && this.highlightedFields.length > 0) {
        this.updateCriticalPath();
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
        });
      }
      // 重新应用节点可见性，这会自动处理相关连接线的可见性
      this.$nextTick(() => {
        this.json.nodes.forEach(node => {
          this.getNodeVisibility(node);
        });
        this.highlightConnections(this.highlightedFields);
      });
    },
    // 聚焦到下一个字段
    async focusNextField() {
      if (!this.highlightedFields.length) return;

      // 添加按钮点击动画效果
      const cameraButton = document.querySelector('.camera-button');
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
      const counterElement = document.querySelector('.field-counter');
      if (counterElement) {
        counterElement.classList.add('counter-update');
        setTimeout(() => {
          counterElement.classList.remove('counter-update');
        }, 500);
      }
      
      // 获取目标字段元素
      const fieldId = `${field.tableName}${this.minus}${field.fieldName}`;
      const fieldElement = document.getElementById(fieldId);
      
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
      const tableFlow = document.querySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }
      pan.moveTo(targetX, targetY);
      setTimeout(() => {
        if (tableFlow) tableFlow.classList.remove('camera-animate');
        this.jsplumbInstance.repaintEverything();
      }, 500);

      // 5. 添加高亮动画效果
      fieldElement.classList.add('field-focus-animation');
      setTimeout(() => {
        fieldElement.classList.remove('field-focus-animation');
      }, 1500);
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
        
        // 更新表类型图例的位置
        const legend = document.querySelector('.table-type-legend');
        if (legend) {
          legend.style.left = (newWidth + 40) + 'px';
        }
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

    // 改进的聚焦到节点方法
    async focusOnNode(node) {
      if (!this.jsplumbInstance || !node) return;

      // 更新聚焦状态
      this.focusedNode = node.name;
      
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
      const nodeElement = document.getElementById(node.name);
      
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
      const tableFlow = document.querySelector('.table-flow');
      if (tableFlow) {
        tableFlow.classList.add('camera-animate');
      }

      // 6. 移动到目标位置
      pan.moveTo(targetX, targetY);

      // 7. 添加节点高亮动画
      nodeElement.classList.add('node-focus-animation');
      
      // 8. 清理动画类
      setTimeout(() => {
        if (tableFlow) {
          tableFlow.classList.remove('camera-animate');
        }
        nodeElement.classList.remove('node-focus-animation');
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
      
      // 恢复绘制
      this.jsplumbInstance.setSuspendDrawing(false, true);
    },

    // 处理新的血缘数据
    async handleNewLineageData(data) {
      this.isAnalyzing = true;
      try {
        // 清理现有画布
        this.cleanupCanvas();
        
        // 更新数据
        this.json.nodes = data.nodes;
        this.json.edges = data.edges;
        
        // 重新初始化画布
        await this.reinitializeCanvas();
      } finally {
        this.isAnalyzing = false;
      }
    }
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
    bottom: 20px;
    transform: translateX(-50%);
    z-index: 10001;
    width: 30%;  // 改回30%宽度
    max-width: 800px;
    
    // 最小化按钮样式
    .minimize-btn {
      position: absolute;
      top: -32px;
      right: 0;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 4px 4px 0 0;
      background: white;
      color: #666;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      z-index: 10002; // 确保按钮始终在最上层
      
      &:hover {
        background: #f5f5f5;
        color: #333;
      }
    }
    
    // SQL面板样式
    .sql-panel {
      width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      transition: all 0.3s ease;
      
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
        gap: 12px;
        
        .sql-textarea {
          width: 90%;
          height: 60px;  // 调整回原来的高度
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.5;
          resize: vertical;
          min-height: 50px;
          max-height: 300px;
          
          &:focus {
            outline: none;
            border-color: #1890ff;
            box-shadow: 0 0 0 2px rgba(24,144,255,0.2);
          }
        }
        
        .sql-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .sql-options {
            display: flex;
            gap: 16px;
            
            .option-label {
              display: flex;
              align-items: center;
              gap: 6px;
              cursor: pointer;
              user-select: none;
              
              input[type="checkbox"] {
                margin: 0;
                width: 16px;
                height: 16px;
                cursor: pointer;
              }
              
              .option-text {
                font-size: 14px;
                color: #333;
              }
              
              &:hover .option-text {
                color: #1890ff;
              }
            }
          }
          
          .analyze-btn {
            padding: 8px 24px;
            background-color: #1890ff;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            
            &:hover {
              background-color: #40a9ff;
            }
            
            &:active {
              background-color: #096dd9;
            }
            
            &:disabled {
              background-color: #d9d9d9;
              cursor: not-allowed;
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
    left: 20px;
    bottom: 10px;
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
    left: 20px;
    top: 20px;
    min-width: 200px;
    max-height: calc(100vh - 40px);
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    
    .panel-header {
      padding: 16px;
      border-bottom: 1px solid #eee;
      width: 100%;
      box-sizing: border-box;
      
      h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }
      
      .panel-search {
        position: relative;
        width: 100%;
        
        .node-search-input {
          width: 100%;
          height: 32px;
          padding: 0 32px 0 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s;
          box-sizing: border-box;
          
          &:focus {
            border-color: #1890ff;
            box-shadow: 0 0 0 2px rgba(24,144,255,0.2);
          }
        }
        
        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: #999;
          font-size: 14px;
          padding: 4px;
          
          &:hover {
            color: #666;
          }
        }
      }
    }
    
    .node-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      width: 100%;
      box-sizing: border-box;
      
      .node-list-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        margin-bottom: 4px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
        box-sizing: border-box;
        
        &:hover {
          background: #f5f5f5;
        }
        
        &.node-hidden {
          opacity: 0.5;
        }
        
        &.node-focused {
          background: #e6f7ff;
          border: 1px solid #91d5ff;
        }
        
        &.search-highlight {
          background: #fff7e6;
          
          &:hover {
            background: #fff1d6;
          }
        }
        
        .node-type-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          flex-shrink: 0;
        }
        
        .node-name {
          flex: 1;
          font-size: 14px;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          
          .highlight {
            background-color: #ffd591;
            padding: 0 2px;
            border-radius: 2px;
          }
        }
        
        .node-fields-count {
          padding: 2px 6px;
          background: #f0f0f0;
          border-radius: 10px;
          font-size: 12px;
          color: #666;
          margin-left: 8px;
          flex-shrink: 0;
        }
      }
    }
    
    .resize-handle {
      position: absolute;
      top: 0;
      right: -5px;
      width: 10px;
      height: 100%;
      cursor: ew-resize;
      
      &:hover {
        background: rgba(24, 144, 255, 0.1);
      }
      
      &:active {
        background: rgba(24, 144, 255, 0.2);
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

// 调整表类型图例位置，使其跟随面板宽度
.table-type-legend {
  left: 340px;
  transition: left 0.3s ease;
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
</style>