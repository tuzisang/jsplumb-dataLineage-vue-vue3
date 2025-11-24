<template>
  <div class="batch-actions">
    <!-- 仅显示关键路径切换按钮 -->
    <button 
      class="batch-action-btn" 
      @click="handleToggleCriticalPath" 
      :class="{ 'active': showOnlyCriticalPath }"
      title="切换关键路径显示模式"
    >
      <i class="filter-icon">🔍</i>
      {{ showOnlyCriticalPath ? '显示所有节点' : '仅显示关键路径' }}
    </button>

    <!-- 仅显示关键血缘/显示全景血缘按钮 -->
    <button 
      class="batch-action-btn" 
      @click="handleShowCriticalLineage" 
      :class="{ 'active': isShowingCriticalLineage }" 
      :disabled="!canShowCriticalLineage" 
      :title="getCriticalLineageTitle()"
    >
      <i class="filter-icon">⚡</i>
      {{ isShowingCriticalLineage ? '显示全景血缘' : '仅显示关键血缘' }}
    </button>

    <!-- 批量操作下拉菜单 -->
    <div class="batch-dropdown" v-if="showBatchDropdown">
      <button 
        class="batch-action-btn dropdown-toggle" 
        @click="toggleBatchDropdown"
      >
        <i class="batch-icon">⚙️</i>
        批量操作
        <span class="dropdown-arrow">▼</span>
      </button>
      
      <div class="dropdown-menu" v-show="batchDropdownOpen">
        <button 
          class="dropdown-item" 
          @click="handleExpandAll"
          :disabled="!hasNodes"
        >
          <i class="item-icon">📂</i>
          展开所有节点
        </button>
        
        <button 
          class="dropdown-item" 
          @click="handleCollapseAll"
          :disabled="!hasNodes"
        >
          <i class="item-icon">📁</i>
          折叠所有节点
        </button>
        
        <button 
          class="dropdown-item" 
          @click="handleShowAll"
          :disabled="!hiddenNodes.size"
        >
          <i class="item-icon">👁️</i>
          显示所有节点
        </button>
        
        <button 
          class="dropdown-item" 
          @click="handleHideAll"
          :disabled="!hasNodes"
        >
          <i class="item-icon">🙈</i>
          隐藏所有节点
        </button>
        
        <div class="dropdown-divider"></div>
        
        <button 
          class="dropdown-item" 
          @click="handleResetPositions"
          :disabled="!hasNodes"
        >
          <i class="item-icon">🔄</i>
          重置位置
        </button>
        
        <button 
          class="dropdown-item" 
          @click="handleAutoLayout"
          :disabled="!hasNodes"
        >
          <i class="item-icon">📐</i>
          自动布局
        </button>
        
        <div class="dropdown-divider"></div>
        
        <button 
          class="dropdown-item" 
          @click="handleExportData"
          :disabled="!hasNodes"
        >
          <i class="item-icon">💾</i>
          导出数据
        </button>
        
        <button 
          class="dropdown-item" 
          @click="handleClearAll"
          :disabled="!hasNodes"
        >
          <i class="item-icon">🗑️</i>
          清空画布
        </button>
      </div>
    </div>

    <!-- 下载图片按钮 -->
    <DownloadImage 
      v-if="showDownloadButton && hasNodes"
      :target-element="'.table-flow'" 
      :filename="getDownloadFilename()"
      :lineage-level="lineageLevel"
      :js-plumb-instance="jsplumbInstance"
      @start="handleDownloadStart"
      @success="handleDownloadSuccess"
      @error="handleDownloadError"
      @refresh-plumb="handleRefreshPlumb"
    />

    <!-- 性能模式切换 -->
    <button 
      class="batch-action-btn performance-btn" 
      @click="handleTogglePerformance"
      :class="{ 'active': highPerformanceMode }"
      :title="highPerformanceMode ? '切换到标准模式' : '切换到高性能模式'"
    >
      <i class="performance-icon">⚡</i>
      {{ highPerformanceMode ? '高性能' : '标准' }}
    </button>

    <!-- 视图控制按钮 -->
    <div class="view-controls" v-if="showViewControls">
      <button 
        class="view-btn" 
        @click="handleZoomIn"
        title="放大"
      >
        <i class="view-icon">➕</i>
      </button>
      
      <button 
        class="view-btn" 
        @click="handleZoomOut"
        title="缩小"
      >
        <i class="view-icon">➖</i>
      </button>
      
      <button 
        class="view-btn" 
        @click="handleResetZoom"
        title="重置缩放"
      >
        <i class="view-icon">🔄</i>
      </button>
      
      <button 
        class="view-btn" 
        @click="handleFitToScreen"
        title="适应屏幕"
      >
        <i class="view-icon">📱</i>
      </button>
    </div>

    <!-- 历史记录面板 -->
    <div class="history-panel" v-if="showHistoryPanel">
      <div class="history-header">
        <h3>历史记录</h3>
        <button 
          class="toggle-btn" 
          @click="handleToggleHistoryPanel" 
          :title="historyPanelExpanded ? '收起历史记录' : '展开历史记录'"
        >
          <span v-if="historyPanelExpanded">▼</span>
          <span v-else>▶</span>
        </button>
      </div>

      <div v-show="historyPanelExpanded" class="history-content">
        <div v-if="historyItems.length === 0" class="history-empty">
          <div class="empty-icon">📊</div>
          <span>暂无历史记录</span>
          <small>输入SQL查询后，分析结果将自动保存到这里</small>
        </div>

        <!-- 最近记录列表 -->
        <div v-if="historyItems.length > 0" class="recent-history-list">
          <div 
            v-for="item in historyItems" 
            :key="item.id"
            class="history-item"
            :class="{ 'history-item--current': isCurrentHistory(item) }"
            @click="handleLoadHistory(item)"
          >
            <div class="history-item-header">
              <span class="history-item-title" :title="item.title">
                {{ item.title }}
              </span>
              <button 
                class="history-delete-btn" 
                @click.stop="handleDeleteHistory(item.id)"
                title="删除记录"
              >
                ✕
              </button>
            </div>
            <div class="history-item-meta">
              <span class="history-item-level">{{ getLineageLevelLabel(item.lineageLevel) }}</span>
              <span class="history-item-nodes">{{ item.nodeCount }} 节点</span>
              <span class="history-item-time">{{ formatTime(item.timestamp) }}</span>
            </div>
            <div class="history-item-preview" :title="item.preview">
              {{ item.preview }}
            </div>
          </div>
        </div>

        <!-- 历史记录操作 -->
        <div class="history-actions" v-if="historyItems.length > 0">
          <button class="history-action-btn" @click="handleClearHistory">
            清空历史
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { LineageLevel } from '../../types/index.js';
import DownloadImage from './DownloadImage.vue';

