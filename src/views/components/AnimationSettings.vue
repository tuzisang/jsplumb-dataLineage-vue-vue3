<template>
  <div class="animation-settings">
    <!-- 设置面板 -->
    <div class="settings-panel">
      <!-- 面板标题 -->
      <div class="panel-header">
        <h2 class="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
          </svg>
          动画设置
        </h2>
        <p class="panel-description">
          自定义连接线动画效果和性能配置
        </p>
      </div>

      <!-- 设置内容 -->
      <div class="settings-content">
        <!-- 全局设置 -->
        <div class="settings-section">
          <h3 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2"/>
            </svg>
            全局设置
          </h3>

          <div class="settings-grid">
            <!-- 动画开关 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.animationEnabled"
                  @change="updateSetting('animationEnabled')"
                />
                <span class="label-text">启用动画效果</span>
              </label>
              <p class="setting-description">
                控制是否显示连接线动画效果
              </p>
            </div>

            <!-- 自动播放 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.autoPlay"
                  @change="updateSetting('autoPlay')"
                  :disabled="!settings.animationEnabled"
                />
                <span class="label-text">自动播放动画</span>
              </label>
              <p class="setting-description">
                连接建立时自动开始动画
              </p>
            </div>

            <!-- 无障碍模式 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.reducedMotion"
                  @change="updateSetting('reducedMotion')"
                />
                <span class="label-text">减少动画（无障碍）</span>
              </label>
              <p class="setting-description">
                减少动画效果以提升可访问性
              </p>
            </div>

            <!-- 性能模式 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.performanceMode"
                  @change="updateSetting('performanceMode')"
                />
                <span class="label-text">性能模式</span>
              </label>
              <p class="setting-description">
                优化性能，减少动画复杂度
              </p>
            </div>
          </div>
        </div>

        <!-- 性能配置 -->
        <div class="settings-section">
          <h3 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            性能配置
          </h3>

          <div class="settings-grid">
            <!-- 最大并发动画 -->
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">最大并发动画数</span>
                <span class="label-value">{{ settings.maxConcurrentAnimations }}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                v-model="settings.maxConcurrentAnimations"
                @input="updateSetting('maxConcurrentAnimations')"
                class="setting-slider"
                :disabled="settings.performanceMode"
              />
              <p class="setting-description">
                同时播放的最大动画数量
              </p>
            </div>

            <!-- 帧率限制 -->
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">帧率限制 (FPS)</span>
                <span class="label-value">{{ settings.frameRate }} FPS</span>
              </label>
              <select
                v-model="settings.frameRate"
                @change="updateSetting('frameRate')"
                class="setting-select"
              >
                <option :value="30">30 FPS (省电)</option>
                <option :value="60">60 FPS (标准)</option>
                <option :value="120">120 FPS (流畅)</option>
              </select>
              <p class="setting-description">
                动画帧率上限，影响流畅度和电量消耗
              </p>
            </div>

            <!-- 硬件加速 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.hardwareAcceleration"
                  @change="updateSetting('hardwareAcceleration')"
                />
                <span class="label-text">硬件加速</span>
              </label>
              <p class="setting-description">
                使用GPU加速动画渲染
              </p>
            </div>
          </div>
        </div>

        <!-- 动画预设 -->
        <div class="settings-section">
          <h3 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M9 9H15M9 12H15M9 15H13" stroke="currentColor" stroke-width="2"/>
            </svg>
            动画预设
          </h3>

          <div class="presets-grid">
            <div
              v-for="preset in animationPresets"
              :key="preset.id"
              class="preset-item"
              :class="{ 'preset-item--active': currentPreset?.id === preset.id }"
              @click="applyPreset(preset)"
            >
              <div class="preset-icon">
                <component :is="preset.icon" />
              </div>
              <div class="preset-info">
                <h4 class="preset-name">{{ preset.name }}</h4>
                <p class="preset-description">{{ preset.description }}</p>
              </div>
              <div class="preset-badge" v-if="preset.badge">
                {{ preset.badge }}
              </div>
            </div>
          </div>
        </div>

        <!-- 主题设置 -->
        <div class="settings-section">
          <h3 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
              <path d="M12 1V6M12 18V23M4.22 4.22L7.76 7.76M16.24 16.24L19.78 19.78M1 12H6M18 12H23M4.22 19.78L7.76 16.24M16.24 7.76L19.78 4.22" stroke="currentColor" stroke-width="2"/>
            </svg>
            主题设置
          </h3>

          <div class="settings-grid">
            <!-- 颜色主题 -->
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">动画颜色主题</span>
              </label>
              <div class="color-themes">
                <div
                  v-for="theme in colorThemes"
                  :key="theme.name"
                  class="color-theme"
                  :class="{ 'color-theme--active': settings.colorTheme === theme.name }"
                  @click="setColorTheme(theme)"
                >
                  <div class="color-preview">
                    <div
                      v-for="color in theme.colors"
                      :key="color"
                      class="color-dot"
                      :style="{ backgroundColor: color }"
                    ></div>
                  </div>
                  <span class="color-name">{{ theme.displayName }}</span>
                </div>
              </div>
            </div>

            <!-- 自定义颜色 -->
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">自定义颜色</span>
              </label>
              <div class="custom-colors">
                <div class="color-input-group">
                  <label class="color-label">主色</label>
                  <input
                    type="color"
                    v-model="settings.customColors.primary"
                    @change="updateSetting('customColors')"
                    class="color-input"
                  />
                </div>
                <div class="color-input-group">
                  <label class="color-label">辅色</label>
                  <input
                    type="color"
                    v-model="settings.customColors.secondary"
                    @change="updateSetting('customColors')"
                    class="color-input"
                  />
                </div>
                <div class="color-input-group">
                  <label class="color-label">高亮色</label>
                  <input
                    type="color"
                    v-model="settings.customColors.accent"
                    @change="updateSetting('customColors')"
                    class="color-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 高级设置 -->
        <div class="settings-section">
          <h3 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 15L8 11H11V3H13V11H16L12 15Z" stroke="currentColor" stroke-width="2"/>
              <path d="M3 12C3 12.552 3.448 13 4 13H20C20.552 13 21 12.552 21 12" stroke="currentColor" stroke-width="2"/>
            </svg>
            高级设置
          </h3>

          <div class="settings-grid">
            <!-- 调试模式 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.debugMode"
                  @change="updateSetting('debugMode')"
                />
                <span class="label-text">调试模式</span>
              </label>
              <p class="setting-description">
                显示性能统计和调试信息
              </p>
            </div>

            <!-- 实验性功能 -->
            <div class="setting-item">
              <label class="setting-label">
                <input
                  type="checkbox"
                  v-model="settings.experimentalFeatures"
                  @change="updateSetting('experimentalFeatures')"
                />
                <span class="label-text">实验性功能</span>
              </label>
              <p class="setting-description">
                启用实验性的动画功能
              </p>
            </div>

            <!-- 导出/导入配置 -->
            <div class="setting-item">
              <div class="setting-actions">
                <button
                  class="action-btn action-btn--outline"
                  @click="exportSettings"
                  title="导出配置"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  导出配置
                </button>
                <button
                  class="action-btn action-btn--outline"
                  @click="importSettings"
                  title="导入配置"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2"/>
                    <path d="M17 6L12 11L7 6" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 11V3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  导入配置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 面板操作 -->
      <div class="panel-actions">
        <button
          class="action-btn action-btn--secondary"
          @click="resetToDefaults"
          title="重置为默认设置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 005.64 5.64L1 10M23 14L18.36 18.36A9 9 0 013.51 15L1 14" stroke="currentColor" stroke-width="2"/>
          </svg>
          重置默认
        </button>
        <button
          class="action-btn action-btn--primary"
          @click="saveSettings"
          title="保存设置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2"/>
            <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" stroke-width="2"/>
          </svg>
          保存设置
        </button>
      </div>
    </div>

    <!-- 文件输入（隐藏） -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleFileImport"
      style="display: none;"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAnimation } from '../../composables/useAnimation.js'
