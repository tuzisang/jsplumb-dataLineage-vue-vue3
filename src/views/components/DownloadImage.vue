<template>
  <div class="download-image-container">
    <button 
      class="download-btn" 
      @click="handleDownload" 
      :disabled="isDownloading"
      :title="downloadTooltip"
    >
      <i class="download-icon">📸</i>
      <span v-if="!isDownloading">{{ downloadText }}</span>
      <span v-else>下载中...</span>
    </button>

    <!-- 下载选项弹窗 -->
    <div v-if="showOptions" class="download-options-modal" @click.self="closeOptions">
      <div class="options-content">
        <h3>下载选项</h3>
        
        <div class="option-group">
          <label>图片格式：</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="options.format" value="png">
              <span>PNG</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="options.format" value="jpeg">
              <span>JPEG</span>
            </label>
          </div>
        </div>

        <div class="option-group">
          <label>图片质量：</label>
          <input 
            type="range" 
            v-model="options.quality" 
            min="0.1" 
            max="1" 
            step="0.1"
            class="quality-slider"
          >
          <span class="quality-value">{{ Math.round(options.quality * 100) }}%</span>
        </div>

        <div class="option-group">
          <label>缩放比例：</label>
          <select v-model="options.scale" class="scale-select">
            <option value="1">1x (原始大小)</option>
            <option value="2">2x (高清)</option>
            <option value="3">3x (超清)</option>
          </select>
        </div>

        <div class="option-group checkbox-group">
          <label class="checkbox-option">
            <input type="checkbox" v-model="options.includeBackground">
            <span>包含背景</span>
          </label>
        </div>

        <div class="option-actions">
          <button class="btn-cancel" @click="closeOptions">取消</button>
          <button class="btn-download" @click="confirmDownload">确认下载</button>
        </div>
      </div>
    </div>

    <!-- 下载进度 -->
    <div v-if="isDownloading" class="download-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
      </div>
      <span class="progress-text">{{ downloadProgress }}%</span>
    </div>
  </div>
</template>

<script>
import domtoimage from 'dom-to-image-more'

