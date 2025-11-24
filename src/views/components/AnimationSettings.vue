<template>
  <div class="animation-settings">
    <div class="settings-header">
      <h3 class="settings-title">
        <span class="settings-icon">🎨</span>
        视觉效果设置
      </h3>
      <button
        class="settings-toggle"
        @click="toggleExpanded"
        :class="{ 'expanded': isExpanded }"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 6.646a.5.5 0 0 1 .708 0L8 9.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>

    <div v-show="isExpanded" class="settings-content">
      <!-- 动画设置 -->
      <div class="settings-section">
        <div class="setting-item">
          <label class="setting-label">
            <input
              type="checkbox"
              v-model="settings.animationEnabled"
              @change="saveSettings"
              class="setting-checkbox"
            />
            <span class="setting-text">启用连接线动画</span>
            <span class="setting-description">显示数据流向和连接脉冲效果</span>
          </label>
        </div>

        <div class="setting-item" v-if="settings.animationEnabled">
          <label class="setting-label">
            <span class="setting-text">动画速度</span>
          </label>
          <div class="slider-container">
            <input
              type="range"
              v-model="settings.animationSpeed"
              @input="saveSettings"
              min="0.5"
              max="3"
              step="0.5"
              class="setting-slider"
            />
            <span class="slider-value">{{ getSpeedLabel(settings.animationSpeed) }}</span>
          </div>
        </div>

        <div class="setting-item" v-if="settings.animationEnabled">
          <label class="setting-label">
            <input
              type="checkbox"
              v-model="settings.showDataFlow"
              @change="saveSettings"
              class="setting-checkbox"
            />
            <span class="setting-text">数据流动画</span>
            <span class="setting-description">显示沿连接线移动的粒子效果</span>
          </label>
        </div>

        <div class="setting-item" v-if="settings.animationEnabled">
          <label class="setting-label">
            <input
              type="checkbox"
              v-model="settings.showPulseEffect"
              @change="saveSettings"
              class="setting-checkbox"
            />
            <span class="setting-text">脉冲效果</span>
            <span class="setting-description">显示连接线的脉冲动画</span>
          </label>
        </div>
      </div>

      <!-- 新手引导设置 -->
      <div class="settings-section">
        <h4 class="section-title">新手引导</h4>

        <div class="setting-item">
          <label class="setting-label">
            <span class="setting-text">引导状态</span>
          </label>
          <div class="guide-status">
            <span v-if="hasCompletedGuide" class="status-completed">✅ 已完成</span>
            <span v-else class="status-pending">⏳ 未完成</span>
          </div>
        </div>

        <div class="setting-item">
          <button
            @click="restartGuide"
            class="setting-button setting-button-primary"
          >
            🎓 重新开始引导
          </button>
          <p class="setting-hint">重新学习如何使用数据血缘分析工具</p>
        </div>
      </div>

      <!-- 性能设置 -->
      <div class="settings-section">
        <h4 class="section-title">性能优化</h4>

        <div class="setting-item">
          <label class="setting-label">
            <span class="setting-text">性能模式</span>
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input
                type="radio"
                v-model="settings.performanceMode"
                value="low"
                @change="saveSettings"
                class="setting-radio"
              />
              <span class="radio-label">
                <strong>低性能模式</strong>
                <small>最佳视觉效果，适合高端设备</small>
              </span>
            </label>
            <label class="radio-option">
              <input
                type="radio"
                v-model="settings.performanceMode"
                value="high"
                @change="saveSettings"
                class="setting-radio"
              />
              <span class="radio-label">
                <strong>高性能模式</strong>
                <small>减少动画效果，适合低端设备</small>
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- 重置按钮 -->
      <div class="settings-section">
        <button
          @click="resetSettings"
          class="setting-button setting-button-secondary"
        >
          🔄 恢复默认设置
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useGuide } from '../composables/useGuide.js'
import { useUIState } from '../composables/useUIState.js'

