<template>
  <div class="sql-container">
    <!-- 最小化按钮单独放置 -->
    <button 
      class="minimize-btn modern" 
      @click="handleToggleMinimize" 
      :title="isMinimized ? '展开' : '最小化'"
    >
      <svg v-if="isMinimized" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <textarea 
            v-model="localSqlQuery" 
            placeholder="请输入 SQL 查询语句..." 
            class="sql-textarea compact"
            @input="handleSqlInput"
          ></textarea>
          <button 
            v-if="localSqlQuery.trim()" 
            class="clear-sql-btn" 
            @click="handleClearSql" 
            title="清空 SQL"
          >
            <span class="clear-icon">✕</span>
          </button>
        </div>
        
        <div class="sql-actions compact">
          <div class="sql-options compact">
            <!-- 血缘分析级别选择 -->
            <div class="lineage-level-selector compact">
              <span class="option-label">血缘分析级别：</span>
              <label class="radio-label">
                <input 
                  type="radio" 
                  :value="LineageLevel.TABLE" 
                  v-model="localLineageLevel"
                  @change="handleLineageLevelChange"
                >
                <span class="radio-text">表级</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  :value="LineageLevel.COLUMN" 
                  v-model="localLineageLevel"
                  @change="handleLineageLevelChange"
                >
                <span class="radio-text">列级</span>
              </label>
            </div>

            <!-- SQL 方言选择 -->
            <div class="sql-dialect-selector compact">
              <span class="option-label">SQL 方言：</span>
              <select 
                v-model="localSqlDialect" 
                class="dialect-select"
                @change="handleSqlDialectChange"
              >
                <option :value="SqlDialect.DEFAULT">默认 (ansi)</option>
                <option :value="SqlDialect.MYSQL">MySQL</option>
                <option :value="SqlDialect.POSTGRESQL">PostgreSQL</option>
                <option :value="SqlDialect.SPARKSQL">SparkSQL</option>
                <option :value="SqlDialect.HIVE">Hive</option>
                <option :value="SqlDialect.SQLITE">SQLite</option>
                <option :value="SqlDialect.ORACLE">Oracle</option>
                <option :value="SqlDialect.TSQL">SQL Server</option>
              </select>
            </div>

            <!-- 仅显示物理表选项 -->
            <label class="option-label compact">
              <input 
                type="checkbox" 
                v-model="localFilterCtes"
                @change="handleFilterCtesChange"
              >
              <span class="option-text">仅显示物理表</span>
            </label>
          </div>
          
          <div class="sql-buttons">
            <label class="upload-btn compact">
              <input 
                type="file" 
                accept=".txt,.sql" 
                @change="handleFileUpload" 
                style="display: none;"
              >
              📁 上传SQL文件
            </label>
            <button 
              class="analyze-btn compact" 
              @click="handleAnalyzeSql" 
              :disabled="!localSqlQuery.trim() || isAnalyzing"
            >
              {{ isAnalyzing ? '分析中...' : '分析血缘关系' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue';
import { LineageLevel, SqlDialect } from '../../types/index.js';

export default {
  name: 'SqlInputPanel',
  
  props: {
    // SQL查询语句
    modelValue: {
      type: String,
      default: ''
    },
    // 血缘分析级别
    lineageLevel: {
      type: String,
      default: LineageLevel.COLUMN,
      validator: (value) => Object.values(LineageLevel).includes(value)
    },
    // SQL方言
    sqlDialect: {
      type: String,
      default: SqlDialect.DEFAULT,
      validator: (value) => Object.values(SqlDialect).includes(value)
    },
    // 是否过滤CTE
    filterCtes: {
      type: Boolean,
      default: false
    },
    // 是否正在分析
    isAnalyzing: {
      type: Boolean,
      default: false
    },
    // 是否最小化
    isMinimized: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'update:modelValue',
    'update:lineageLevel', 
    'update:sqlDialect',
    'update:filterCtes',
    'update:isMinimized',
    'analyze-sql',
    'clear-sql',
    'file-upload',
    'sql-input'
  ],

  setup(props, { emit }) {
    // 本地状态
    const localSqlQuery = ref(props.modelValue);
    const localLineageLevel = ref(props.lineageLevel);
    const localSqlDialect = ref(props.sqlDialect);
    const localFilterCtes = ref(props.filterCtes);

    // 监听props变化并更新本地状态
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== localSqlQuery.value) {
        localSqlQuery.value = newValue;
      }
    });

    watch(() => props.lineageLevel, (newValue) => {
      if (newValue !== localLineageLevel.value) {
        localLineageLevel.value = newValue;
      }
    });

    watch(() => props.sqlDialect, (newValue) => {
      if (newValue !== localSqlDialect.value) {
        localSqlDialect.value = newValue;
      }
    });

    watch(() => props.filterCtes, (newValue) => {
      if (newValue !== localFilterCtes.value) {
        localFilterCtes.value = newValue;
      }
    });

    // 事件处理方法
    const handleSqlInput = (event) => {
      const value = event.target.value;
      localSqlQuery.value = value;
      emit('update:modelValue', value);
      emit('sql-input', value);
    };

    const handleLineageLevelChange = () => {
      emit('update:lineageLevel', localLineageLevel.value);
    };

    const handleSqlDialectChange = () => {
      emit('update:sqlDialect', localSqlDialect.value);
    };

    const handleFilterCtesChange = () => {
      emit('update:filterCtes', localFilterCtes.value);
    };

    const handleToggleMinimize = () => {
      emit('update:isMinimized', !props.isMinimized);
    };

    const handleClearSql = () => {
      localSqlQuery.value = '';
      emit('update:modelValue', '');
      emit('clear-sql');
    };

    const handleAnalyzeSql = () => {
      if (!localSqlQuery.value.trim()) {
        return;
      }
      emit('analyze-sql');
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        emit('file-upload', file);
      }
    };

    return {
      // 枚举值
      LineageLevel,
      SqlDialect,
      
      // 本地状态
      localSqlQuery,
      localLineageLevel,
      localSqlDialect,
      localFilterCtes,
      
      // 事件处理方法
      handleSqlInput,
      handleLineageLevelChange,
      handleSqlDialectChange,
      handleFilterCtesChange,
      handleToggleMinimize,
      handleClearSql,
      handleAnalyzeSql,
      handleFileUpload
    };
  }
};
</script>

