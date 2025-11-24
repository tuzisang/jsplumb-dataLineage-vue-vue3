import { ref, reactive } from 'vue'
import type { 
  LineageData, 
  LineageAnalysisRequest, 
  LineageAnalysisResponse,
  AnalysisConfig,
  LineageLevel,
  SqlDialect 
} from '@/types'

export function useLineageAnalysis() {
  // 分析状态
  const isAnalyzing = ref(false)
  const analysisResult = ref<LineageData | null>(null)
  const analysisError = ref<string | null>(null)
  
  // 分析配置
  const config = reactive<AnalysisConfig>({
    sqlQuery: '',
    lineageLevel: LineageLevel.COLUMN,
    filterCtes: false,
    sqlDialect: SqlDialect.DEFAULT
  })

  // 分析SQL血缘关系
  const analyzeSql = async (sqlQuery?: string): Promise<LineageData | null> => {
    if (!sqlQuery && !config.sqlQuery) {
      analysisError.value = '请输入SQL查询语句'
      return null
    }

    isAnalyzing.value = true
    analysisError.value = null

    try {
      const finalSqlQuery = sqlQuery || config.sqlQuery
      const apiUrl = import.meta.env.VITE_API_URL || '/api/lineage'
      
      const requestData: LineageAnalysisRequest = {
        sql_query: finalSqlQuery,
        filter_ctes: config.filterCtes,
        lineage_level: config.lineageLevel,
        sql_dialect: config.sqlDialect
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data: LineageAnalysisResponse = await response.json()

      if (response.ok) {
        analysisResult.value = {
          nodes: data.nodes || [],
          edges: data.edges || [],
          layout: data.layout,
          stats: data.stats
        }
        return analysisResult.value
      } else {
        throw new Error(data.error || '分析失败')
      }
    } catch (error) {
      console.error('Error analyzing SQL:', error)
      const errorMessage = error instanceof Error ? error.message : '分析过程中发生错误'
      analysisError.value = errorMessage
      return null
    } finally {
      isAnalyzing.value = false
    }
  }

  // 更新分析配置
  const updateConfig = (newConfig: Partial<AnalysisConfig>) => {
    Object.assign(config, newConfig)
  }

  // 重置分析状态
  const resetAnalysis = () => {
    isAnalyzing.value = false
    analysisResult.value = null
    analysisError.value = null
  }

  // 清除错误信息
  const clearError = () => {
    analysisError.value = null
  }

  // 处理文件上传
  const handleFileUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const content = event.target?.result as string
        config.sqlQuery = content
        resolve(content)
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsText(file, 'utf-8')
    })
  }

  // 验证SQL查询
  const validateSqlQuery = (sql: string): boolean => {
    if (!sql || !sql.trim()) {
      return false
    }

    // 基本验证
    const trimmedSql = sql.trim()
    if (trimmedSql.length < 10) {
      analysisError.value = 'SQL查询语句太短'
      return false
    }

    if (trimmedSql.length > 100000) {
      analysisError.value = 'SQL查询语句太长（超过100KB）'
      return false
    }

    // 检查危险关键词（可根据需要调整）
    const dangerousKeywords = [
      'DROP\\s+DATABASE',
      'DROP\\s+TABLE',
      'DELETE\\s+FROM',
      'UPDATE\\s+.*\\s+SET',
      'TRUNCATE\\s+TABLE',
      'ALTER\\s+DATABASE',
      'ALTER\\s+TABLE',
      'CREATE\\s+DATABASE',
      'CREATE\\s+TABLE'
    ]

    const normalizedSql = trimmedSql.toUpperCase()
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(keyword, 'i')
      if (regex.test(normalizedSql)) {
        analysisError.value = `包含不安全的SQL操作: ${keyword.replace(/\\\\s/g, ' ')}`
        return false
      }
    }

    return true
  }

  // 检测SQL方言
  const detectSqlDialect = (sql: string): SqlDialect => {
    if (!sql) return SqlDialect.DEFAULT

    const normalizedSql = sql.toLowerCase()

    // MySQL检测
    if (normalizedSql.includes('`') || 
        normalizedSql.includes('limit') || 
        normalizedSql.includes('auto_increment')) {
      return SqlDialect.MYSQL
    }

    // PostgreSQL检测
    if (normalizedSql.includes('::') || 
        normalizedSql.includes('serial') || 
        normalizedSql.includes('array[')) {
      return SqlDialect.POSTGRESQL
    }

    // Hive/SparkSQL检测
    if (normalizedSql.includes('from ') && 
        (normalizedSql.includes('cluster by') || 
         normalizedSql.includes('distribute by') ||
         normalizedSql.includes('row_format'))) {
      return normalizedSql.includes('spark') ? SqlDialect.SPARKSQL : SqlDialect.HIVE
    }

    // SQLite检测
    if (normalizedSql.includes('sqlite_') || 
        normalizedSql.includes('autoincrement')) {
      return SqlDialect.SQLITE
    }

    // Oracle检测
    if (normalizedSql.includes('from dual') || 
        normalizedSql.includes('rownum') ||
        normalizedSql.includes('sysdate')) {
      return SqlDialect.ORACLE
    }

    // SQL Server检测
    if (normalizedSql.includes('top ') || 
        normalizedSql.includes('identity(') ||
        normalizedSql.includes('getdate()')) {
      return SqlDialect.TSQL
    }

    return SqlDialect.DEFAULT
  }

  // 自动检测并设置SQL方言
  const autoDetectSqlDialect = () => {
    if (config.sqlQuery) {
      const detectedDialect = detectSqlDialect(config.sqlQuery)
      if (detectedDialect !== config.sqlDialect) {
        config.sqlDialect = detectedDialect
      }
    }
  }

  return {
    // 响应式状态
    isAnalyzing,
    analysisResult,
    analysisError,
    config,

    // 方法
    analyzeSql,
    updateConfig,
    resetAnalysis,
    clearError,
    handleFileUpload,
    validateSqlQuery,
    detectSqlDialect,
    autoDetectSqlDialect
  }
}