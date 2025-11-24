<template>
  <div 
    class="node-list-panel" 
    :class="{ 'node-list-panel--minimized': isMinimized }" 
    :style="{ width: isMinimized ? '40px' : panelWidth + 'px' }"
  >
    <div class="panel-header">
      <h3 v-show="!isMinimized">
        <template v-if="listMode === 'table'">表列表</template>
        <template v-se>字段列表</template>
      </h3>
      
      <!-- 节点列表最小化按钮 -->
      <button 
        class="minimize-btn modern" 
        @click="handleToggleMinimize" 
        :title="isMinimized ? '展开' : '最小化'" 
        style="position: absolute; right: 8px; top: -38px;"
      >
        <svg v-if="isMinimized" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 14l5-5 5 5" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="#1890ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      
      <div class="panel-search" v-show="!isMinimized">
        <input 
          type="text" 
          v-model="localNodeSearchQuery" 
          :placeholder="listMode === 'table' ? '搜索表名...' : '搜索字段名...'"
          class="node-search-input" 
          @input="handleNodeSearch"
        >
        <span 
          v-if="localNodeSearchQuery" 
          class="clear-search" 
          @click="handleClearNodeSearch"
        >✕</span>
      </div>
      
      <!-- 切换按钮 -->
      <div class="list-toggle" style="margin-top:8px;" v-show="!isMinimized">
        <button 
          :class="{ active: listMode === 'table' }" 
          @click="handleListModeChange('table')"
          style="margin-right: 4px;"
        >表</button>
        <button 
          :class="{ active: listMode === 'field' }" 
          @click="handleListModeChange('field')"
        >字段</button>
      </div>

      <!-- 表类型筛选 -->
      <div class="type-filter-section" v-show="!isMinimized && listMode === 'table'">
        <div class="filter-header">
          <span class="filter-title">表类型筛选</span>
          <button 
            class="toggle-filter-btn" 
            @click="handleToggleTypeFilter"
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
                v-model="localSelectedTableTypes"
                @change="handleTableTypeChange"
              >
              <span class="type-indicator" :style="{ backgroundColor: type.color }"></span>
              <span class="type-name">{{ type.label || type.type }}</span>
            </label>
          </div>

          <div class="filter-actions">
            <button class="filter-action-btn" @click="handleSelectAllTypes">全选</button>
            <button class="filter-action-btn" @click="handleClearAllTypes">清空</button>
          </div>
        </div>
      </div>

      <!-- 分组显示开关 -->
      <div class="group-toggle-section" v-show="!isMinimized && listMode === 'table'">
        <label class="group-toggle-label">
          <input 
            type="checkbox" 
            v-model="localGroupByType"
            @change="handleGroupByTypeChange"
          >
          <span>按类型分组显示</span>
        </label>
      </div>
    </div>

    <!-- 节点列表内容 -->
    <div class="node-list" v-show="!isMinimized">
      <!-- 表头说明 -->
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
            v-for="(nodes, type) in groupedNodes" 
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
                @click.stop.prevent="handleToggleGroupCollapse(type)"
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
                :data-node="node.name"
                :class="{
                  'node-hidden': hiddenNodes?.has(node.name),
                  'node-focused': focusedNode === node.name,
                  'search-highlight': isNodeHighlighted(node)
                }" 
                @click="handleNodeClick(node)"
              >
                <input 
                  type="checkbox" 
                  class="node-checkbox"
                  :checked="isTableSelected(node.name)"
                  @change="handleTableSelect(node.name, $event)"
                  @click.stop
                />
                <span 
                  class="node-type-indicator" 
                  :style="{ backgroundColor: getTableColor(node.type) }"
                ></span>
                <span 
                  class="node-name" 
                  v-html="highlightSearchText(node.name)"
                ></span>
                <span class="node-fields-count">
                  {{ getTableReferenceCount(node.name) }}
                </span>
              </div>
            </div>
          </div>
        </template>
        
        <template v-else>
          <div 
            v-for="node in filteredNodes" 
            :key="node.name" 
            class="node-list-item" 
            :data-node="node.name"
            :class="{
              'node-hidden': hiddenNodes?.has(node.name),
              'node-focused': focusedNode === node.name,
              'search-highlight': isNodeHighlighted(node)
            }" 
            @click="handleNodeClick(node)"
          >
            <input 
              type="checkbox" 
              class="node-checkbox"
              :checked="isTableSelected(node.name)"
              @change="handleTableSelect(node.name, $event)"
              @click.stop
            />
            <span 
              class="node-type-indicator" 
              :style="{ backgroundColor: getTableColor(node.type) }"
            ></span>
            <span 
              class="node-name" 
              v-html="highlightSearchText(node.name)"
            ></span>
            <span class="node-fields-count">
              {{ getTableReferenceCount(node.name) }}
            </span>
          </div>
        </template>
      </template>

      <!-- 字段模式 -->
      <template v-else>
        <div 
          v-for="field in filteredFields" 
          :key="`${field.tableName}.${field.fieldName}`" 
          class="node-list-item field-item"
          :class="{
            'search-highlight': isFieldHighlighted(field)
          }"
          @click="handleFieldClick(field)"
        >
          <input 
            type="checkbox" 
            class="node-checkbox"
            :checked="isFieldSelected(field.tableName, field.fieldName)"
            @change="handleFieldSelect(field.tableName, field.fieldName, $event)"
            @click.stop
          />
          <span class="field-table-name">{{ field.tableName }}</span>
          <span class="field-name">{{ field.fieldName }}</span>
          <span class="field-type">{{ field.fieldType }}</span>
          <span class="field-ref-count">{{ field.refCount }}</span>
        </div>
      </template>
    </div>

    <!-- 面板调整大小手柄 -->
    <div 
      v-show="!isMinimized" 
      class="resize-handle" 
      @mousedown="handleStartResize"
    ></div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue';