<style scoped>
/* SQL输入面板样式 */
.sql-container {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.minimize-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.minimize-btn:hover {
  background: rgba(24, 144, 255, 0.1);
  border-color: #1890ff;
  transform: scale(1.05);
}

.sql-panel {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sql-panel--minimized {
  height: 40px;
}

.sql-editor {
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.sql-textarea-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.sql-textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.2s ease;
  background: white;
}

.sql-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
  background: #ffffff;
}

.sql-textarea.compact {
  min-height: 60px;
  font-size: 12px;
}

.clear-sql-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.clear-sql-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.clear-icon {
  line-height: 1;
}

.sql-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.sql-actions.compact {
  gap: 12px;
}

.sql-options {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.sql-options.compact {
  gap: 12px;
}

.lineage-level-selector,
.sql-dialect-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.option-label:hover {
  color: #1890ff;
}

.option-text {
  user-select: none;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-label:hover {
  color: #1890ff;
}

.radio-label input[type="radio"] {
  margin: 0;
  accent-color: #1890ff;
}

.radio-text {
  font-size: 12px;
  color: #333;
  user-select: none;
}

.dialect-select {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialect-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.sql-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  white-space: nowrap;
}

.upload-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.upload-btn.compact {
  padding: 6px 12px;
  font-size: 11px;
}

.analyze-btn {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.analyze-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.analyze-btn:active:not(:disabled) {
  transform: translateY(0);
}

.analyze-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.analyze-btn.compact {
  padding: 6px 16px;
  font-size: 11px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sql-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .sql-options {
    justify-content: center;
  }
  
  .sql-buttons {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .sql-editor {
    padding: 12px;
  }
  
  .sql-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .sql-buttons {
    flex-direction: column;
  }
  
  .upload-btn,
  .analyze-btn {
    width: 100%;
    justify-content: center;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .sql-container {
    background: #1f2937;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  
  .sql-editor {
    background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  }
  
  .sql-textarea {
    background: #111827;
    border-color: #374151;
    color: #f9fafb;
  }
  
  .sql-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .option-label {
    color: #d1d5db;
  }
  
  .radio-text {
    color: #f3f4f6;
  }
  
  .dialect-select {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
}
</style>