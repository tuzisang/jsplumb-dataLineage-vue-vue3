import { ref, reactive, computed } from 'vue'
import type { LineageNode, LineageEdge } from '@/types'

export function useNodeVisibility() {
  // 节点可见性状态
  const hiddenNodes = ref(new Set<string>())
  const criticalPathNodes = ref(new Set<string>())
  const relatedTableNames = ref(new Set<string>())
  const searchQuery = ref('')

  // 节点列表（按类型分组）
  const nodesByType = reactive<Record<string, LineageNode[]>>({})

  // 过滤条件
  const selectedTableTypes = ref<string[]>([])
  const groupByType = ref(true)

  // 计算属性：过滤后的节点
  const filteredNodes = computed(() => {
    let allNodes: LineageNode[] = []
    
    // 合并所有类型的节点
    Object.values(nodesByType).forEach(nodes => {
      allNodes = allNodes.concat(nodes)
    })

    return allNodes.filter(node => {
      // 检查是否被隐藏
      if (hiddenNodes.value.has(node.name)) {
        return false
      }

      // 检查表类型筛选
      if (selectedTableTypes.value.length > 0 && 
          !selectedTableTypes.value.includes(node.type)) {
        return false
      }

      // 检查搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        return node.name.toLowerCase().includes(query)
      }

      return true
    })
  })

  // 计算属性：分组后的节点
  const groupedNodes = computed(() => {
    if (!groupByType.value) {
      return { all: filteredNodes.value }
    }

    const groups: Record<string, LineageNode[]> = {}
    filteredNodes.value.forEach(node => {
      if (!groups[node.type]) {
        groups[node.type] = []
      }
      groups[node.type].push(node)
    })
    return groups
  })

  // 更新节点数据
  const updateNodes = (nodes: LineageNode[]) => {
    // 清空现有数据
    Object.keys(nodesByType).forEach(key => {
      delete nodesByType[key]
    })

    // 按类型分组节点
    nodes.forEach(node => {
      if (!nodesByType[node.type]) {
        nodesByType[node.type] = []
      }
      nodesByType[node.type].push(node)
    })
  }

  // 切换节点可见性
  const toggleNodeVisibility = (nodeName: string) => {
    if (hiddenNodes.value.has(nodeName)) {
      hiddenNodes.value.delete(nodeName)
    } else {
      hiddenNodes.value.add(nodeName)
    }
  }

  // 显示所有节点
  const showAllNodes = () => {
    hiddenNodes.value.clear()
  }

  // 隐藏所有节点
  const hideAllNodes = () => {
    const allNodes: LineageNode[] = []
    Object.values(nodesByType).forEach(nodes => {
      allNodes.push(...nodes)
    })
    allNodes.forEach(node => {
      hiddenNodes.value.add(node.name)
    })
  }

  // 根据搜索查询过滤节点
  const filterNodesBySearch = (query: string) => {
    searchQuery.value = query.toLowerCase()
  }

  // 清除搜索过滤
  const clearSearchFilter = () => {
    searchQuery.value = ''
  }

  // 更新表类型筛选
  const updateTableTypeFilter = (types: string[]) => {
    selectedTableTypes.value = [...types]
  }

  // 选择所有表类型
  const selectAllTableTypes = () => {
    const allTypes = Object.keys(nodesByType)
    selectedTableTypes.value = [...allTypes]
  }

  // 清除表类型筛选
  const clearTableTypeFilter = () => {
    selectedTableTypes.value = []
  }

  // 切换分组模式
  const toggleGroupByType = () => {
    groupByType.value = !groupByType.value
  }

  // 计算关键路径
  const calculateCriticalPath = (nodes: LineageNode[], edges: LineageEdge[], startNode?: string) => {
    criticalPathNodes.value.clear()
    relatedTableNames.value.clear()

    if (nodes.length === 0 || edges.length === 0) {
      return
    }

    // 如果指定了起始节点，从该节点开始计算
    if (startNode) {
      const visited = new Set<string>()
      const queue = [startNode]

      // BFS遍历，收集所有相关表
      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current)) continue
        visited.add(current)
        criticalPathNodes.value.add(current)

        // 查找上游表
        edges.forEach(edge => {
          if (edge.to.name === current && !visited.has(edge.from.name)) {
            queue.push(edge.from.name)
            relatedTableNames.value.add(edge.from.name)
          }
        })

        // 查找下游表
        edges.forEach(edge => {
          if (edge.from.name === current && !visited.has(edge.to.name)) {
            queue.push(edge.to.name)
            relatedTableNames.value.add(edge.to.name)
          }
        })
      }
    } else {
      // 如果没有指定起始节点，将所有节点都加入关键路径
      nodes.forEach(node => {
        criticalPathNodes.value.add(node.name)
      })
    }
  }

  // 仅显示关键路径
  const showOnlyCriticalPath = (nodes: LineageNode[], edges: LineageEdge[], startNode?: string) => {
    calculateCriticalPath(nodes, edges, startNode)
    
    // 隐藏非关键路径的节点
    const allNodes: LineageNode[] = []
    Object.values(nodesByType).forEach(nodes => {
      allNodes.push(...nodes)
    })

    allNodes.forEach(node => {
      if (!criticalPathNodes.value.has(node.name)) {
        hiddenNodes.value.add(node.name)
      } else {
        hiddenNodes.value.delete(node.name)
      }
    })
  }

  // 显示所有路径
  const showAllPaths = () => {
    criticalPathNodes.value.clear()
    relatedTableNames.value.clear()
  }

  // 检查节点是否可见
  const isNodeVisible = (nodeName: string) => {
    return !hiddenNodes.value.has(nodeName)
  }

  // 检查节点是否在关键路径中
  const isNodeInCriticalPath = (nodeName: string) => {
    return criticalPathNodes.value.has(nodeName)
  }

  // 检查节点是否被搜索高亮
  const isNodeSearchHighlighted = (nodeName: string) => {
    if (!searchQuery.value) return false
    return nodeName.toLowerCase().includes(searchQuery.value)
  }

  // 获取节点统计信息
  const getNodeStats = () => {
    const allNodes: LineageNode[] = []
    Object.values(nodesByType).forEach(nodes => {
      allNodes.push(...nodes)
    })

    return {
      total: allNodes.length,
      visible: filteredNodes.value.length,
      hidden: hiddenNodes.value.size,
      critical: criticalPathNodes.value.size,
      searchHighlighted: searchQuery.value ? 
        allNodes.filter(node => isNodeSearchHighlighted(node.name)).length : 0
    }
  }

  // 获取表类型统计
  const getTableTypeStats = () => {
    const stats: Record<string, number> = {}
    Object.entries(nodesByType).forEach(([type, nodes]) => {
      stats[type] = nodes.filter(node => !hiddenNodes.value.has(node.name)).length
    })
    return stats
  }

  // 重置所有状态
  const resetVisibility = () => {
    hiddenNodes.value.clear()
    criticalPathNodes.value.clear()
    relatedTableNames.value.clear()
    searchQuery.value = ''
    selectedTableTypes.value = []
    groupByType.value = true
  }

  return {
    // 响应式状态
    hiddenNodes,
    criticalPathNodes,
    relatedTableNames,
    searchQuery,
    selectedTableTypes,
    groupByType,
    nodesByType,

    // 计算属性
    filteredNodes,
    groupedNodes,

    // 方法
    updateNodes,
    toggleNodeVisibility,
    showAllNodes,
    hideAllNodes,
    filterNodesBySearch,
    clearSearchFilter,
    updateTableTypeFilter,
    selectAllTableTypes,
    clearTableTypeFilter,
    toggleGroupByType,
    calculateCriticalPath,
    showOnlyCriticalPath,
    showAllPaths,
    isNodeVisible,
    isNodeInCriticalPath,
    isNodeSearchHighlighted,
    getNodeStats,
    getTableTypeStats,
    resetVisibility
  }
}