export default {
  name: 'ControlPanel',
  
  props: {
    // 是否最小化
    isMinimized: {
      type: Boolean,
      default: false
    },
    // 面板宽度
    panelWidth: {
      type: Number,
      default: 350
    },
    // 列表模式
    listMode: {
      type: String,
      default: 'table',
      validator: (value) => ['table', 'field'].includes(value)
    },
    // 节点搜索查询
    nodeSearchQuery: {
      type: String,
      default: ''
    },
    // 表类型配置
    tableTypes: {
      type: Array,
      default: () => []
    },
    // 选中的表类型
    selectedTableTypes: {
      type: Array,
      default: () => []
    },
    // 是否显示类型筛选
    showTypeFilter: {
      type: Boolean,
      default: false
    },
    // 是否按类型分组
    groupByType: {
      type: Boolean,
      default: true
    },
    // 分组折叠状态
    groupCollapseState: {
      type: Object,
      default: () => ({})
    },
    // 节点数据
    nodes: {
      type: Array,
      default: () => []
    },
    // 字段数据
    fields: {
      type: Array,
      default: () => []
    },
    // 隐藏的节点
    hiddenNodes: {
      type: Set,
      default: () => new Set()
    },
    // 焦点节点
    focusedNode: {
      type: String,
      default: null
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
    // 是否正在调整大小
    isResizing: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'update:isMinimized',
    'update:panelWidth',
    'update:listMode',
    'update:nodeSearchQuery',
    'update:selectedTableTypes',
    'update:showTypeFilter',
    'update:groupByType',
    'update:groupCollapseState',
    'node-search',
    'clear-node-search',
    'table-select',
    'field-select',
    'node-click',
    'field-click',
    'toggle-group-collapse',
    'start-resize'
  ],

  setup(props, { emit }) {
    // 本地状态
    const localNodeSearchQuery = ref(props.nodeSearchQuery);
    const localSelectedTableTypes = ref([...props.selectedTableTypes]);
    const localGroupByType = ref(props.groupByType);

    // 监听props变化
    watch(() => props.nodeSearchQuery, (newValue) => {
      if (newValue !== localNodeSearchQuery.value) {
        localNodeSearchQuery.value = newValue;
      }
    });

    watch(() => props.selectedTableTypes, (newValue) => {
      if (JSON.stringify(newValue) !== JSON.stringify(localSelectedTableTypes.value)) {
        localSelectedTableTypes.value = [...newValue];
      }
    });

    watch(() => props.groupByType, (newValue) => {
      if (newValue !== localGroupByType.value) {
        localGroupByType.value = newValue;
      }
    });

    // 计算属性
    const filteredNodes = computed(() => {
      let nodes = [...props.nodes];
      
      // 表类型筛选
      if (props.selectedTableTypes.length > 0) {
        nodes = nodes.filter(node => props.selectedTableTypes.includes(node.type));
      }

      // 搜索过滤
      if (localNodeSearchQuery.value) {
        const query = localNodeSearchQuery.value.toLowerCase();
        nodes = nodes.filter(node => 
          node.name.toLowerCase().includes(query)
        );
      }

      return nodes;
    });

    const filteredFields = computed(() => {
      let fields = [...props.fields];
      
      // 搜索过滤
      if (localNodeSearchQuery.value) {
        const query = localNodeSearchQuery.value.toLowerCase();
        fields = fields.filter(field => 
          field.tableName.toLowerCase().includes(query) ||
          field.fieldName.toLowerCase().includes(query)
        );
      }

      return fields;
    });

    const groupedNodes = computed(() => {
      const groups = {};
      
      filteredNodes.value.forEach(node => {
        if (!groups[node.type]) {
          groups[node.type] = [];
        }
        groups[node.type].push(node);
      });

      return groups;
    });

    // 方法
    const handleToggleMinimize = () => {
      emit('update:isMinimized', !props.isMinimized);
    };

    const handleNodeSearch = (event) => {
      const query = event.target.value;
      localNodeSearchQuery.value = query;
      emit('update:nodeSearchQuery', query);
      emit('node-search', query);
    };

    const handleClearNodeSearch = () => {
      localNodeSearchQuery.value = '';
      emit('update:nodeSearchQuery', '');
      emit('clear-node-search');
    };

    const handleListModeChange = (mode) => {
      emit('update:listMode', mode);
    };

    const handleToggleTypeFilter = () => {
      emit('update:showTypeFilter', !props.showTypeFilter);
    };

    const handleTableTypeChange = () => {
      emit('update:selectedTableTypes', [...localSelectedTableTypes.value]);
    };

    const handleSelectAllTypes = () => {
      const allTypes = props.tableTypes.map(type => type.type);
      localSelectedTableTypes.value = allTypes;
      emit('update:selectedTableTypes', allTypes);
    };

    const handleClearAllTypes = () => {
      localSelectedTableTypes.value = [];
      emit('update:selectedTableTypes', []);
    };

    const handleGroupByTypeChange = () => {
      emit('update:groupByType', localGroupByType.value);
    };

    const handleToggleGroupCollapse = (type) => {
      const newState = { ...props.groupCollapseState };
      newState[type] = !newState[type];
      emit('update:groupCollapseState', newState);
      emit('toggle-group-collapse', type);
    };

    const handleTableSelect = (tableName, event) => {
      const isSelected = event.target.checked;
      emit('table-select', { tableName, isSelected });
    };

    const handleFieldSelect = (tableName, fieldName, event) => {
      const isSelected = event.target.checked;
      emit('field-select', { tableName, fieldName, isSelected });
    };

    const handleNodeClick = (node) => {
      emit('node-click', node);
    };

    const handleFieldClick = (field) => {
      emit('field-click', field);
    };

    const handleStartResize = (event) => {
      emit('start-resize', event);
    };

    const isTableSelected = (tableName) => {
      return props.selectedTables.includes(tableName);
    };

    const isFieldSelected = (tableName, fieldName) => {
      return props.highlightedFields.some(
        field => field.tableName === tableName && field.fieldName === fieldName
      );
    };

    const isNodeHighlighted = (node) => {
      if (!localNodeSearchQuery.value) return false;
      return node.name.toLowerCase().includes(localNodeSearchQuery.value.toLowerCase());
    };

    const isFieldHighlighted = (field) => {
      if (!localNodeSearchQuery.value) return false;
      const query = localNodeSearchQuery.value.toLowerCase();
      return field.tableName.toLowerCase().includes(query) || 
             field.fieldName.toLowerCase().includes(query);
    };

    const isGroupCollapsed = (type) => {
      return props.groupCollapseState[type] || false;
    };

    const highlightSearchText = (text) => {
      if (!localNodeSearchQuery.value) return text;
      
      const query = localNodeSearchQuery.value;
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    const getTableColor = (type) => {
      const tableType = props.tableTypes.find(t => t.type === type);
      return tableType?.color || '#ccc';
    };

    const getTableTypeLabel = (type) => {
      const tableType = props.tableTypes.find(t => t.type === type);
      return tableType?.label || type;
    };

    const getTableReferenceCount = (tableName) => {
      // 这里需要根据实际的边数据计算，暂时返回占位符
      return 0;
    };

    return {
      // 本地状态
      localNodeSearchQuery,
      localSelectedTableTypes,
      localGroupByType,
      
      // 计算属性
      filteredNodes,
      filteredFields,
      groupedNodes,
      
      // 方法
      handleToggleMinimize,
      handleNodeSearch,
      handleClearNodeSearch,
      handleListModeChange,
      handleToggleTypeFilter,
      handleTableTypeChange,
      handleSelectAllTypes,
      handleClearAllTypes,
      handleGroupByTypeChange,
      handleToggleGroupCollapse,
      handleTableSelect,
      handleFieldSelect,
      handleNodeClick,
      handleFieldClick,
      handleStartResize,
      isTableSelected,
      isFieldSelected,
      isNodeHighlighted,
      isFieldHighlighted,
      isGroupCollapsed,
      highlightSearchText,
      getTableColor,
      getTableTypeLabel,
      getTableReferenceCount
    };
  }
};
</script>

<style scoped>
/* 控制面板样式 */
.node-list-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 350px;
  height: calc(100vh - 100px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.node-list-panel--minimized {
  width: 40px !important;
}

.panel-header {
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.panel-search {
  position: relative;
  margin-bottom: 12px;
}

.node-search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.node-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
}

.clear-search:hover {
  background: #dc2626;
  transform: translateY(-50%) scale(1.1);
}

.list-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
}

.list-toggle button {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.list-toggle button.active {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  color: #3b82f6;
}

.type-filter-section {
  margin-top: 12px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filter-title {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.toggle-filter-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
}

.filter-content {
  background: #f9fafb;
  border-radius: 6px;
  padding: 8px;
}

.type-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.type-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
}

.type-indicator {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.type-name {
  color: #374151;
}

.filter-actions {
  display: flex;
  gap: 6px;
}

.filter-action-btn {
  flex: 1;
  padding: 4px 8px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.group-toggle-section {
  margin-top: 8px;
}

.group-toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
}

.node-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.node-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  position: sticky;
  top: 0;
  z-index: 1;
}

.group-section {
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
}

.group-type-indicator {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.group-title {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.group-toggle-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
}

.node-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.node-list-item:hover {
  background: #f3f4f6;
}

.node-list-item.node-focused {
  background: #eff6ff;
  border: 1px solid #3b82f6;
}

.node-list-item.node-hidden {
  opacity: 0.5;
}

.node-list-item.search-highlight {
  background: #fef3c7;
}

.node-checkbox {
  width: 12px;
  height: 12px;
  accent-color: #3b82f6;
}

.node-type-indicator {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-fields-count {
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 字段模式特殊样式 */
.field-item {
  padding: 4px 8px;
}

.field-table-name {
  font-size: 10px;
  color: #6b7280;
  min-width: 60px;
}

.field-name {
  flex: 1;
  color: #1f2937;
  font-size: 11px;
}

.field-type {
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 40px;
  text-align: center;
}

.field-ref-count {
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 20px;
  text-align: center;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #e5e7eb;
  cursor: col-resize;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: #3b82f6;
}

/* 搜索高亮 */
:deep(mark) {
  background: #fef3c7;
  color: #92400e;
  padding: 1px 2px;
  border-radius: 2px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .node-list-panel {
    width: 300px;
    right: 10px;
    top: 60px;
    height: calc(100vh - 80px);
  }
}

@media (max-width: 768px) {
  .node-list-panel {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100% !important;
    height: 40vh;
    border-radius: 12px 12px 0 0;
  }
  
  .node-list-panel--minimized {
    height: 40px;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .node-list-panel {
    background: #1f2937;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .panel-header {
    background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
    border-bottom-color: #374151;
  }
  
  .panel-header h3 {
    color: #f9fafb;
  }
  
  .node-search-input {
    background: #111827;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .node-search-input:focus {
    border-color: #3b82f6;
  }
  
  .node-list-header {
    background: #374151;
    color: #d1d5db;
  }
  
  .group-header {
    background: #374151;
  }
  
  .group-title {
    color: #f3f4f6;
  }
  
  .filter-title {
    color: #d1d5db;
  }
  
  .filter-content {
    background: #374151;
  }
  
  .type-name {
    color: #f3f4f6;
  }
  
  .node-list-item {
    color: #f3f4f6;
  }
  
  .node-list-item:hover {
    background: #374151;
  }
  
  .node-list-item.node-focused {
    background: #1e3a8a;
    border-color: #3b82f6;
  }
  
  .node-name {
    color: #f9fafb;
  }
  
  .field-table-name,
  .field-type,
  .field-ref-count {
    color: #d1d5db;
    background: #374151;
  }
  
  .resize-handle {
    background: #4b5563;
  }
  
  .resize-handle:hover {
    background: #3b82f6;
  }
}
</style>