export default {
  name: 'BatchActions',
  
  components: {
    DownloadImage
  },
  
  props: {
    // 是否显示关键路径
    showOnlyCriticalPath: {
      type: Boolean,
      default: false
    },
    // 是否显示关键血缘
    isShowingCriticalLineage: {
      type: Boolean,
      default: false
    },
    // 血缘级别
    lineageLevel: {
      type: String,
      default: LineageLevel.COLUMN
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
    // 隐藏的节点
    hiddenNodes: {
      type: Set,
      default: () => new Set()
    },
    // 节点数据
    nodes: {
      type: Array,
      default: () => []
    },
    // JSPlumb实例
    jsplumbInstance: {
      type: Object,
      default: null
    },
    // 是否显示下载按钮
    showDownloadButton: {
      type: Boolean,
      default: true
    },
    // 是否显示批量操作下拉菜单
    showBatchDropdown: {
      type: Boolean,
      default: true
    },
    // 是否显示视图控制
    showViewControls: {
      type: Boolean,
      default: false
    },
    // 是否显示历史记录面板
    showHistoryPanel: {
      type: Boolean,
      default: true
    },
    // 历史记录项
    historyItems: {
      type: Array,
      default: () => []
    },
    // 当前SQL查询
    currentSqlQuery: {
      type: String,
      default: ''
    },
    // 高性能模式
    highPerformanceMode: {
      type: Boolean,
      default: true
    },
    // 历史记录面板是否展开
    historyPanelExpanded: {
      type: Boolean,
      default: true
    }
  },

  emits: [
    'toggle-critical-path',
    'show-critical-lineage',
    'expand-all',
    'collapse-all',
    'show-all',
    'hide-all',
    'reset-positions',
    'auto-layout',
    'export-data',
    'clear-all',
    'download-start',
    'download-success',
    'download-error',
    'refresh-plumb',
    'toggle-performance',
    'zoom-in',
    'zoom-out',
    'reset-zoom',
    'fit-to-screen',
    'toggle-history-panel',
    'load-history',
    'delete-history',
    'clear-history'
  ],

  setup(props, { emit }) {
    // 本地状态
    const batchDropdownOpen = ref(false);

    // 计算属性
    const hasNodes = computed(() => props.nodes.length > 0);
    
    const canShowCriticalLineage = computed(() => {
      return props.isShowingCriticalLineage || 
        (props.lineageLevel === 'table' && props.selectedTables.length > 0) ||
        (props.lineageLevel === 'column' && props.selectedFields.length > 0);
    });

    // 方法
    const handleToggleCriticalPath = () => {
      emit('toggle-critical-path');
    };

    const handleShowCriticalLineage = () => {
      emit('show-critical-lineage');
    };

    const getCriticalLineageTitle = () => {
      if (props.isShowingCriticalLineage) {
        return '返回显示所有表的全景血缘';
      }
      
      if (props.lineageLevel === 'table') {
        return props.selectedTables.length === 0 
          ? '请先勾选要显示的表'
          : '显示选中表的关键血缘';
      }
      
      return props.selectedFields.length === 0
        ? '请先勾选要显示的字段'
        : '显示选中字段的关键血缘';
    };

    const toggleBatchDropdown = () => {
      batchDropdownOpen.value = !batchDropdownOpen.value;
    };

    const handleExpandAll = () => {
      emit('expand-all');
      batchDropdownOpen.value = false;
    };

    const handleCollapseAll = () => {
      emit('collapse-all');
      batchDropdownOpen.value = false;
    };

    const handleShowAll = () => {
      emit('show-all');
      batchDropdownOpen.value = false;
    };

    const handleHideAll = () => {
      emit('hide-all');
      batchDropdownOpen.value = false;
    };

    const handleResetPositions = () => {
      emit('reset-positions');
      batchDropdownOpen.value = false;
    };

    const handleAutoLayout = () => {
      emit('auto-layout');
      batchDropdownOpen.value = false;
    };

    const handleExportData = () => {
      emit('export-data');
      batchDropdownOpen.value = false;
    };

    const handleClearAll = () => {
      if (confirm('确定要清空所有节点和连接吗？此操作不可撤销。')) {
        emit('clear-all');
      }
      batchDropdownOpen.value = false;
    };

    const handleDownloadStart = () => {
      emit('download-start');
    };

    const handleDownloadSuccess = () => {
      emit('download-success');
    };

    const handleDownloadError = (error) => {
      emit('download-error', error);
    };

    const handleRefreshPlumb = () => {
      emit('refresh-plumb');
    };

    const handleTogglePerformance = () => {
      emit('toggle-performance');
    };

    const handleZoomIn = () => {
      emit('zoom-in');
    };

    const handleZoomOut = () => {
      emit('zoom-out');
    };

    const handleResetZoom = () => {
      emit('reset-zoom');
    };

    const handleFitToScreen = () => {
      emit('fit-to-screen');
    };

    const handleToggleHistoryPanel = () => {
      emit('toggle-history-panel');
    };

    const handleLoadHistory = (item) => {
      emit('load-history', item);
    };

    const handleDeleteHistory = (historyId) => {
      if (confirm('确定要删除这条历史记录吗？')) {
        emit('delete-history', historyId);
      }
    };

    const handleClearHistory = () => {
      if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
        emit('clear-history');
      }
    };

    const getDownloadFilename = () => {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const level = props.lineageLevel === LineageLevel.TABLE ? '表级' : '列级';
      return `血缘关系图-${level}-${timestamp}`;
    };

    const isCurrentHistory = (item) => {
      return hasNodes.value && 
        props.currentSqlQuery === item.sql && 
        props.lineageLevel === item.lineageLevel;
    };

    const getLineageLevelLabel = (level) => {
      return level === LineageLevel.TABLE ? '表级' : '列级';
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) { // 1分钟内
        return '刚刚';
      } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`;
      } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`;
      } else {
        return date.toLocaleDateString();
      }
    };

    // 点击外部关闭下拉菜单
    const handleClickOutside = (event) => {
      if (batchDropdownOpen.value && !event.target.closest('.batch-dropdown')) {
        batchDropdownOpen.value = false;
      }
    };

    return {
      // 本地状态
      batchDropdownOpen,
      
      // 计算属性
      hasNodes,
      canShowCriticalLineage,
      
      // 方法
      handleToggleCriticalPath,
      handleShowCriticalLineage,
      getCriticalLineageTitle,
      toggleBatchDropdown,
      handleExpandAll,
      handleCollapseAll,
      handleShowAll,
      handleHideAll,
      handleResetPositions,
      handleAutoLayout,
      handleExportData,
      handleClearAll,
      handleDownloadStart,
      handleDownloadSuccess,
      handleDownloadError,
      handleRefreshPlumb,
      handleTogglePerformance,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
      handleFitToScreen,
      handleToggleHistoryPanel,
      handleLoadHistory,
      handleDeleteHistory,
      handleClearHistory,
      getDownloadFilename,
      isCurrentHistory,
      getLineageLevelLabel,
      formatTime,
      handleClickOutside,
      
      // 枚举
      LineageLevel
    };
  },

  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }
};
</script>

