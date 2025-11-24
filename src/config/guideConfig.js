/**
 * 新手引导配置
 * 定义应用中的各种引导流程和步骤
 */

import { GuideConfig } from '../types/guide-animation.ts'

/**
 * 首次访问引导配置
 */
export const firstVisitGuide = new GuideConfig({
  id: 'first-visit',
  name: '欢迎使用数据血缘分析工具',
  description: '引导用户了解主要功能和操作流程',
  showOnFirstVisit: true,
  autoStart: true,
  allowSkip: true,
  allowReplay: true,
  resetOnComplete: false,
  storageKey: 'first-visit-guide',
  priority: 1,
  conditions: {
    pathname: '/',
    hasData: false
  },
  steps: [
    {
      id: 'welcome',
      title: '欢迎使用数据血缘分析工具',
      content: `
        <p>欢迎使用我们的数据血缘分析工具！这个工具可以帮助您：</p>
        <ul>
          <li>可视化数据表之间的关系</li>
          <li>分析SQL查询的数据流向</li>
          <li>追踪字段级别的数据血缘</li>
          <li>识别关键的数据路径</li>
        </ul>
        <p>让我们花几分钟时间来了解一下主要功能。</p>
      `,
      target: 'body',
      position: 'center',
      showSkip: true,
      showPrev: false,
      showNext: true,
      customClass: 'guide-welcome-step',
      callback: () => {
        console.log('欢迎引导开始');
      }
    },
    {
      id: 'sql-input',
      title: '输入SQL查询',
      content: `
        <p>在这里输入您的SQL查询语句进行分析。</p>
        <p><strong>支持的数据库类型：</strong></p>
        <ul>
          <li>MySQL</li>
          <li>PostgreSQL</li>
          <li>SparkSQL</li>
          <li>Hive</li>
          <li>SQLite</li>
          <li>Oracle</li>
          <li>SQL Server</li>
        </ul>
        <p>您也可以点击"上传SQL文件"按钮来导入.sql文件。</p>
      `,
      target: '.sql-panel',
      position: 'bottom',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 12,
        borderRadius: 8,
        hideBackground: false
      },
      offset: { x: 0, y: 10 },
      validation: () => {
        // 验证步骤：确保用户能看到输入区域
        const inputArea = document.querySelector('.sql-textarea');
        return !!inputArea;
      }
    },
    {
      id: 'lineage-level',
      title: '选择血缘分析级别',
      content: `
        <p><strong>表级分析：</strong>显示表之间的整体关系，适合概览查看。</p>
        <p><strong>列级分析：</strong>显示字段级别的详细血缘关系，适合深度分析。</p>
        <p>根据您的分析需求选择合适的级别。</p>
      `,
      target: '.lineage-level-selector',
      position: 'bottom',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 8,
        borderRadius: 6
      },
      offset: { x: 0, y: 5 }
    },
    {
      id: 'analyze-button',
      title: '开始分析',
      content: `
        <p>输入SQL查询并选择分析级别后，点击"分析血缘关系"按钮开始分析。</p>
        <p>系统将解析您的SQL查询并生成可视化的数据血缘图。</p>
      `,
      target: '.analyze-btn',
      position: 'top',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      },
      offset: { x: 0, y: -10 }
    },
    {
      id: 'canvas-overview',
      title: '数据血缘画布',
      content: `
        <p>这里是数据血缘关系的可视化展示区域。</p>
        <p><strong>您可以：</strong></p>
        <ul>
          <li>拖拽节点来调整布局</li>
          <li>滚轮缩放画布</li>
          <li>点击节点查看详细信息</li>
          <li>使用搜索功能快速定位</li>
        </ul>
      `,
      target: '#table-flow',
      position: 'left',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 20,
        borderRadius: 8
      },
      offset: { x: 20, y: 0 },
      scrollIntoView: true
    },
    {
      id: 'minimap',
      title: '小地图导航',
      content: `
        <p>小地图显示了整个血缘关系的概览，帮助您快速导航到感兴趣的区域。</p>
        <p>点击小地图上的任意位置可以快速跳转到对应区域。</p>
      `,
      target: '.mini-map',
      position: 'left',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 8,
        borderRadius: 6
      },
      offset: { x: 15, y: 0 }
    },
    {
      id: 'control-panel',
      title: '控制面板',
      content: `
        <p>控制面板提供了丰富的功能来操作和分析血缘关系：</p>
        <ul>
          <li><strong>显示控制：</strong>筛选表类型、显示/隐藏节点</li>
          <li><strong>搜索功能：</strong>快速查找表和字段</li>
          <li><strong>导出功能：</strong>保存血缘图为图片</li>
          <li><strong>批量操作：</strong>选择多个节点进行操作</li>
        </ul>
      `,
      target: '.control-panel',
      position: 'right',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 15,
        borderRadius: 8
      },
      offset: { x: -20, y: 0 }
    },
    {
      id: 'animations',
      title: '连接线动画',
      content: `
        <p>连接线动画帮助您更好地理解数据流向：</p>
        <ul>
          <li><strong>流动动画：</strong>模拟数据的流动方向</li>
          <li><strong>脉冲效果：</strong>突出显示重要的数据路径</li>
          <li><strong>呼吸效果：</strong>柔和的视觉提示</li>
        </ul>
        <p>您可以在动画设置中自定义效果或关闭动画。</p>
      `,
      target: '.connection-animator',
      position: 'left',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      },
      offset: { x: 15, y: 0 }
    },
    {
      id: 'completion',
      title: '引导完成',
      content: `
        <p>恭喜！您已经了解了数据血缘分析工具的主要功能。</p>
        <p><strong>快速提示：</strong></p>
        <ul>
          <li>按 <kbd>Esc</kbd> 键可以随时暂停或退出引导</li>
          <li>您可以在设置中重新触发引导</li>
          <li>遇到问题时可以查看帮助文档</li>
        </ul>
        <p>现在开始探索数据血缘的世界吧！</p>
      `,
      target: 'body',
      position: 'center',
      showSkip: false,
      showPrev: true,
      showNext: false,
      customClass: 'guide-completion-step',
      callback: () => {
        console.log('首次访问引导完成');
      }
    }
  ]
});

