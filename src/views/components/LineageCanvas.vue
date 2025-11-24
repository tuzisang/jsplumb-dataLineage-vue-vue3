<template>
  <div class="canvas-container">
    <!-- 画布包装器 -->
    <div 
      ref="flowWrap" 
      class="flow-wrap" 
      :class="{ 'high-performance': performanceConfig.highPerformanceMode }"
    >
      <!-- 加载遮罩 -->
      <div 
        v-if="showLoadingMask" 
        class="loading-overlay" 
        :class="{ 'high-performance': performanceConfig.highPerformanceMode }"
      >
        <div class="loading-spinner"></div>
        <div class="loading-text">正在分析血缘关系...</div>
      </div>

      <!-- 主画布区域 -->
      <div 
        id="table-flow" 
        ref="tableFlow"
        class="table-flow"
      >
        <!-- 表节点渲染 -->
        <TableNode 
          v-for="node in visibleNodes" 
          :key="node.name" 
          :node="node"
          :highlighted-tables="highlightedTables"
          :selected-tables="selectedTables" 
          :selected-fields="selectedFields" 
          :highlighted-fields="highlightedFields" 
          :is-disabled="isNodeDisabled(node)" 
          :edges="edges" 
          :is-table-mode="lineageLevel === 'table'" 
          :minus="minus"
          :focused-node="focusedNode" 
          @hide-node="handleToggleNodeVisibility" 
          @copy-fields="handleCopyFields" 
          @table-name-click="handleTableNameClick" 
          @table-select="handleTableSelect" 
          @field-select="handleFieldSelect" 
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

    <!-- 镜头定位按钮 -->
    <div
      v-if="showCameraControls"
      class="camera-controls"
    >
      <div class="camera-info">
        <span 
          class="field-counter" 
          v-if="lineageLevel === 'column'"
        >
          {{ currentFieldIndex + 1 }} / {{ selectedFields.length }}
        </span>
        <span 
          class="field-counter" 
          v-if="lineageLevel === 'table'"
        >
          {{ currentTableIndex + 1 }} / {{ highlightedTables.length }}
        </span>
      </div>
      <button 
        class="camera-button" 
        @click="handleFocusNext"
        :title="getFocusNextTitle()"
      >
        <i class="camera-icon">🎯</i>
      </button>
    </div>

    <!-- 虚拟化状态提示 -->
    <div 
      v-if="virtualizationEnabled" 
      class="virtualization-status"
    >
      <span>虚拟化渲染已启用 ({{ visibleNodes.length }}/{{ totalNodes }} 节点)</span>
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

    <!-- 性能统计（可选） -->
    <div 
      v-if="performanceConfig.showPerformanceStats" 
      class="performance-stats"
    >
      <div class="stats-title">性能统计</div>
      <div class="stats-items">
        <div class="stat-item">
          <span class="stat-label">节点数:</span>
          <span class="stat-value">{{ totalNodes }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">边数:</span>
          <span class="stat-value">{{ edges.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">可见节点:</span>
          <span class="stat-value">{{ visibleNodes.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">虚拟化:</span>
          <span class="stat-value">{{ virtualizationEnabled ? '启用' : '禁用' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { LineageLevel } from '../../types/index.js';
import TableNode from './TableNode.vue';

export default {
  name: 'LineageCanvas',
  
  components: {
    TableNode
  },
  
  props: {
    // 节点数据
    nodes: {
      type: Array,
      default: () => []
    },
    // 边数据
    edges: {
      type: Array,
      default: () => []
    },
    // 血缘级别
    lineageLevel: {
      type: String,
      default: LineageLevel.COLUMN
    },
    // JSPlumb实例
    jsplumbInstance: {
      type: Object,
      default: null
    },
    // 是否显示加载遮罩
    showLoadingMask: {
      type: Boolean,
      default: false
    },
    // 高亮的表
    highlightedTables: {
      type: Array,
      default: () => []
    },
    // 选中的表
    selectedTables: {
      type: Array,
      default: () => []
    },
    // 选中的字段
    selectedFields: {
      type: Array,
      default: () => []
    },
    // 高亮的字段
    highlightedFields: {
      type: Array,
      default: () => []
    },
    // 焦点节点
    focusedNode: {
      type: String,
      default: null
    },
    // 是否只显示关键路径
    showOnlyCriticalPath: {
      type: Boolean,
      default: false
    },
    // 当前字段索引
    currentFieldIndex: {
      type: Number,
      default: 0
    },
    // 当前表索引
    currentTableIndex: {
      type: Number,
      default: 0
    },
    // 表类型配置
    tableTypes: {
      type: Array,
      default: () => []
    },
    // 关键路径节点
    criticalPathNodes: {
      type: Set,
      default: () => new Set()
    },
    // 隐藏的节点
    hiddenNodes: {
      type: Set,
      default: () => new Set()
    },
    // 虚拟化相关
    virtualizationEnabled: {
      type: Boolean,
      default: false
    },
    // 性能配置
    performanceConfig: {
      type: Object,
      default: () => ({
        highPerformanceMode: true,
        showPerformanceStats: false
      })
    },
    // 辅助线状态
    auxiliaryLine: {
      type: Object,
      default: () => ({
        isShowXLine: false,
        isShowYLine: false
      })
    },
    // 辅助线位置
    auxiliaryLinePos: {
      type: Object,
      default: () => ({
        width: '100%',
        height: '100%',
        offsetX: 0,
        offsetY: 0,
        x: 20,
        y: 20
      })
    },
    // 分隔符
    minus: {
      type: String,
      default: '-'
    }
  },

  emits: [
    'toggle-node-visibility',
    'copy-fields',
    'table-name-click',
    'table-select',
    'field-select',
    'focus-next-field',
    'focus-next-table',
    'canvas-mousemove',
    'canvas-mouseup',
    'canvas-scroll'
  ],

  setup(props, { emit }) {
    // 引用
    const flowWrap = ref(null);
    const tableFlow = ref(null);

    // 计算属性
    const visibleNodes = computed(() => {
      if (!props.virtualizationEnabled) {
        return props.nodes;
      }
      
      // 这里可以添加虚拟化过滤逻辑
      return props.nodes.filter(node => !props.hiddenNodes.has(node.name));
    });

    const totalNodes = computed(() => props.nodes.length);

    const showCameraControls = computed(() => {
      return props.showOnlyCriticalPath && 
        ((props.lineageLevel === 'column' && props.selectedFields.length > 0) || 
         (props.lineageLevel === 'table' && props.highlightedTables.length > 0));
    });

    // 方法
    const isNodeDisabled = (node) => {
      if (props.showOnlyCriticalPath && props.criticalPathNodes.size > 0) {
        return !props.criticalPathNodes.has(node.name);
      }
      return false;
    };

    const handleToggleNodeVisibility = (data) => {
      emit('toggle-node-visibility', data);
    };

    const handleCopyFields = (data) => {
      emit('copy-fields', data);
    };

    const handleTableNameClick = (data) => {
      emit('table-name-click', data);
    };

    const handleTableSelect = (data) => {
      emit('table-select', data);
    };

    const handleFieldSelect = (data) => {
      emit('field-select', data);
    };

    const handleFocusNext = () => {
      if (props.lineageLevel === 'column') {
        emit('focus-next-field');
      } else {
        emit('focus-next-table');
      }
    };

    const getFocusNextTitle = () => {
      if (props.lineageLevel === 'column') {
        return '移动到下一个相关字段';
      }
      return '移动到下一个相关表';
    };

    const handleCanvasMouseMove = (event) => {
      emit('canvas-mousemove', event);
    };

    const handleCanvasMouseUp = (event) => {
      emit('canvas-mouseup', event);
    };

    const handleCanvasScroll = (event) => {
      emit('canvas-scroll', event);
    };

    // 获取画布变换信息
    const getTransform = () => {
      if (!props.jsplumbInstance || !props.jsplumbInstance.pan) {
        return { x: 0, y: 0, scale: 1 };
      }

      const pan = props.jsplumbInstance.pan;
      const zoom = props.jsplumbInstance.getZoom();
      
      return {
        x: pan.x || 0,
        y: pan.y || 0,
        scale: zoom || 1
      };
    };

    // 获取容器尺寸
    const getContainerSize = () => {
      if (!flowWrap.value) {
        return { width: 0, height: 0 };
      }
      
      return {
        width: flowWrap.value.clientWidth,
        height: flowWrap.value.clientHeight
      };
    };

    // 暴露给父组件的方法
    const getCanvasElement = () => tableFlow.value;
    const getWrapperElement = () => flowWrap.value;
    
    // 生命周期钩子
    onMounted(() => {
      // 添加事件监听器
      if (flowWrap.value) {
        flowWrap.value.addEventListener('mousemove', handleCanvasMouseMove);
        flowWrap.value.addEventListener('mouseup', handleCanvasMouseUp);
        flowWrap.value.addEventListener('scroll', handleCanvasScroll, { passive: true });
      }
    });

    onUnmounted(() => {
      // 清理事件监听器
      if (flowWrap.value) {
        flowWrap.value.removeEventListener('mousemove', handleCanvasMouseMove);
        flowWrap.value.removeEventListener('mouseup', handleCanvasMouseUp);
        flowWrap.value.removeEventListener('scroll', handleCanvasScroll);
      }
    });

    return {
      // 引用
      flowWrap,
      tableFlow,
      
      // 计算属性
      visibleNodes,
      totalNodes,
      showCameraControls,
      
      // 方法
      isNodeDisabled,
      handleToggleNodeVisibility,
      handleCopyFields,
      handleTableNameClick,
      handleTableSelect,
      handleFieldSelect,
      handleFocusNext,
      getFocusNextTitle,
      getTransform,
      getContainerSize,
      getCanvasElement,
      getWrapperElement,
      
      // 枚举
      LineageLevel
    };
  }
};
</script>

<style scoped>
/* 画布容器样式 */
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fafafa;
}

.flow-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: linear-gradient(45deg, #f8fafc 25%, transparent 25%),
              linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #f8fafc 75%),
              linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.flow-wrap.high-performance {
  background: #f8fafc;
}

.table-flow {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 2000px;
  min-height: 2000px;
  transform-origin: 0 0;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.loading-overlay.high-performance {
  background: rgba(255, 255, 255, 0.95);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 镜头定位按钮 */
.camera-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.camera-info {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.field-counter {
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.camera-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.camera-icon {
  font-size: 16px;
}

/* 虚拟化状态提示 */
.virtualization-status {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  z-index: 100;
  backdrop-filter: blur(4px);
}

/* 表类型图例 */
.table-type-legend {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 100;
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.type-name {
  font-weight: 500;
}

/* 性能统计 */
.performance-stats {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 100;
  min-width: 150px;
}

.stats-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.stats-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  color: #374151;
  font-weight: 500;
}

/* 辅助线 */
.auxiliary-line {
  position: absolute;
  background: rgba(59, 130, 246, 0.3);
  pointer-events: none;
  z-index: 1000;
}

.auxiliary-line--x {
  height: 1px;
}

.auxiliary-line--y {
  width: 1px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .camera-controls {
    bottom: 10px;
    right: 10px;
    padding: 6px;
    gap: 6px;
  }
  
  .camera-info {
    font-size: 11px;
  }
  
  .table-type-legend {
    bottom: 10px;
    left: 10px;
    padding: 8px;
  }
  
  .performance-stats {
    top: 10px;
    right: 10px;
    padding: 8px;
    min-width: 120px;
  }
  
  .virtualization-status {
    top: 10px;
    padding: 6px 12px;
    font-size: 11px;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .canvas-container {
    background: #111827;
  }
  
  .flow-wrap {
    background: linear-gradient(45deg, #1f2937 25%, transparent 25%),
                linear-gradient(-45deg, #1f2937 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #1f2937 75%),
                linear-gradient(-45deg, transparent 75%, #1f2937 75%);
  }
  
  .flow-wrap.high-performance {
    background: #1f2937;
  }
  
  .loading-overlay {
    background: rgba(17, 24, 39, 0.9);
  }
  
  .loading-text {
    color: #d1d5db;
  }
  
  .camera-controls,
  .table-type-legend,
  .performance-stats {
    background: #1f2937;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .camera-info {
    color: #d1d5db;
  }
  
  .field-counter {
    background: #374151;
    color: #d1d5db;
  }
  
  .legend-title,
  .stats-title {
    color: #f9fafb;
  }
  
  .legend-item {
    color: #d1d5db;
  }
  
  .stat-label {
    color: #9ca3af;
  }
  
  .stat-value,
  .type-name {
    color: #f3f4f6;
  }
  
  .auxiliary-line {
    background: rgba(59, 130, 246, 0.5);
  }
}

/* 高性能模式优化 */
.high-performance * {
  will-change: transform;
}

.high-performance .loading-spinner {
  animation: none;
  border-top-color: #60a5fa;
}

.high-performance .table-flow {
  transform: translateZ(0);
}

/* 打印样式 */
@media print {
  .camera-controls,
  .table-type-legend,
  .performance-stats,
  .virtualization-status,
  .loading-overlay {
    display: none !important;
  }
  
  .flow-wrap {
    overflow: visible;
  }
  
  .table-flow {
    min-width: auto;
    min-height: auto;
  }
}
</style>