export default {
  name: 'DownloadImage',
  props: {
    targetElement: {
      type: [String, HTMLElement],
      required: true
    },
    filename: {
      type: String,
      default: '血缘关系图'
    },
    lineageLevel: {
      type: String,
      default: 'column'
    },
    jsPlumbInstance: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      isDownloading: false,
      showOptions: false,
      downloadProgress: 0,
      options: {
        format: 'png',
        quality: 1,        // 最高质量
        scale: 3,          // 默认高清晰度
        includeBackground: true
      }
    }
  },
  computed: {
    downloadText() {
      return '下载图片'
    },
    downloadTooltip() {
      return this.lineageLevel === 'table' ? '下载表级血缘关系图' : '下载列级血缘关系图'
    }
  },
  methods: {
    handleDownload() {
      this.showOptions = true
    },
    closeOptions() {
      this.showOptions = false
    },
    async confirmDownload() {
      this.showOptions = false
      this.isDownloading = true
      this.downloadProgress = 0

      try {
        await this.downloadImage()
      } catch (error) {
        console.error('下载失败:', error)
        this.$emit('error', error)
      } finally {
        this.isDownloading = false
        this.downloadProgress = 0
      }
    },
    async downloadImage() {
      const target = typeof this.targetElement === 'string' 
        ? document.querySelector(this.targetElement) 
        : this.targetElement

      if (!target) {
        throw new Error('找不到目标元素')
      }

      // 显示加载提示
      this.$emit('start')

      // dom-to-image-more配置已集成在调用中，无需单独配置

      // 模拟进度
      this.simulateProgress()

      // 等待jsPlumb连线完全渲染
      await this.waitForRender()

      // 强制刷新jsPlumb连线
        await this.forceJsPlumbRender()

        // 额外等待jsPlumb渲染完成
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 在截图前临时调整文本样式，避免省略号
      this.temporarilyAdjustTextStyles(target)

      // 使用dom-to-image-more捕获高质量图片，并解决文本溢出问题
      let dataURL
      
      try {
        // 配置dom-to-image-more以获得最佳效果
        const options = {
          quality: this.options.quality,
          bgcolor: this.options.includeBackground ? '#ffffff' : null,
          width: target.scrollWidth,
          height: target.scrollHeight,
          
          // 关键：提高清晰度 - 使用更高倍率
          scale: parseFloat(this.options.scale) || 3,
          
          // 样式优化：确保文本完整显示和SVG正确渲染
            style: {
            // 表名样式 - 确保长表名完整显示，禁止换行
            '.table-node-name': {
              whiteSpace: 'nowrap !important',
              overflow: 'visible !important',
              textOverflow: 'clip !important',
              wordBreak: 'normal !important',
              maxWidth: 'none !important',
              width: 'auto !important',
              minWidth: 'max-content !important',
              padding: '8px 48px 8px 32px !important',
              fontSize: 'inherit !important',
              lineHeight: 'inherit !important',
              display: 'inline-block !important'
            },
              '.table-name': {
                  whiteSpace: 'nowrap !important',
                  overflow: 'visible !important',
                  textOverflow: 'clip !important',
                  wordBreak: 'normal !important',
                  maxWidth: 'none !important',
                  width: 'auto !important',
                  minWidth: 'max-content !important',
                  fontSize: 'inherit !important',
                  lineHeight: 'inherit !important',
                  display: 'inline-block !important',
                  padding: '8px 48px 8px 32px !important'
                },
              // 字段名样式
              '.field-name': {
                whiteSpace: 'nowrap !important',
                overflow: 'visible !important',
                textOverflow: 'clip !important',
                wordBreak: 'normal !important',
                maxWidth: 'none !important',
                width: 'auto !important',
                minWidth: 'max-content !important',
                fontSize: 'inherit !important',
                lineHeight: 'inherit !important',
                display: 'inline-block !important',
                padding: '6px 48px 6px 32px !important'
              },
              '.field-content .field-name': {
                whiteSpace: 'normal !important',
                overflow: 'visible !important',
                textOverflow: 'clip !important',
                wordBreak: 'break-word !important',
                maxWidth: 'none !important',
                width: 'auto !important',
                minWidth: 'auto !important',
                fontSize: 'inherit !important',
                lineHeight: 'inherit !important'
              },
              // 标题样式
              '.table-title': {
                whiteSpace: 'normal !important',
                overflow: 'visible !important',
                textOverflow: 'clip !important',
                wordBreak: 'break-word !important',
                maxWidth: 'none !important',
                width: 'auto !important',
                minWidth: 'auto !important',
                fontSize: 'inherit !important',
                lineHeight: 'inherit !important'
              },
              // 容器样式 - 确保不会截断内容
              '.table-container': {
                overflow: 'visible !important',
                maxWidth: 'none !important',
                width: 'auto !important',
                minWidth: 'auto !important'
              },
              '.table-node': {
              overflow: 'visible !important',
              width: 'auto !important',
              maxWidth: 'none !important',
              minWidth: 'max-content !important', // 根据内容自动扩展
              padding: '0 !important',
              display: 'inline-block !important'
            },
              // 确保SVG连线和文本正确渲染
              'svg': {
                width: '100%',
                height: '100%'
              },
              '.jtk-connector': {
                visibility: 'visible !important',
                opacity: '1 !important',
                stroke: '#666 !important',
                strokeWidth: '2 !important'
              },
              '.jtk-endpoint': {
                visibility: 'visible !important',
                opacity: '1 !important'
              },
              '.jtk-overlay': {
                visibility: 'visible !important',
                opacity: '1 !important'
              },
              // 强制字体渲染
              '*': {
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit'
              }
            },
          
          // 过滤器：排除不需要的元素
          filter: (node) => {
            if (!node || !node.classList) return true
            
            // 排除下载相关元素
            const excludeClasses = [
              'download-btn', 
              'download-options-modal', 
              'download-progress',
              'download-image-container'
            ]
            
            return !excludeClasses.some(cls => node.classList.contains(cls))
          }
        }

        // 根据格式选择对应的方法
        if (this.options.format === 'jpeg') {
          dataURL = await domtoimage.toJpeg(target, options)
        } else {
          dataURL = await domtoimage.toPng(target, options)
        }

      } catch (error) {
        console.error('dom-to-image-more失败:', error)
        throw error
      } finally {
        // 恢复原始文本样式
        this.restoreTextStyles(target)
      }

      // 如果需要添加水印，dom-to-image-more不支持直接添加，需要后续处理
      // 由于dom-to-image-more直接返回dataURL，这里不需要额外处理

      // 创建下载链接
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const levelText = this.lineageLevel === 'table' ? '表级' : '列级'
      
      // 根据格式确定扩展名
      const extension = this.options.format === 'jpeg' ? 'jpg' : this.options.format
      
      link.download = `${this.filename}_${levelText}_${timestamp}.${extension}`
      link.href = dataURL
      link.click()

      this.$emit('success')
    },
    simulateProgress() {
      const interval = setInterval(() => {
        if (this.downloadProgress < 90) {
          this.downloadProgress += Math.random() * 10
        } else {
          clearInterval(interval)
        }
      }, 200)
    },

    temporarilyAdjustTextStyles(target) {
      // 简化处理，因为现在已经在TableNode.vue中解决了文本截断问题
      // 只需要确保容器不会截断内容
      const containers = target.querySelectorAll('.table-container, .table-node')
      containers.forEach(container => {
        container.style.overflow = 'visible !important'
        container.style.maxWidth = 'none !important'
      })
    },

    restoreTextStyles(target) {
      // 样式恢复已简化，因为主要问题在TableNode.vue中已解决
    },

    async waitForRender() {
      // 等待jsPlumb渲染完成
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 触发父组件的jsPlumb重绘（如果可用）
      this.$emit('refresh-plumb')
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 强制触发重绘
      const target = typeof this.targetElement === 'string' 
        ? document.querySelector(this.targetElement) 
        : this.targetElement
      
      if (target) {
        // 触发浏览器重排
        target.style.transform = 'translateZ(0)'
        target.offsetHeight // 强制重排
        target.style.transform = ''
        
        // 额外等待确保SVG渲染
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    },

    async forceJsPlumbRender() {
      const target = typeof this.targetElement === 'string' 
        ? document.querySelector(this.targetElement) 
        : this.targetElement
      
      if (!target) return

      // 强制滚动到顶部，确保所有元素都在视图中
      window.scrollTo(0, 0)
      
      // 使用父组件的jsPlumb实例进行重绘
      if (this.jsPlumbInstance && this.jsPlumbInstance.repaintEverything) {
        console.log('使用父组件jsPlumb实例重绘')
        this.jsPlumbInstance.repaintEverything()
      }
      
      // 强制设置所有jsPlumb相关元素的样式
      const jsplumbSelectors = [
        '.jtk-connector',
        '.jtk-endpoint',
        '.jtk-overlay',
        '[class*="jsplumb"]',
        '[class*="jtk"]',
        'svg',
        'path'
      ]
      
      const jsplumbElements = target.querySelectorAll(jsplumbSelectors.join(', '))
      console.log('找到jsPlumb相关元素:', jsplumbElements.length)
      
      // 强制设置样式确保可见
      jsplumbElements.forEach(el => {
        if (el.style) {
          el.style.visibility = 'visible'
          el.style.opacity = '1'
          el.style.display = 'block'
          if (el.tagName === 'path' || el.tagName === 'line') {
            el.style.strokeOpacity = '1'
            el.style.fillOpacity = '1'
          }
        }
      })

      // 强制浏览器重排
      target.style.transform = 'translateZ(0)'
      target.offsetHeight // 触发重排
      target.style.transform = ''
      
      // 额外延迟确保渲染完成
      await new Promise(resolve => setTimeout(resolve, 1200))
    },

    addWatermark(canvas) {
      const ctx = canvas.getContext('2d')
      const fontSize = Math.max(12, canvas.width / 100)
      
      ctx.font = `${fontSize}px Arial`
      ctx.fillStyle = 'rgba(150, 150, 150, 0.3)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      
      const watermark = `血缘关系分析工具 - ${new Date().toLocaleDateString()}`
      const padding = 20
      
      ctx.fillText(watermark, canvas.width - padding, canvas.height - padding)
    }
  }
}
</script>

<style scoped>
.download-image-container {
  display: inline-block;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

.download-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
}

.download-btn:active:not(:disabled) {
  transform: translateY(0);
}

.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-icon {
  font-size: 16px;
}

.download-options-modal {
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
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.options-content h3 {
  margin: 0 0 20px 0;
  color: #262626;
  font-size: 18px;
}

.option-group {
  margin-bottom: 16px;
}

.option-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #595959;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.quality-slider {
  width: 100%;
  margin: 8px 0;
}

.quality-value {
  margin-left: 8px;
  color: #1890ff;
  font-weight: bold;
}

.scale-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.option-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel,
.btn-download {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: white;
  color: #595959;
}

.btn-cancel:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-download {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-download:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

.download-progress {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 10001;
  text-align: center;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #595959;
}
</style>