export default {
  name: 'AnimationSettings',
  emits: ['settings-change'],
  setup(props, { emit }) {
    const isExpanded = ref(false)
    const { hasCompletedGuide, restartGuide, getGuideStats } = useGuide()
    const { performanceMode } = useUIState()

    // 默认设置
    const DEFAULT_SETTINGS = {
      animationEnabled: true,
      animationSpeed: 1,
      showDataFlow: true,
      showPulseEffect: true,
      performanceMode: 'low',
      autoStartGuide: true
    }

    // 当前设置
    const settings = reactive({ ...DEFAULT_SETTINGS })

    // 加载设置
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('animation_settings')
        if (saved) {
          const parsed = JSON.parse(saved)
          Object.assign(settings, { ...DEFAULT_SETTINGS, ...parsed })
        }

        // 同步性能模式到全局状态
        if (settings.performanceMode !== performanceMode.value) {
          performanceMode.value = settings.performanceMode
        }
      } catch (error) {
        console.warn('Failed to load animation settings:', error)
      }
    }

    // 保存设置
    const saveSettings = () => {
      try {
        localStorage.setItem('animation_settings', JSON.stringify(settings))
        emit('settings-change', { ...settings })

        // 同步性能模式
        performanceMode.value = settings.performanceMode
      } catch (error) {
        console.warn('Failed to save animation settings:', error)
      }
    }

    // 重置设置
    const resetSettings = () => {
      if (confirm('确定要恢复默认设置吗？这将清除您的所有个性化配置。')) {
        Object.assign(settings, DEFAULT_SETTINGS)
        saveSettings()
      }
    }

    // 切换展开状态
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value
    }

    // 重新开始引导
    const handleRestartGuide = () => {
      if (confirm('确定要重新开始新手引导吗？这将重置引导进度。')) {
        restartGuide()
      }
    }

    // 获取速度标签
    const getSpeedLabel = (speed) => {
      const labels = {
        0.5: '慢速',
        1: '正常',
        1.5: '快速',
        2: '很快',
        2.5: '极快',
        3: '闪电'
      }
      return labels[speed] || '正常'
    }

    // 初始化
    onMounted(() => {
      loadSettings()
      checkGuideCompletion()
    })

    const checkGuideCompletion = () => {
      const stats = getGuideStats()
      hasCompletedGuide.value = stats.completed
    }

    return {
      isExpanded,
      settings,
      hasCompletedGuide,

      // 方法
      saveSettings,
      resetSettings,
      toggleExpanded,
      restartGuide: handleRestartGuide,
      getSpeedLabel
    }
  }
}
</script>

<style scoped>
.animation-settings {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
}

.settings-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-icon {
  font-size: 16px;
}

.settings-toggle {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.settings-toggle:hover {
  background: #e5e7eb;
  color: #374151;
}

.settings-toggle.expanded {
  transform: rotate(180deg);
}

.settings-content {
  padding: 16px;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.setting-checkbox,
.setting-radio {
  margin: 0;
  margin-top: 2px;
}

.setting-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  display: block;
}

.setting-description {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
  display: block;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  margin-left: 20px;
}

.setting-slider {
  flex: 1;
  max-width: 200px;
}

.slider-value {
  font-size: 12px;
  color: #6b7280;
  min-width: 40px;
  text-align: right;
}

.guide-status {
  margin-top: 8px;
  margin-left: 20px;
}

.status-completed,
.status-pending {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.setting-button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background: #ffffff;
  margin-left: 20px;
}

.setting-button:hover {
  background: #f9fafb;
}

.setting-button-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.setting-button-primary:hover {
  background: #2563eb;
}

.setting-button-secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.setting-button-secondary:hover {
  background: #e5e7eb;
}

.setting-hint {
  font-size: 11px;
  color: #6b7280;
  margin: 4px 0 0 20px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  margin-left: 20px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.radio-option:hover {
  background: #f9fafb;
}

.radio-label {
  font-size: 13px;
  color: #374151;
}

.radio-label strong {
  display: block;
  margin-bottom: 2px;
}

.radio-label small {
  color: #6b7280;
  display: block;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .slider-container {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .setting-slider {
    max-width: none;
  }

  .slider-value {
    text-align: left;
  }
}
</style>