/**
 * 功能特性引导配置
 */
export const featuresGuide = new GuideConfig({
  id: 'features',
  name: '功能特性介绍',
  description: '深入了解高级功能和特性',
  showOnFirstVisit: false,
  autoStart: false,
  allowSkip: true,
  allowReplay: true,
  resetOnComplete: false,
  storageKey: 'features-guide',
  priority: 2,
  conditions: {
    pathname: '/',
    hasData: true
  },
  steps: [
    {
      id: 'search-feature',
      title: '强大的搜索功能',
      content: `
        <p>使用搜索功能快速定位表和字段：</p>
        <ul>
          <li><strong>模糊搜索：</strong>支持部分匹配</li>
          <li><strong>正则表达式：</strong>高级模式匹配</li>
          <li><strong>搜索筛选：</strong>限定搜索范围</li>
        </ul>
      `,
      target: '.search-container',
      position: 'bottom',
      showSkip: true,
      showPrev: false,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      }
    },
    {
      id: 'key-path',
      title: '关键路径分析',
      content: `
        <p>关键路径功能帮助您识别最重要的数据流向：</p>
        <ul>
          <li>自动计算关键路径</li>
          <li>高亮显示重要连接</li>
          <li>支持路径导航</li>
        </ul>
      `,
      target: '.key-path-controls',
      position: 'bottom',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 8,
        borderRadius: 6
      }
    },
    {
      id: 'batch-operations',
      title: '批量操作功能',
      content: `
        <p>选择多个节点进行批量操作：</p>
        <ul>
          <li>批量隐藏/显示节点</li>
          <li>批量导出数据</li>
          <li>批量分析血缘</li>
        </ul>
      `,
      target: '.batch-actions',
      position: 'top',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      }
    },
    {
      id: 'export-features',
      title: '导出和分享',
      content: `
        <p>将分析结果导出为多种格式：</p>
        <ul>
          <li><strong>图片导出：</strong>PNG、SVG格式</li>
          <li><strong>数据导出：</strong>JSON、CSV格式</li>
          <li><strong>报告生成：</strong>PDF格式</li>
        </ul>
      `,
      target: '.export-controls',
      position: 'top',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      }
    }
  ]
});

