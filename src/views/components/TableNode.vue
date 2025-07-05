<template>
  <div 
    class="table-node" 
    :style="[setCoordinate, setColor(node.type, 8620)]"
    :class="{ 
      'table-node--disabled': isDisabled,
      'table-node--table-mode': isTableMode
    }"
    @mousedown.stop="handleMouseDown"
  >
    <!-- 表头：放置表名和复制按钮 -->
    <div 
      class="table-node-header"
      :style="setColor(node.type, 17)"
      :class="{ 'table-highlighted': isTableHighlighted }"
    >
      <div 
        :id="`${node.name}${minus}`" 
        class="table-node-name" 
        @click.stop="handleTableNameClick"
      >
        {{ node.name }}
      </div>
      <div class="header-buttons">
        <div 
          class="hide-node-btn"
          @click.stop="handleHideNode"
          title="隐藏节点"
        >
          <i class="hide-icon">👁️</i>
        </div>
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
        :class="{ 'field-highlighted': isFieldHighlighted(node.name, field.name) }"
        @click.stop="handleFieldClick(field.name)"
      >
        <div class="field-content">
          <span 
            class="field-name"
            :class="{ 'field-name--mismatched': hasFieldNameMismatch(field.name) }"
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
    highlightedFields: {
      type: Array,
      default: () => []
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
    }
  },
  data() {
    return {
      minus: '-',
    }
  },
  computed: {
    setCoordinate() {
      return {
        top: this.node.top + "px",
        left: this.node.left + "px",
      };
    },
    isTableHighlighted() {  // 新增：判断表是否被高亮
      return this.highlightedTables.includes(this.node.name);
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
    // 判断字段是否被高亮
    isFieldHighlighted(tableName, fieldName) {
      return this.highlightedFields.some(field => 
        field.tableName === tableName && field.fieldName === fieldName
      );
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
      
      // 复制表名到剪贴板
      this.copyToClipboard(this.node.name);
      
      if (this.isTableMode) {
        // 在表级模式下，触发表高亮事件
        this.$emit('table-highlight', {
          tableName: this.node.name
        });
      }
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
    // 处理字段点击事件
    handleFieldClick(fieldName, event) {
      if (this.isDisabled) {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        return;
      }
      this.$emit('field-click', {
        tableName: this.node.name,
        fieldName: fieldName
      });
    },
    // 处理复制字段事件
    handleCopyFields(event) {
      if (this.isDisabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      const fieldNames = this.node.fields.map(field => field.name).join('\n');
      navigator.clipboard.writeText(fieldNames).then(() => {
        this.$emit('copy-success', {
          message: `已复制 ${this.node.name} 的所有字段名`
        });
      }).catch(err => {
        console.error('复制失败:', err);
        this.$emit('copy-error', {
          message: '复制失败，请重试'
        });
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
  border: 2px solid #000;
  align-items: center;
  z-index: 9995;
  border-radius: 8px;
  background: #fff;
  min-width: 200px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;

  &--table-mode {
    border-radius: 12px;
    
    .table-node-header {
      border-radius: 12px;
      
      &.table-highlighted {
        font-size: 15px;
        font-weight: bold;
        transform: scale(1.02);
        transition: all 0.3s ease;
      }
    }
    
    .table-node-content {
      display: none;  // 在表级模式下隐藏字段内容
    }
  }

  .table-node-header {
    padding: 12px 16px;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      opacity: 0.9;
    }
    
    .table-node-name {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      margin-right: 8px;
      user-select: none;
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
    border-radius: 0 0 4px 4px;
    overflow: visible;
    
    .empty-fields-notice {
      padding: 12px;
      color: #999;
      text-align: center;
      font-size: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
   
    .field {
      padding: 6px 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: all 0.3s ease;

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
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          
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
          border-radius: 10px;
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

@keyframes fieldFocus {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 128, 20, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(239, 128, 20, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 128, 20, 0);
  }
}
</style>