<style scoped>
/* 批量操作区域样式 */
.batch-actions {
  position: fixed;
  top: 80px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.batch-action-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  min-width: 120px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.batch-action-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.batch-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.batch-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.batch-action-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.batch-action-btn.active:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.filter-icon,
.batch-icon,
.performance-icon {
  font-size: 14px;
}

.performance-btn {
  min-width: 80px;
}

/* 下拉菜单样式 */
.dropdown-toggle {
  position: relative;
}

.dropdown-arrow {
  margin-left: auto;
  font-size: 10px;
  transition: transform 0.2s ease;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
  margin-top: 4px;
}

.dropdown-item {
  width: 100%;
  background: none;
  border: none;
  padding: 10px 12px;
  text-align: left;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-item:hover:not(:disabled) {
  background: #f3f4f6;
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

/* 视图控制样式 */
.view-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.view-btn {
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.view-icon {
  font-size: 14px;
}

/* 历史记录面板样式 */
.history-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 280px;
  max-height: 400px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.history-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.toggle-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  transition: color 0.2s ease;
}

.toggle-btn:hover {
  color: #374151;
}

.history-content {
  max-height: 350px;
  overflow-y: auto;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.history-empty span {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.history-empty small {
  font-size: 12px;
  opacity: 0.7;
}

.recent-history-list {
  padding: 8px;
}

.history-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-item--current {
  background: #eff6ff;
  border-color: #3b82f6;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px 4px;
}

.history-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.history-delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.history-delete-btn:hover {
  background: #fef2f2;
}

.history-item-meta {
  display: flex;
  gap: 8px;
  padding: 0 12px;
  font-size: 10px;
  color: #6b7280;
}

.history-item-level {
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.history-item-preview {
  padding: 4px 12px 8px;
  font-size: 11px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-actions {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
}

.history-action-btn {
  width: 100%;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-action-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .batch-actions {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    top: auto;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: calc(100vw - 40px);
  }
  
  .batch-action-btn {
    min-width: auto;
    padding: 8px 12px;
    font-size: 11px;
  }
  
  .history-panel {
    position: fixed;
    bottom: 80px;
    left: 20px;
    right: 20px;
    width: auto;
    max-height: 200px;
  }
  
  .view-controls {
    position: fixed;
    bottom: 20px;
    right: 20px;
    flex-direction: row;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .batch-action-btn {
    background: #1f2937;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .batch-action-btn:hover:not(:disabled) {
    background: #374151;
    border-color: #6b7280;
  }
  
  .batch-action-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .dropdown-menu {
    background: #1f2937;
    border-color: #4b5563;
  }
  
  .dropdown-item {
    color: #f9fafb;
  }
  
  .dropdown-item:hover:not(:disabled) {
    background: #374151;
  }
  
  .dropdown-divider {
    background: #4b5563;
  }
  
  .view-controls {
    background: #1f2937;
  }
  
  .view-btn {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .view-btn:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
  
  .history-panel {
    background: #1f2937;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .history-header {
    background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
    border-bottom-color: #374151;
  }
  
  .history-header h3 {
    color: #f9fafb;
  }
  
  .history-item {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .history-item:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
  
  .history-item--current {
    background: #1e3a8a;
    border-color: #3b82f6;
  }
  
  .history-item-title {
    color: #f3f4f6;
  }
  
  .history-item-meta {
    color: #d1d5db;
  }
  
  .history-item-level {
    background: #4b5563;
    color: #d1d5db;
  }
  
  .history-item-preview {
    color: #9ca3af;
  }
  
  .history-actions {
    border-top-color: #4b5563;
  }
  
  .history-action-btn {
    background: #7f1d1d;
    color: #fca5a5;
    border-color: #991b1b;
  }
  
  .history-action-btn:hover {
    background: #991b1b;
    border-color: #b91c1c;
  }
}

/* 打印样式 */
@media print {
  .batch-actions {
    display: none !important;
  }
}
</style>