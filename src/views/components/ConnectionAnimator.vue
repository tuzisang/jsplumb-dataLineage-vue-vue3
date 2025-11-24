<template>
  <div class="connection-animator">
    <!-- 动画控制面板 -->
    <div
      v-if="showControlPanel"
      class="animator-control-panel"
      :class="{ 'animator-control-panel--collapsed': isPanelCollapsed }"
    >
      <!-- 面板头部 -->
      <div class="control-panel__header">
        <h3 class="panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
          </svg>
          连接线动画
        </h3>
        <button
          class="panel-toggle"
          @click="togglePanel"
          :title="isPanelCollapsed ? '展开面板' : '折叠面板'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              :style="{ transform: isPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }"
            />
          </svg>
        </button>
      </div>

      <!-- 面板内容 -->
      <div v-show="!isPanelCollapsed" class="control-panel__content">
        <!-- 全局开关 -->
        <div class="control-section">
          <div class="control-item">
            <label class="control-label">
              <input
                type="checkbox"
                v-model="animation.animationEnabled"
                @change="handleGlobalToggle"
              />
              启用动画效果
            </label>
          </div>

          <div class="control-item">
            <label class="control-label">
              <input
                type="checkbox"
                v-model="reducedMotion"
                @change="handleReducedMotion"
              />
              减少动画（无障碍）
            </label>
          </div>

          <div class="control-item">
            <label class="control-label">
              <input
                type="checkbox"
                v-model="performanceMode"
                @change="handlePerformanceMode"
              />
              性能模式
            </label>
          </div>
        </div>

        <!-- 动画类型选择 -->
        <div class="control-section">
          <h4 class="section-title">动画类型</h4>
          <div class="animation-types">
            <div
              v-for="(config, type) in animation.animationConfigs"
              :key="type"
              class="animation-type-item"
              :class="{ 'animation-type-item--active': selectedType === type }"
              @click="selectAnimationType(type)"
            >
              <div class="type-preview">
                <div :class="`preview-${type}`"></div>
              </div>
              <div class="type-info">
                <div class="type-name">{{ getAnimationTypeName(type) }}</div>
                <div class="type-desc">{{ getAnimationTypeDesc(type) }}</div>
              </div>
              <div class="type-status">
                <svg
                  v-if="config.enabled"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  class="status-icon status-icon--enabled"
                >
                  <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  class="status-icon status-icon--disabled"
                >
                  <path d="M8 8L16 16M8 16L16 8" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 当前类型配置 -->
        <div v-if="selectedType && currentConfig" class="control-section">
          <h4 class="section-title">{{ getAnimationTypeName(selectedType) }} 配置</h4>

          <!-- 速度控制 -->
          <div class="control-item">
            <label class="control-label">
              动画速度
              <span class="control-value">{{ currentConfig.speed.toFixed(1) }}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              v-model="currentConfig.speed"
              @input="updateConfig"
              class="control-slider"
            />
          </div>

          <!-- 强度控制 -->
          <div class="control-item">
            <label class="control-label">
              动画强度
              <span class="control-value">{{ Math.round(currentConfig.intensity * 100) }}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              v-model="currentConfig.intensity"
              @input="updateConfig"
              class="control-slider"
            />
          </div>

          <!-- 持续时间控制 -->
          <div class="control-item">
            <label class="control-label">
              持续时间
              <span class="control-value">{{ currentConfig.duration }}ms</span>
            </label>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              v-model="currentConfig.duration"
              @input="updateConfig"
              class="control-slider"
            />
          </div>

          <!-- 颜色选择 -->
          <div class="control-item">
            <label class="control-label">动画颜色</label>
            <div class="color-picker-wrapper">
              <input
                type="color"
                v-model="currentConfig.color"
                @input="updateConfig"
                class="color-picker"
              />
              <input
                type="text"
                v-model="currentConfig.color"
                @input="updateConfig"
                class="color-input"
                placeholder="#1890ff"
              />
            </div>
          </div>

          <!-- 其他选项 -->
          <div class="control-item">
            <label class="control-label">
              <input
                type="checkbox"
                v-model="currentConfig.loop"
                @input="updateConfig"
              />
              循环播放
            </label>
          </div>

          <div class="control-item" v-if="currentConfig.type !== 'highlight'">
            <label class="control-label">
              <input
                type="checkbox"
                v-model="currentConfig.glow"
                @input="updateConfig"
              />
              发光效果
            </label>
          </div>

          <div class="control-item" v-if="currentConfig.type === 'flow'">
            <label class="control-label">
              <input
                type="checkbox"
                v-model="currentConfig.particles"
                @input="updateConfig"
              />
              粒子效果
            </label>
          </div>

          <!-- 缓动函数选择 -->
          <div class="control-item">
            <label class="control-label">缓动函数</label>
            <select
              v-model="currentConfig.easing"
              @change="updateConfig"
              class="control-select"
            >
              <option value="linear">线性 (Linear)</option>
              <option value="ease-in">缓入 (Ease In)</option>
              <option value="ease-out">缓出 (Ease Out)</option>
              <option value="ease-in-out">缓入缓出 (Ease In Out)</option>
              <option value="bounce">弹性 (Bounce)</option>
            </select>
          </div>

          <!-- 方向选择 -->
          <div class="control-item" v-if="currentConfig.type !== 'highlight'">
            <label class="control-label">动画方向</label>
            <select
              v-model="currentConfig.direction"
              @change="updateConfig"
              class="control-select"
            >
              <option value="forward">正向</option>
              <option value="reverse">反向</option>
              <option value="alternate">交替</option>
            </select>
          </div>
        </div>

        <!-- 性能监控 -->
        <div class="control-section">
          <h4 class="section-title">性能监控</h4>
          <div class="performance-stats">
            <div class="stat-item">
              <div class="stat-label">活动动画</div>
              <div class="stat-value">{{ animation.activeAnimationsCount }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">帧率 (FPS)</div>
              <div class="stat-value" :class="getFpsClass(animation.animationPerformance.fps)">
                {{ animation.animationPerformance.fps }}
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-label">内存使用</div>
              <div class="stat-value">{{ formatMemoryUsage(animation.animationPerformance.memoryUsage) }}</div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="control-section">
          <div class="control-actions">
            <button
              class="action-btn action-btn--primary"
              @click="startDemoAnimation"
              :disabled="!animation.animationEnabled"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
              </svg>
              演示动画
            </button>

            <button
              class="action-btn action-btn--secondary"
              @click="stopAllAnimations"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
              </svg>
              停止所有
            </button>

            <button
              class="action-btn action-btn--secondary"
              @click="resetConfig"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 005.64 5.64L1 10M23 14L18.36 18.36A9 9 0 013.51 15L1 14" stroke="currentColor" stroke-width="2"/>
              </svg>
              重置配置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作按钮 -->
    <div v-if="!showControlPanel" class="animator-quick-controls">
      <button
        class="quick-btn"
        @click="toggleAnimation"
        :title="animation.animationEnabled ? '禁用动画' : '启用动画'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>

    <!-- 动画演示区域 -->
    <div v-if="showDemoArea" class="demo-area">
      <div class="demo-connections">
        <!-- 示例连接线 -->
        <div class="demo-connection" data-connection-id="demo-1">
          <div class="demo-line"></div>
        </div>
        <div class="demo-connection" data-connection-id="demo-2">
          <div class="demo-line"></div>
        </div>
        <div class="demo-connection" data-connection-id="demo-3">
          <div class="demo-line"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAnimation } from '../../composables/useAnimation.js'

