<template>
  <div 
    :id="node.name"
    class="table-node" 
    :style="[setCoordinate, setColor(node.type, 8620)]"
    :class="{ 
      'table-node--disabled': isDisabled,
      'table-node--table-mode': isTableMode,
      'table-node--focused': isFocused
    }"
    @mousedown.stop="handleMouseDown"
  >
    <!-- 表头：放置表名和复制按钮 -->
    <div 
      class="table-node-header"
      :style="setColor(node.type, 17)"
      :class="{ 'table-highlighted': isTableHighlighted }"
    >
      <div class="header-left">
        <input 
          type="checkbox" 
          class="table-checkbox"
          :checked="isTableSelected"
          @change="handleTableSelect"
          @click.stop
        />
        <div 
          :id="`${node.name}${minus}`" 
          class="table-node-name" 
          @click.stop="handleTableNameClick"
        >
          {{ node.name }}
        </div>
      </div>
      <div class="header-buttons">
        <!-- 隐藏节点按钮 - 已隐藏 -->
        <!-- <div 
          class="hide-node-btn"
          @click.stop="handleHideNode"
          title="隐藏节点"
        >
          <i class="hide-icon">👁️</i>
        </div> -->
        <div 
          v-if="!isTableMode && node.fields && node.fields.length > 0"
          class="copy-fields-btn"
          @click.stop="handleCopyFields"
          title="复制所有字段名"
        >
          <i class="copy-icon">📋</i>
        </div>
      </div>
    </div>
    <!-- 表域：放置表字段 -->
    <div 
      v-if="!isTableMode"
      :id="`${node.name}${minus}fields`" 
      class="table-node-fields"
    >
      <div v-if="node.fields && node.fields.length === 0" class="empty-fields-notice">
        暂无字段信息
      </div>
      <div
        v-else
        v-for="field in node.fields"
        :id="`${node.name}${minus}${field.name}`"
        :key="`${node.name}${minus}${field.name}`"
        class="field"
        :class="{ 'field-highlighted': isFieldSelected(node.name, field.name) }"
      >
        <div class="field-content">
          <input 
            type="checkbox" 
            class="field-checkbox"
            :checked="isFieldActuallySelected(node.name, field.name)"
            @change="handleFieldSelect(field.name, $event)"
            @click.stop
          />
          <span 
            class="field-name"
            :class="{ 'field-name--mismatched': hasFieldNameMismatch(field.name) }"
            @click.stop="copyToClipboard(field.name)"
            title="点击复制字段名"
          >
            {{ field.name }}
          </span>
          <span v-if="node.type === 'Origin' && getFieldReferenceCount(field.name)" class="field-ref-count source-ref">
            {{ getFieldReferenceCount(field.name) }}
          </span>
          <span v-if="node.type !== 'Origin' && getFieldSourceCount(field.name)" class="field-ref-count target-ref">
            {{ getFieldSourceCount(field.name) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import colorFields from "../config/tableTypeMappingColor";

export default {
  name: "TableNode",
  props: {
    node: {
      type: Object,
      required: true
    },

    isDisabled: {
      type: Boolean,
      default: false
    },
    edges: {
      type: Array,
      default: () => []
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    isTableMode: {  // 新增：是否为表级分析模式
      type: Boolean,
      default: false
    },
    highlightedTables: {  // 新增：高亮的表名列表
      type: Array,
      default: () => []
    },
    selectedTables: {  // 新增：选中的表名列表
      type: Array,
      default: () => []
    },
    selectedFields: { // 新增：选中的字段列表
      type: Array,
      default: () => []
    },
    highlightedFields: { // 新增：高亮的相关字段列表
      type: Array,
      default: () => []
    },
    focusedNode: {
      type: String,
      default: ''
    },
    minus: {
      type: String,
      default: '_'
    }
  },
  data() {
    return {
      // 移除了重复定义的minus属性
    }
  },
  computed: {
    // 检查当前节点是否被聚焦
    isFocused() {
      return this.focusedNode === this.node.name;
    },
    // 检查表是否被高亮
    isTableHighlighted() {
      return this.highlightedTables.includes(this.node.name);
    },
    // 检查表是否被选中
    isTableSelected() {
      return this.selectedTables && this.selectedTables.includes(this.node.name);
    },
    setCoordinate() {
      return {
        top: this.node.top + "px",
        left: this.node.left + "px",
      };
    }
  },
  methods: {
    // 设置TableNode颜色
    setColor(t, flag) {
      for (let item in colorFields) {
        if (t === colorFields[item].type) {
          if ((flag & 1) === 0) {
            return {
              border: colorFields[item].color,
              borderStyle: 'solid',
              borderWidth: '2px',
            }
          } else {
            return {
              backgroundColor: colorFields[item].color
            }
          }
        }
      }
      return {}; // Return empty object if no match found
    },

    // 判断字段是否被高亮显示
    isFieldSelected(tableName, fieldName) {
      if (!this.highlightedFields || !Array.isArray(this.highlightedFields)) {
        return false;
      }
      
      return this.highlightedFields.some(field => 
        field.tableName === tableName && field.fieldName === fieldName
      );
    },

    // 判断字段是否被实际选中（用于复选框状态）
    isFieldActuallySelected(tableName, fieldName) {
      if (!this.selectedFields || !Array.isArray(this.selectedFields)) {
        return false;
      }
      
      return this.selectedFields.some(field => 
        field.tableName === tableName && field.fieldName === fieldName
      );
    },
    // 处理字段选择事件
    handleFieldSelect(fieldName, event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      this.$emit('field-select', {
        tableName: this.node.name,
        fieldName: fieldName,
        isSelected: event.target.checked
      });
    },
    // 处理鼠标按下事件
    handleMouseDown(event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
    },
    // 修改表名点击事件处理
    handleTableNameClick(event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      
      // 复制表名到剪贴板并触发表名点击事件
      this.copyToClipboard(this.node.name);
      
      // 无论是否为表级模式，都触发表名点击事件
      this.$emit('table-name-click', {
        tableName: this.node.name
      });
    },
    // 新增：复制到剪贴板的方法
    copyToClipboard(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.$emit('copy-success', {
            message: `表名 "${text}" 已复制到剪贴板`
          });
        }).catch(err => {
          console.error('复制失败:', err);
          this.fallbackCopyToClipboard(text);
        });
      } else {
        this.fallbackCopyToClipboard(text);
      }
    },
    // 新增：备用复制方法
    fallbackCopyToClipboard(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.$emit('copy-success', {
          message: `表名 "${text}" 已复制到剪贴板`
        });
      } catch (err) {
        console.error('复制失败:', err);
        this.$emit('copy-error', {
          message: '复制失败，请重试'
        });
      }
      document.body.removeChild(textArea);
    },

    // 处理复制字段事件
    handleCopyFields(event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      const fieldNames = this.node.fields.map(field => field.name).join('\n');
      
      // 触发复制字段事件
      this.$emit('copy-fields', {
        tableName: this.node.name,
        fieldNames: fieldNames
      });
    },
    // Get reference count for a source field (how many target fields reference it)
    getFieldReferenceCount(fieldName) {
      if (!this.edges || !Array.isArray(this.edges)) {
        return 0;
      }
      return this.edges.filter(edge => 
        edge.from.name === this.node.name && 
        edge.from.field === fieldName
      ).length;
    },
    // Get source count for a target field (how many source fields it references)
    getFieldSourceCount(fieldName) {
      if (!this.edges || !Array.isArray(this.edges)) {
        return 0;
      }
      return this.edges.filter(edge => 
        edge.to.name === this.node.name && 
        edge.to.field === fieldName
      ).length;
    },
    // 处理隐藏节点
    handleHideNode(event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      this.$emit('hide-node', {
        tableName: this.node.name,
        isHidden: !this.isHidden
      });
    },
    // 处理表选择
    handleTableSelect(event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      this.$emit('table-select', {
        tableName: this.node.name,
        isSelected: event.target.checked
      });
    },
    // 检查字段名是否存在不完全匹配
    hasFieldNameMismatch(fieldName) {
      // 如果是源表，检查所有引用这个字段的目标字段
      if (this.node.type === 'Origin') {
        return this.edges.some(edge => 
          edge.from.name === this.node.name && 
          edge.from.field === fieldName &&
          edge.from.field !== edge.to.field
        );
      }
      // 如果是目标表，检查所有被这个字段引用的源字段
      else {
        return this.edges.some(edge => 
          edge.to.name === this.node.name && 
          edge.to.field === fieldName &&
          edge.from.field !== edge.to.field
        );
      }
    }
  }
};
</script>

