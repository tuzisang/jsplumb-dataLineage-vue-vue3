<template>
  <div class="json-exporter-container">
    <button
      class="export-btn"
      @click="handleExport"
      :disabled="isExporting"
      :title="exportTooltip"
    >
      <i class="export-icon">📄</i>
      <span v-if="!isExporting">{{ exportText }}</span>
      <span v-else>导出中...</span>
    </button>

    <!-- 导出选项弹窗 -->
    <div v-if="showOptions" class="export-options-modal" @click.self="closeOptions">
      <div class="options-content">
        <h3>JSON导出选项</h3>

        <div class="option-group">
          <label>导出内容：</label>
          <div class="checkbox-group">
            <label class="checkbox-option">
              <input type="checkbox" v-model="options.includeMetadata">
              <span>包含元数据</span>
            </label>
            <label class="checkbox-option">
              <input type="checkbox" v-model="options.includeStatistics">
              <span>包含统计信息</span>
            </label>
            <label class="checkbox-option">
              <input type="checkbox" v-model="options.includePositions">
              <span>包含节点位置</span>
            </label>
            <label class="checkbox-option">
              <input type="checkbox" v-model="options.includeHidden">
              <span>包含隐藏节点</span>
            </label>
          </div>
        </div>

        <div class="option-group">
          <label>JSON格式化：</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="options.format" value="pretty">
              <span>格式化（易读）</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="options.format" value="compact">
              <span>紧凑（小体积）</span>
            </label>
          </div>
        </div>

        <div class="option-group">
          <label>数据筛选：</label>
          <select v-model="options.dataFilter" class="filter-select">
            <option value="all">所有数据</option>
            <option value="visible">仅可见节点</option>
            <option value="selected">仅选中节点</option>
            <option value="critical">仅关键路径</option>
          </select>
        </div>

        <div class="option-actions">
          <button class="btn-cancel" @click="closeOptions">取消</button>
          <button class="btn-export" @click="confirmExport">确认导出</button>
        </div>
      </div>
    </div>

    <!-- 导出进度 -->
    <div v-if="isExporting" class="export-progress">
      <div class="progress-spinner"></div>
      <div class="progress-text">正在导出JSON数据...</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonExporter',
  props: {
    lineageData: {
      type: Object,
      required: true
    },
    sqlQuery: {
      type: String,
      default: ''
    },
    lineageLevel: {
      type: String,
      default: 'column'
    },
    sqlDialect: {
      type: String,
      default: 'default'
    },
    filterCtes: {
      type: Boolean,
      default: false
    },
    selectedTables: {
      type: Array,
      default: () => []
    },
    selectedFields: {
      type: Array,
      default: () => []
    },
    hiddenNodes: {
      type: Set,
      default: () => new Set()
    },
    showOnlyCriticalPath: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isExporting: false,
      showOptions: false,
      options: {
        includeMetadata: true,
        includeStatistics: true,
        includePositions: true,
        includeHidden: false,
        format: 'pretty',
        dataFilter: 'all'
      }
    }
  },
  computed: {
    exportText() {
      return '导出JSON'
    },
    exportTooltip() {
      return this.lineageLevel === 'table' ? '导出表级血缘关系JSON数据' : '导出列级血缘关系JSON数据'
    }
  },
  methods: {
    handleExport() {
      this.showOptions = true
    },
    closeOptions() {
      this.showOptions = false
    },
    async confirmExport() {
      this.showOptions = false
      this.isExporting = true

      try {
        await this.exportJson()
        this.$emit('success', 'JSON数据导出成功')
      } catch (error) {
        console.error('JSON导出失败:', error)
        let errorMessage = 'JSON导出失败，请重试'

        if (error.message.includes('血缘数据')) {
          errorMessage = '导出失败：未找到血缘数据，请先分析SQL查询'
        } else if (error.message.includes('用户取消')) {
          errorMessage = '用户取消导出'
        } else if (error.message.includes('序列化')) {
          errorMessage = '导出失败：数据格式错误'
        } else {
          errorMessage = `导出失败：${error.message}`
        }

        this.$emit('error', new Error(errorMessage))
      } finally {
        this.isExporting = false
      }
    },
    async exportJson() {
      try {
        // 验证输入数据
        if (!this.lineageData || !this.lineageData.nodes) {
          throw new Error('未找到血缘数据，请先分析SQL查询')
        }

        // 检查数据大小
        const estimatedSize = JSON.stringify(this.lineageData).length
        if (estimatedSize > 50 * 1024 * 1024) { // 50MB
          const confirmed = confirm('数据量较大，导出可能需要一些时间，是否继续？')
          if (!confirmed) {
            throw new Error('用户取消导出')
          }
        }

        // 构建导出数据
        const exportData = this.buildExportData()

        // 格式化JSON
        const jsonString = this.formatJson(exportData)

        // 创建并下载文件
        this.downloadJson(jsonString)

        // 触发成功事件
        this.$emit('success', { data: exportData, filename: this.getFilename() })
      } catch (error) {
        console.error('JSON导出处理失败:', error)
        throw error
      }
    },
    buildExportData() {
      const data = {}

      // 包含元数据
      if (this.options.includeMetadata) {
        data.metadata = this.buildMetadata()
      }

      // 包含统计信息
      if (this.options.includeStatistics) {
        data.statistics = this.buildStatistics()
      }

      // 过滤节点
      const filteredNodes = this.filterNodes()
      const filteredEdges = this.filterEdges(filteredNodes)

      // 处理节点数据
      data.nodes = filteredNodes
        .map(node => this.processNode(node))
        .filter(node => node !== null) // 过滤掉无效节点

      // 处理边数据
      data.edges = filteredEdges
        .map(edge => this.processEdge(edge))
        .filter(edge => edge !== null) // 过滤掉无效边

      return data
    },
    buildMetadata() {
      return {
        exportTime: new Date().toISOString(),
        sqlQuery: this.sqlQuery,
        lineageLevel: this.lineageLevel,
        sqlDialect: this.sqlDialect,
        filterCtes: this.filterCtes,
        version: '1.0.0',
        exportedBy: '血缘关系分析工具',
        description: `${this.lineageLevel === 'table' ? '表级' : '列级'}血缘关系数据`
      }
    },
    buildStatistics() {
      const nodes = this.lineageData.nodes || []
      const edges = this.lineageData.edges || []

      const sourceTables = nodes.filter(node => node.type === 'source').length
      const targetTables = nodes.filter(node => node.type === 'result').length
      const middleTables = nodes.filter(node => node.type === 'middle').length

      return {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        sourceTables,
        targetTables,
        middleTables,
        exportTime: new Date().toISOString()
      }
    },
    filterNodes() {
      let nodes = [...(this.lineageData.nodes || [])]

      // 根据数据筛选选项过滤节点
      switch (this.options.dataFilter) {
        case 'visible':
          if (this.hiddenNodes && this.hiddenNodes.size > 0) {
            nodes = nodes.filter(node => !this.hiddenNodes.has(node.name))
          }
          break
        case 'selected':
          if (this.lineageLevel === 'table' && this.selectedTables && this.selectedTables.length > 0) {
            nodes = nodes.filter(node => this.selectedTables.includes(node.name))
          } else if (this.lineageLevel === 'column' && this.selectedFields && this.selectedFields.length > 0) {
            // 列级模式下，包含选中字段所在的表
            const selectedTableNames = new Set(
              this.selectedFields.map(field => field.table)
            )
            nodes = nodes.filter(node => selectedTableNames.has(node.name))
          }
          break
        case 'critical':
          // 关键路径逻辑由父组件处理
          if (this.showOnlyCriticalPath) {
            if (this.lineageLevel === 'table' && this.selectedTables && this.selectedTables.length > 0) {
              nodes = nodes.filter(node => this.selectedTables.includes(node.name))
            }
            // 列级的关键路径过滤在processNode中处理
          }
          break
      }

      // 是否包含隐藏节点
      if (!this.options.includeHidden && this.hiddenNodes && this.hiddenNodes.size > 0) {
        nodes = nodes.filter(node => !this.hiddenNodes.has(node.name))
      }

      return nodes
    },
    filterEdges(filteredNodes) {
      const nodeNames = new Set(filteredNodes.map(node => node.name))
      const edges = this.lineageData.edges || []

      return edges.filter(edge => {
        if (!edge || !edge.source || !edge.target) {
          return false
        }

        const sourceTable = edge.source.table
        const targetTable = edge.target.table

        return nodeNames.has(sourceTable) && nodeNames.has(targetTable)
      })
    },
    processNode(node) {
      if (!node || !node.name) {
        return null
      }

      const processedNode = {
        id: node.id || node.name,
        name: node.name,
        type: node.type || 'unknown',
        level: node.level || 0
      }

      // 包含位置信息
      if (this.options.includePositions) {
        processedNode.position = {
          x: node.x || 0,
          y: node.y || 0
        }
        processedNode.size = {
          width: node.width || 200,
          height: node.height || 150
        }
      }

      // 包含字段信息
      if (node.fields && Array.isArray(node.fields) && node.fields.length > 0) {
        processedNode.fields = node.fields.map(field => ({
          name: field.name || '',
          type: field.type || 'normal',
          dataType: field.dataType || '',
          nullable: !!field.nullable,
          isPrimaryKey: !!field.isPrimaryKey,
          isForeignKey: !!field.isForeignKey
        })).filter(field => field.name) // 过滤掉没有名称的字段
      }

      // 可见性和选中状态
      processedNode.visible = !(this.hiddenNodes && this.hiddenNodes.has(node.name))
      processedNode.selected = this.lineageLevel === 'table' && this.selectedTables
        ? this.selectedTables.includes(node.name)
        : false

      return processedNode
    },
    processEdge(edge) {
      if (!edge || !edge.source || !edge.target) {
        return null
      }

      return {
        id: edge.id || `${edge.source.table || 'unknown'}.${edge.source.field || 'unknown'}-${edge.target.table || 'unknown'}.${edge.target.field || 'unknown'}`,
        source: {
          table: edge.source.table || 'unknown',
          field: edge.source.field || 'unknown'
        },
        target: {
          table: edge.target.table || 'unknown',
          field: edge.target.field || 'unknown'
        },
        type: edge.type || 'data_flow'
      }
    },
    formatJson(data) {
      if (this.options.format === 'compact') {
        return JSON.stringify(data)
      } else {
        return JSON.stringify(data, null, 2)
      }
    },
    downloadJson(jsonString) {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = this.getFilename()

      // 添加到DOM
      document.body.appendChild(link)
      link.click()

      // 完整清理
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)
    },
    getFilename() {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const levelText = this.lineageLevel === 'table' ? '表级' : '列级'
      const filterText = this.options.dataFilter !== 'all' ? `_${this.options.dataFilter}` : ''

      return `血缘关系数据_${levelText}${filterText}_${timestamp}.json`
    }
  }
}
</script>

<style scoped>
.json-exporter-container {
  display: inline-block;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(114, 46, 209, 0.2);
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(114, 46, 209, 0.3);
}

.export-btn:active:not(:disabled) {
  transform: translateY(0);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-icon {
  font-size: 16px;
}

.export-options-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.options-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.options-content h3 {
  margin: 0 0 20px 0;
  color: #262626;
  font-size: 18px;
}

.option-group {
  margin-bottom: 20px;
}

.option-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #595959;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.filter-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.option-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel,
.btn-export {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.btn-cancel {
  background: white;
  color: #595959;
}

.btn-cancel:hover {
  border-color: #722ed1;
  color: #722ed1;
}

.btn-export {
  background: #722ed1;
  color: white;
  border-color: #722ed1;
}

.btn-export:hover {
  background: #9254de;
  border-color: #9254de;
}

.export-progress {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 10001;
  text-align: center;
  min-width: 250px;
}

.progress-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #722ed1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-text {
  font-size: 16px;
  color: #595959;
  font-weight: 500;
}
</style>