export default {
  name: 'ConnectionAnimator',

  props: {
    // 是否显示控制面板
    showControlPanel: {
      type: Boolean,
      default: true
    },
    // 是否显示演示区域
    showDemoArea: {
      type: Boolean,
      default: false
    },
    // 默认选中的动画类型
    defaultType: {
      type: String,
      default: 'flow'
    },
    // 是否在页面加载时自动开始演示
    autoDemo: {
      type: Boolean,
      default: false
    }
  },

  emits: ['animation-start', 'animation-stop', 'config-change', 'performance-update'],

  setup(props, { emit }) {
    const animation = useAnimation()

    // 组件状态
    const isPanelCollapsed = ref(false)
    const selectedType = ref(props.defaultType)
    const reducedMotion = ref(false)
    const performanceMode = ref(false)

    // 计算属性
    const currentConfig = computed(() => {
      return animation.animationConfigs[selectedType.value]
    })

    // 方法
    function togglePanel() {
      isPanelCollapsed.value = !isPanelCollapsed.value
    }

    function selectAnimationType(type) {
      selectedType.value = type
    }

    function getAnimationTypeName(type) {
      const names = {
        flow: '数据流',
        pulse: '脉冲',
        breathing: '呼吸',
        highlight: '高亮'
      }
      return names[type] || type
    }

    function getAnimationTypeDesc(type) {
      const descriptions = {
        flow: '模拟数据流动效果',
        pulse: '周期性脉冲动画',
        breathing: '柔和的呼吸效果',
        highlight: '重点高亮显示'
      }
      return descriptions[type] || ''
    }

    function updateConfig() {
      if (currentConfig.value) {
        animation.setAnimationConfig(selectedType.value, { ...currentConfig.value })
        emit('config-change', {
          type: selectedType.value,
          config: currentConfig.value
        })
      }
    }

    function handleGlobalToggle() {
      emit('animation-start', animation.animationEnabled.value)
    }

    function handleReducedMotion() {
      animation.setReducedMotion(reducedMotion.value)
    }

    function handlePerformanceMode() {
      animation.setPerformanceMode(performanceMode.value)
    }

    function startDemoAnimation() {
      if (!animation.animationEnabled.value) return

      // 开始演示动画
      const demoConnections = ['demo-1', 'demo-2', 'demo-3']
      animation.startBatchAnimation(demoConnections, currentConfig.value)

      emit('animation-start', {
        type: selectedType.value,
        connections: demoConnections
      })
    }

    function stopAllAnimations() {
      animation.stopAllAnimations()
      emit('animation-stop', 'all')
    }

    function resetConfig() {
      animation.resetAnimationConfigs()
      selectedType.value = props.defaultType
      emit('config-change', { reset: true })
    }

    function toggleAnimation() {
      animation.animationEnabled.value = !animation.animationEnabled.value
      handleGlobalToggle()
    }

    function getFpsClass(fps) {
      if (fps >= 50) return 'stat-value--good'
      if (fps >= 30) return 'stat-value--warning'
      return 'stat-value--poor'
    }

    function formatMemoryUsage(bytes) {
      if (!bytes) return 'N/A'
      const mb = bytes / (1024 * 1024)
      return `${mb.toFixed(1)} MB`
    }

    // 性能监控
    let performanceTimer = null

    function startPerformanceMonitoring() {
      performanceTimer = setInterval(() => {
        const performance = animation.animationPerformance
        emit('performance-update', performance)

        // 检查性能并自动调整
        if (performance.fps < 20 && animation.activeAnimationsCount.value > 5) {
          console.warn('动画性能较差，建议启用性能模式')
        }
      }, 1000)
    }

    function stopPerformanceMonitoring() {
      if (performanceTimer) {
        clearInterval(performanceTimer)
        performanceTimer = null
      }
    }

    // 监听动画状态变化
    watch(() => animation.activeAnimationsCount.value, (count, prevCount) => {
      if (count > 0 && prevCount === 0) {
        emit('animation-start', 'some')
      } else if (count === 0 && prevCount > 0) {
        emit('animation-stop', 'all')
      }
    })

    // 监听动画配置变化
    watch(() => animation.animationConfigs, () => {
      emit('config-change', animation.animationConfigs)
    }, { deep: true })

    // 组件挂载
    onMounted(() => {
      startPerformanceMonitoring()

      // 自动演示
      if (props.autoDemo && props.showDemoArea) {
        setTimeout(() => {
          startDemoAnimation()
        }, 1000)
      }
    })

    // 组件卸载
    onUnmounted(() => {
      stopPerformanceMonitoring()
      stopAllAnimations()
    })

    return {
      // 状态
      animation,
      isPanelCollapsed,
      selectedType,
      reducedMotion,
      performanceMode,

      // 计算属性
      currentConfig,

      // 方法
      togglePanel,
      selectAnimationType,
      getAnimationTypeName,
      getAnimationTypeDesc,
      updateConfig,
      handleGlobalToggle,
      handleReducedMotion,
      handlePerformanceMode,
      startDemoAnimation,
      stopAllAnimations,
      resetConfig,
      toggleAnimation,
      getFpsClass,
      formatMemoryUsage
    }
  }
}
</script>