import { useUIState } from '../../composables/useUIState.js'

// SVG图标组件
const FlowIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
    </svg>
  `
}

const PulseIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  `
}

const BreathingIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 12C21 7 17 3 12 3C7 3 3 7 3 12C3 17 7 21 12 21C17 21 21 17 21 12Z" stroke="currentColor" stroke-width="2"/>
    </svg>
  `
}

const HighlightIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2"/>
      <path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" stroke="currentColor" stroke-width="2"/>
    </svg>
  `
}

export default {
  name: 'AnimationSettings',

  setup() {
    const animation = useAnimation()
    const uiState = useUIState()

    // 文件输入引用
    const fileInput = ref(null)

    // 设置状态
    const settings = reactive({
      // 全局设置
      animationEnabled: true,
      autoPlay: true,
      reducedMotion: false,
      performanceMode: false,

      // 性能配置
      maxConcurrentAnimations: 10,
      frameRate: 60,
      hardwareAcceleration: true,

      // 主题
      colorTheme: 'default',
      customColors: {
        primary: '#1890ff',
        secondary: '#52c41a',
        accent: '#faad14'
      },

      // 高级设置
      debugMode: false,
      experimentalFeatures: false
    })

    // 动画预设
    const animationPresets = [
      {
        id: 'smooth',
        name: '流畅平滑',
        description: '优先流畅度，适合高端设备',
        icon: FlowIcon,
        badge: '推荐',
        settings: {
          animationEnabled: true,
          maxConcurrentAnimations: 15,
          frameRate: 60,
          hardwareAcceleration: true,
          reducedMotion: false
        }
      },
      {
        id: 'balanced',
        name: '平衡模式',
        description: '性能与效果平衡',
        icon: PulseIcon,
        settings: {
          animationEnabled: true,
          maxConcurrentAnimations: 8,
          frameRate: 60,
          hardwareAcceleration: true,
          reducedMotion: false
        }
      },
      {
        id: 'performance',
        name: '性能优先',
        description: '提升性能，减少动画复杂度',
        icon: BreathingIcon,
        badge: '省电',
        settings: {
          animationEnabled: true,
          maxConcurrentAnimations: 5,
          frameRate: 30,
          hardwareAcceleration: true,
          performanceMode: true
        }
      },
      {
        id: 'minimal',
        name: '极简模式',
        description: '最简单的动画效果',
        icon: HighlightIcon,
        settings: {
          animationEnabled: false,
          maxConcurrentAnimations: 3,
          frameRate: 30,
          hardwareAcceleration: false,
          reducedMotion: true
        }
      }
    ]

    // 颜色主题
    const colorThemes = [
      {
        name: 'default',
        displayName: '默认蓝',
        colors: ['#1890ff', '#40a9ff', '#69c0ff']
      },
      {
        name: 'green',
        displayName: '自然绿',
        colors: ['#52c41a', '#73d13d', '#95de64']
      },
      {
        name: 'purple',
        displayName: '优雅紫',
        colors: ['#722ed1', '#9254de', '#b37feb']
      },
      {
        name: 'orange',
        displayName: '活力橙',
        colors: ['#fa8c16', '#ffa940', '#ffc53d']
      },
      {
        name: 'red',
        displayName: '热情红',
        colors: ['#f5222d', '#ff4d4f', '#ff7875']
      }
    ]

    // 当前预设
    const currentPreset = ref(null)

    // 方法
    function updateSetting(key) {
      // 同步到composables
      if (key === 'animationEnabled') {
        animation.animationEnabled.value = settings.animationEnabled
      } else if (key === 'reducedMotion') {
        animation.setReducedMotion(settings.reducedMotion)
      } else if (key === 'performanceMode') {
        animation.setPerformanceMode(settings.performanceMode)
      } else if (key === 'hardwareAcceleration') {
        uiState.setPerformanceConfig({
          useHardwareAcceleration: settings.hardwareAcceleration
        })
      }

      // 标记当前预设不匹配
      currentPreset.value = null
    }

    function applyPreset(preset) {
      currentPreset.value = preset
      Object.assign(settings, preset.settings)

      // 应用到composables
      animation.animationEnabled.value = preset.settings.animationEnabled
      animation.setReducedMotion(preset.settings.reducedMotion)
      animation.setPerformanceMode(preset.settings.performanceMode)
    }

    function setColorTheme(theme) {
      settings.colorTheme = theme.name

      // 应用主题颜色到动画配置
      animation.setAnimationConfig('flow', { color: theme.colors[0] })
      animation.setAnimationConfig('pulse', { color: theme.colors[1] })
      animation.setAnimationConfig('highlight', { color: theme.colors[2] })
    }

    function resetToDefaults() {
      // 重置为默认值
      Object.assign(settings, {
        animationEnabled: true,
        autoPlay: true,
        reducedMotion: false,
        performanceMode: false,
        maxConcurrentAnimations: 10,
        frameRate: 60,
        hardwareAcceleration: true,
        colorTheme: 'default',
        debugMode: false,
        experimentalFeatures: false
      })

      currentPreset.value = null
      uiState.showToastMessage('已重置为默认设置')
    }

    function saveSettings() {
      try {
        localStorage.setItem('animation-settings', JSON.stringify(settings))

        // 应用到composables
        updateSetting('animationEnabled')
        updateSetting('reducedMotion')
        updateSetting('performanceMode')
        updateSetting('hardwareAcceleration')

        uiState.showToastMessage('设置已保存')
      } catch (error) {
        console.error('保存设置失败:', error)
        uiState.showToastMessage('保存设置失败')
      }
    }

    function loadSettings() {
      try {
        const saved = localStorage.getItem('animation-settings')
        if (saved) {
          const parsed = JSON.parse(saved)
          Object.assign(settings, parsed)
        }
      } catch (error) {
        console.warn('加载设置失败:', error)
      }
    }

    function exportSettings() {
      try {
        const dataStr = JSON.stringify(settings, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)

        const link = document.createElement('a')
        link.href = url
        link.download = `animation-settings-${new Date().toISOString().split('T')[0]}.json`
        link.click()

        URL.revokeObjectURL(url)
        uiState.showToastMessage('配置已导出')
      } catch (error) {
        console.error('导出配置失败:', error)
        uiState.showToastMessage('导出配置失败')
      }
    }

    function importSettings() {
      fileInput.value?.click()
    }

    function handleFileImport(event) {
      const file = event.target.files[0]
      if (!file) return

      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target.result)
            Object.assign(settings, imported)
            uiState.showToastMessage('配置已导入')
          } catch (error) {
            console.error('解析配置文件失败:', error)
            uiState.showToastMessage('配置文件格式错误')
          }
        }
        reader.readAsText(file)
      } catch (error) {
        console.error('读取文件失败:', error)
        uiState.showToastMessage('读取配置文件失败')
      }

      // 清空文件输入
      event.target.value = ''
    }

    // 组件挂载时加载设置
    onMounted(() => {
      loadSettings()
    })

    return {
      // 状态
      settings,
      animationPresets,
      colorThemes,
      currentPreset,
      fileInput,

      // 方法
      updateSetting,
      applyPreset,
      setColorTheme,
      resetToDefaults,
      saveSettings,
      loadSettings,
      exportSettings,
      importSettings,
      handleFileImport
    }
  }
}
</script>