<style lang="less" scoped>
.table-node {
  position: absolute;
  cursor: move;
  border: 1.5px solid;
  align-items: center;
  z-index: 9995;
  background: #fff;
  min-width: fit-content;
  width: auto;
  max-width: none;
  border-radius: 16px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  contain: layout style paint;
  transform: translate3d(0, 0, 0);
  will-change: transform, box-shadow;
  backdrop-filter: blur(10px);
  
  &:hover:not(.dragging) {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 
      0 10px 25px rgba(0, 0, 0, 0.15),
      0 4px 10px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(139, 92, 246, 0.3);
  }
  
  &:active:not(.dragging) {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 
      0 6px 20px rgba(0, 0, 0, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  &.dragging {
    transition: none !important;
    transform: translate3d(var(--drag-x, 0), var(--drag-y, 0), 0);
    z-index: 10000;
    cursor: grabbing;
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.15);
  }

  &--table-mode {
    .table-node-header {
      &.table-highlighted {
        font-size: 15px;
        font-weight: bold;
        box-shadow: 0 0 20px rgba(24, 144, 255, 0.6), 0 0 40px rgba(24, 144, 255, 0.4), 0 0 60px rgba(24, 144, 255, 0.2);
        border-color: #1890ff;
        animation: table-highlight-glow 2s ease-in-out infinite alternate;
      }
    }
    
    .table-node-content {
      display: none;  // 在表级模式下隐藏字段内容
    }
  }

  &--focused {
    // 保持原有样式，主画布高亮由Index.scss中的.main-node-focus处理
  }

  .table-node-header {
    padding: 8px 48px 8px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    width: auto;
    min-width: fit-content;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      overflow: visible;
      max-width: none;
    }
    
    .table-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
      flex-shrink: 0;
      margin: 0;
      appearance: none;
      background-color: rgba(255, 255, 255, 0.2);
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      border-radius: 3px;
      position: relative;
      transition: all 0.2s ease;
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.1);
      }
      
      &:checked {
        background-color: rgba(255, 255, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.9);
      }
      
      &:checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #4f46e5;
        font-size: 12px;
        font-weight: bold;
        line-height: 1;
      }
    }
    
    .table-node-name {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      user-select: none;
      overflow: visible;
      text-overflow: clip;
      white-space: nowrap;
      word-break: normal;
      max-width: none;
      width: auto;
      min-width: max-content;
      display: inline-block;
    }
    
    .header-buttons {
      display: flex;
      gap: 8px;
      
      .hide-node-btn {
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .hide-icon {
          font-size: 14px;
          color: #fff;
        }
      }
    }
  }

  .table-node-fields {
    background-color: #fff;
    overflow: visible;
    width: auto;
    min-width: fit-content;
    
    .empty-fields-notice {
      padding: 12px;
      color: #999;
      text-align: center;
      font-size: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
   
    .field {
      padding: 6px 48px 6px 32px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: all 0.3s ease;
      width: auto;
      min-width: fit-content;
      white-space: nowrap;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: #f8f9fa;
      }
      
      &.field-highlighted {
        background-color: #fff3e0;
        color: #ff5722;
        font-weight: 500;
        
        &:hover {
          background-color: #ffe0b2;
        }
      }

      // 添加聚焦动画
      &.field-focus-animation {
        animation: fieldFocus 1s ease;
      }

      .field-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        .field-name {
          flex: 1;
          min-width: max-content;
          overflow: visible;
          text-overflow: clip;
          white-space: nowrap;
          word-break: normal;
          max-width: none;
          display: inline-block;
          
          &--mismatched {
            color: #1976d2;
            font-weight: 500;
            
            &::after {
              content: '*';
              color: #1976d2;
              margin-left: 2px;
            }
          }
        }

        .field-ref-count {
          margin-left: 8px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 500;
          min-width: 20px;
          text-align: center;

          &.source-ref {
            background-color: #e9ecef;
            color: #495057;
          }

          &.target-ref {
            background-color: #e3f2fd;
            color: #1976d2;
          }
        }
      }
    }
  }

  &--disabled {
    pointer-events: none;
    cursor: default;
    opacity: 0.5;

    .table-node-name,
    .hide-node-btn,
    .copy-fields-btn,
    .field {
      cursor: default;
      
      &:hover {
        opacity: 1;
        background-color: inherit;
      }
    }
  }
}

/* 表高亮动画 */
@keyframes table-highlight-glow {
  0% {
    box-shadow: 0 0 20px rgba(24, 144, 255, 0.6), 0 0 40px rgba(24, 144, 255, 0.4), 0 0 60px rgba(24, 144, 255, 0.2);
    border-color: #1890ff;
  }
  100% {
    box-shadow: 0 0 30px rgba(24, 144, 255, 0.8), 0 0 60px rgba(24, 144, 255, 0.6), 0 0 90px rgba(24, 144, 255, 0.4);
    border-color: #40a9ff;
  }
}

</style>