/**
 * 高级功能引导配置
 */
export const advancedGuide = new GuideConfig({
  id: 'advanced',
  name: '高级功能指南',
  description: '学习高级功能和定制选项',
  showOnFirstVisit: false,
  autoStart: false,
  allowSkip: true,
  allowReplay: true,
  resetOnComplete: false,
  storageKey: 'advanced-guide',
  priority: 3,
  conditions: {
    pathname: '/',
    hasData: true
  },
  steps: [
    {
      id: 'custom-layout',
      title: '自定义布局',
      content: `
        <p>使用拖拽功能自定义节点布局：</p>
        <ul>
          <li>自由拖拽节点位置</li>
          <li>自动对齐功能</li>
          <li>布局保存和恢复</li>
        </ul>
      `,
      target: '.layout-controls',
      position: 'bottom',
      showSkip: true,
      showPrev: false,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      }
    },
    {
      id: 'performance-settings',
      title: '性能优化设置',
      content: `
        <p>根据设备性能调整设置：</p>
        <ul>
          <li><strong>高性能模式：</strong>适合低端设备</li>
          <li><strong>动画控制：</strong>自定义动画效果</li>
          <li><strong>渲染优化：</strong>提升大型图表性能</li>
        </ul>
      `,
      target: '.performance-settings',
      position: 'bottom',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      }
    },
    {
      id: 'api-integration',
      title: 'API集成',
      content: `
        <p>通过API集成到您的应用中：</p>
        <ul>
          <li>RESTful API接口</li>
          <li>实时数据分析</li>
          <li>自定义数据处理</li>
        </ul>
      `,
      target: '.api-docs',
      position: 'bottom',
      showSkip: true,
      showPrev: true,
      showNext: true,
      highlight: {
        padding: 10,
        borderRadius: 6
      }
    }
  ]
});

/**
 * 获取所有引导配置
 */
export function getAllGuideConfigs() {
  return [
    firstVisitGuide,
    featuresGuide,
    advancedGuide
  ];
}

/**
 * 根据ID获取引导配置
 */
export function getGuideConfigById(id) {
  const configs = getAllGuideConfigs();
  return configs.find(config => config.id === id) || null;
}

/**
 * 根据条件获取可用的引导配置
 */
export function getAvailableGuideConfigs(conditions = {}) {
  const configs = getAllGuideConfigs();

  return configs.filter(config => {
    // 检查路径条件
    if (conditions.pathname && config.conditions?.pathname) {
      if (!window.location.pathname.includes(config.conditions.pathname)) {
        return false;
      }
    }

    // 检查数据条件
    if (conditions.hasData !== undefined && config.conditions?.hasData !== undefined) {
      if (conditions.hasData !== config.conditions.hasData) {
        return false;
      }
    }

    // 检查用户角色条件
    if (conditions.userRole && config.conditions?.userRole) {
      if (conditions.userRole !== config.conditions.userRole) {
        return false;
      }
    }

    // 检查功能开关条件
    if (conditions.featureFlags && config.conditions?.featureFlag) {
      if (!conditions.featureFlags[config.conditions.featureFlag]) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * 获取推荐的下一个引导
 */
export function getNextRecommendedGuide(completedGuides = [], skippedGuides = []) {
  const available = getAvailableGuideConfigs();

  return available.find(config => {
    return !completedGuides.includes(config.id) &&
           !skippedGuides.includes(config.id) &&
           config.showOnFirstVisit;
  }) || null;
}