<style scoped>
/* 控制面板 */
.animator-control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
  transition: all 0.3s ease;
}

.animator-control-panel--collapsed {
  width: 200px;
  max-height: auto;
}

.control-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.panel-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.panel-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1e293b;
}

.control-panel__content {
  max-height: calc(80vh - 70px);
  overflow-y: auto;
  padding: 16px 20px;
}

/* 控制区域 */
.control-section {
  margin-bottom: 24px;
}

.control-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.control-item {
  margin-bottom: 12px;
}

.control-item:last-child {
  margin-bottom: 0;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.control-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #1890ff;
}

.control-value {
  margin-left: auto;
  font-weight: 500;
  color: #1e293b;
}

.control-slider {
  width: 100%;
  height: 4px;
  margin-top: 8px;
  background: #e5e7eb;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.control-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.control-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  font-size: 13px;
  color: #374151;
  margin-top: 4px;
}

.color-picker-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
}

/* 动画类型选择 */
.animation-types {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.animation-type-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.animation-type-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.animation-type-item--active {
  border-color: #1890ff;
  background: #f0f9ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.type-preview {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.preview-flow,
.preview-pulse,
.preview-breathing,
.preview-highlight {
  width: 24px;
  height: 2px;
  background: #1890ff;
  border-radius: 1px;
  position: relative;
}

.preview-flow::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  background: #1890ff;
  border-radius: 50%;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  animation: demoFlow 2s linear infinite;
}

.preview-pulse {
  animation: demoPulse 1.5s ease-in-out infinite;
}

.preview-breathing {
  animation: demoBreathing 2s ease-in-out infinite;
}

.preview-highlight {
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.4);
}