<style scoped>
/* 设置面板 */
.animation-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-panel {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* 面板标题 */
.panel-header {
  padding: 24px 24px 16px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.panel-description {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

/* 设置内容 */
.settings-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

/* 设置区域 */
.settings-section {
  margin-bottom: 32px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

/* 设置网格 */
.settings-grid {
  display: grid;
  gap: 20px;
}

.setting-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.setting-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #1890ff;
}

.label-text {
  flex: 1;
}

.label-value {
  font-weight: 600;
  color: #1890ff;
}

.setting-description {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

/* 表单控件 */
.setting-slider {
  width: 100%;
  height: 6px;
  margin: 8px 0;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.setting-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.setting-select {
  width: 100%;
  padding: 8px 12px;
  margin-top: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  font-size: 14px;
  color: #374151;
}

.setting-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.setting-slider:disabled,
.setting-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动作按钮 */
.setting-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-btn--primary {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.action-btn--primary:hover {
  background: linear-gradient(135deg, #096dd9, #1890ff);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}

.action-btn--secondary {
  background: #ffffff;
  color: #64748b;
  border-color: #e5e7eb;
}

.action-btn--secondary:hover {
  background: #f8fafc;
  color: #374151;
  border-color: #cbd5e1;
}

.action-btn--outline {
  background: transparent;
  color: #1890ff;
  border-color: #1890ff;
}

.action-btn--outline:hover {
  background: rgba(24, 144, 255, 0.1);
}

/* 预设网格 */
.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.preset-item:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  transform: translateY(-2px);
}

.preset-item--active {
  border-color: #1890ff;
  background: #f0f9ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

.preset-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
  flex-shrink: 0;
}

.preset-item--active .preset-icon {
  background: #e6f7ff;
  color: #1890ff;
}

.preset-info {
  flex: 1;
}

.preset-name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.preset-description {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.preset-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  background: #52c41a;
  color: #ffffff;
  font-size: 10px;
  font-weight: 500;
  border-radius: 12px;
}

/* 颜色主题 */
.color-themes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.color-theme {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-theme:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.color-theme--active {
  border-color: #1890ff;
  background: #f0f9ff;
}

.color-preview {
  display: flex;
  gap: 4px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-name {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.color-theme--active .color-name {
  color: #1890ff;
}

/* 自定义颜色 */
.custom-colors {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.color-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.color-input {
  width: 50px;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-input::-webkit-color-swatch {
  border-radius: 4px;
  border: none;
}

/* 面板操作 */
.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* 禁用状态 */
.setting-label:has(input:disabled),
.setting-slider:disabled,
.setting-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .animation-settings {
    padding: 16px;
  }

  .settings-content {
    padding: 16px;
    max-height: 60vh;
  }

  .presets-grid {
    grid-template-columns: 1fr;
  }

  .color-themes {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .custom-colors {
    flex-wrap: wrap;
    gap: 12px;
  }

  .setting-actions {
    flex-direction: column;
  }

  .panel-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .panel-header {
    padding: 16px;
  }

  .panel-title {
    font-size: 18px;
  }

  .panel-description {
    font-size: 13px;
  }

  .section-title {
    font-size: 14px;
  }

  .setting-item {
    padding: 12px;
  }

  .preset-item {
    padding: 12px;
  }

  .color-theme {
    padding: 8px;
  }
}
</style>