.type-info {
  flex: 1;
}

.type-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.type-desc {
  font-size: 11px;
  color: #64748b;
}

.type-status {
  flex-shrink: 0;
}

.status-icon {
  width: 16px;
  height: 16px;
}

.status-icon--enabled {
  color: #52c41a;
}

.status-icon--disabled {
  color: #94a3b8;
}

/* 性能统计 */
.performance-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px 8px;
  background: #f8fafc;
  border-radius: 8px;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.stat-value--good {
  color: #52c41a;
}

.stat-value--warning {
  color: #faad14;
}

.stat-value--poor {
  color: #ff4d4f;
}

/* 操作按钮 */
.control-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--primary {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.action-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #096dd9, #1890ff);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}

.action-btn--secondary {
  background: #ffffff;
  color: #64748b;
  border-color: #e5e7eb;
}

.action-btn--secondary:hover:not(:disabled) {
  background: #f8fafc;
  color: #374151;
  border-color: #cbd5e1;
}

/* 快捷控制 */
.animator-quick-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.quick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  color: #1890ff;
}

/* 演示区域 */
.demo-area {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 200px;
  height: 150px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 16px;
  z-index: 999;
}

.demo-connections {
  position: relative;
  width: 100%;
  height: 100%;
}

.demo-connection {
  position: absolute;
  width: 100%;
  height: 2px;
}

.demo-connection:nth-child(1) {
  top: 20px;
  transform: rotate(-5deg);
}

.demo-connection:nth-child(2) {
  top: 50%;
  transform: translateY(-50%);
}

.demo-connection:nth-child(3) {
  bottom: 20px;
  transform: rotate(5deg);
}

.demo-line {
  width: 100%;
  height: 100%;
  background: #1890ff;
  border-radius: 1px;
}

/* 演示动画 */
@keyframes demoFlow {
  0% { left: 0; }
  100% { left: 100%; }
}

@keyframes demoPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes demoBreathing {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .animator-control-panel {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 60vh;
    border-radius: 12px 12px 0 0;
  }

  .animator-control-panel--collapsed {
    width: 100%;
    max-height: auto;
  }

  .control-panel__content {
    max-height: calc(60vh - 70px);
  }

  .animator-quick-controls {
    bottom: 80px;
  }

  .demo-area {
    display: none;
  }

  .performance-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .control-panel__header {
    padding: 12px 16px;
  }

  .control-panel__content {
    padding: 12px 16px;
  }

  .section-title {
    font-size: 11px;
  }

  .control-label {
    font-size: 12px;
  }

  .action-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>