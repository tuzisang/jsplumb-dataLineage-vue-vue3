<template>
  <div 
    class="minimap-container"
    :style="{
      width: width + 'px',
      height: height + 'px'
    }"
  >
    <div 
      class="minimap-content" 
      ref="minimapContent"
      @mousedown="handleContentMouseDown"
    >
      <!-- 缩略节点渲染 -->
      <div 
        v-for="node in nodes" 
        :key="node.name"
        class="minimap-node"
        :style="{
          left: (node.left * scale + offsetX) + 'px',
          top: (node.top * scale + offsetY) + 'px',
          width: nodeWidth * scale + 'px',
          height: getNodeHeight(node) * scale + 'px',
          backgroundColor: getNodeColor(node.type)
        }"
      ></div>
      
      <!-- 简化的连线 -->
      <svg class="minimap-connections" :width="width" :height="height">
        <line
          v-for="(edge, index) in edges"
          :key="'edge-' + index"
          :x1="getEdgePoint(edge, 'from').x"
          :y1="getEdgePoint(edge, 'from').y"
          :x2="getEdgePoint(edge, 'to').x"
          :y2="getEdgePoint(edge, 'to').y"
          stroke="#aaa"
          stroke-width="0.5"
        />
      </svg>
    </div>
    
    <!-- 视口指示器 -->
    <div 
      class="viewport-indicator"
      :style="viewportPosition"
      @mousedown.stop="handleViewportMouseDown"
    ></div>
    
    <!-- 缩放控制 -->
    <div class="minimap-controls">
      <button 
        class="minimap-control-btn" 
        @click="zoomIn"
        title="放大"
      >
        <span>+</span>
      </button>
      <button 
        class="minimap-control-btn" 
        @click="resetZoom"
        title="重置"
      >
        <span>⟳</span>
      </button>
      <button 
        class="minimap-control-btn" 
        @click="zoomOut"
        title="缩小"
      >
        <span>−</span>
      </button>
    </div>
  </div>
</template>

<script>
import colorFields from "../config/tableTypeMappingColor";

export default {
  name: "MiniMap",
  props: {
    // 节点数据
    nodes: {
      type: Array,
      default: () => []
    },
    // 边数据
    edges: {
      type: Array,
      default: () => []
    },
    // 当前视口变换信息
    transform: {
      type: Object,
      default: () => ({ x: 0, y: 0, scale: 1 })
    },
    // 容器尺寸
    containerSize: {
      type: Object,
      default: () => ({ width: 800, height: 600 })
    },
    // 小地图宽度
    width: {
      type: Number,
      default: 200
    },
    // 小地图高度
    height: {
      type: Number,
      default: 150
    },
    // 节点默认宽度
    nodeWidth: {
      type: Number,
      default: 200
    }
  },
  data() {
    return {
      // 小地图缩放比例
      scale: 0.05,
      // 节点位置偏移量
      offsetX: 0,
      offsetY: 0,
      // 缩放控制
      minScale: 0.01,
      maxScale: 0.2,
      scaleStep: 1.5, // 每次缩放的倍数
      initialScale: 0.05, // 保存初始计算的缩放比例
      // 视口指示器样式
      viewportPosition: {
        left: '0px',
        top: '0px',
        width: '50px',
        height: '50px'
      },
      // 拖动状态
      dragState: {
        isDragging: false,
        dragType: null, // 'viewport' 或 'canvas'
        startX: 0,
        startY: 0,
        startOffsetX: 0,
        startOffsetY: 0,
        startTransform: { x: 0, y: 0, scale: 1 }
      },
      // 视口矩形
      viewportRect: {
        left: 0,
        top: 0,
        width: 50,
        height: 50
      },
      // 上次点击时间，用于区分点击和拖动
      lastClickTime: 0,
      // 是否移动了鼠标，用于区分点击和拖动
      hasMoved: false,
      // 移动阈值
      moveThreshold: 3
    };
  },
  computed: {
    // 计算画布边界
    canvasBounds() {
      if (!this.nodes || this.nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
      }
      
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      
      this.nodes.forEach(node => {
        const nodeHeight = this.getNodeHeight(node);
        
        minX = Math.min(minX, node.left);
        minY = Math.min(minY, node.top);
        maxX = Math.max(maxX, node.left + this.nodeWidth);
        maxY = Math.max(maxY, node.top + nodeHeight);
      });
      
      // 添加更大的边距确保所有节点都能显示
      const padding = Math.max(200, Math.min(maxX - minX, maxY - minY) * 0.15);
      return {
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding
      };
    }
  },
  watch: {
    // 监听transform变化，更新视口指示器位置
    transform: {
      handler() {
        // 只有在非拖动状态下才更新视口指示器
        if (!this.dragState.isDragging) {
          // 仅更新视口指示器位置，不重新计算缩放比例
          this.updateViewportIndicator(false);
        }
      },
      deep: true,
      immediate: true
    },
    // 监听节点数据变化，只在初始加载时重新计算缩放比例
    nodes: {
      handler(newNodes, oldNodes) {
        // 只有在初始加载或节点数量变化时才重新计算缩放比例
        if (!oldNodes || oldNodes.length === 0 || newNodes.length !== oldNodes.length) {
          this.calculateScale();
          this.$nextTick(() => {
            this.updateViewportIndicator(true);
          });
        } else {
          // 否则只更新视口指示器位置
          this.$nextTick(() => {
            this.updateViewportIndicator(false);
          });
        }
      },
      deep: true
    },
    // 监听容器尺寸变化，只在尺寸显著变化时重新计算缩放比例
    containerSize: {
      handler(newSize, oldSize) {
        // 只有在尺寸显著变化时才重新计算缩放比例
        const significantChange = !oldSize || 
          Math.abs(newSize.width - oldSize.width) > 50 || 
          Math.abs(newSize.height - oldSize.height) > 50;
          
        if (significantChange) {
          this.calculateScale();
          this.$nextTick(() => {
            this.updateViewportIndicator(true);
          });
        } else {
          // 否则只更新视口指示器位置
          this.$nextTick(() => {
            this.updateViewportIndicator(false);
          });
        }
      },
      deep: true
    }
  },
  mounted() {
    // 计算适当的缩放比例
    this.calculateScale();
    
    // 尝试加载用户保存的缩放比例
    try {
      const savedScale = localStorage.getItem('minimap_scale');
      if (savedScale && !isNaN(parseFloat(savedScale))) {
        const userScale = parseFloat(savedScale);
        if (userScale >= this.minScale && userScale <= this.maxScale) {
          this.scale = userScale;
          // 更新节点位置
          this.updateNodePositions();
        }
      }
    } catch (e) {
      console.warn('无法加载保存的小地图缩放比例', e);
    }
    
    // 添加全局事件监听
    window.addEventListener('mousemove', this.handleGlobalMouseMove);
    window.addEventListener('mouseup', this.handleGlobalMouseUp);
    
    // 监听自定义更新事件
    window.addEventListener('minimap-update', this.forceUpdateViewport);
    
    // 初始化视口指示器
    this.$nextTick(() => {
      this.updateViewportIndicator(true);
    });
  },
  beforeUnmount() {
    // 移除全局事件监听
    window.removeEventListener('mousemove', this.handleGlobalMouseMove);
    window.removeEventListener('mouseup', this.handleGlobalMouseUp);
    window.removeEventListener('minimap-update', this.forceUpdateViewport);
  },
  methods: {
    // 获取节点颜色
    getNodeColor(type) {
      for (let item in colorFields) {
        if (type === colorFields[item].type) {
          return colorFields[item].color;
        }
      }
      return '#ccc'; // 默认颜色
    },
    
    // 获取节点高度
    getNodeHeight(node) {
      // 根据字段数量计算节点高度
      const fieldsCount = node.fields ? node.fields.length : 0;
      return 40 + fieldsCount * 25; // 表头高度 + 字段高度
    },
    
    // 获取边的端点坐标
    getEdgePoint(edge, type) {
      const node = this.nodes.find(n => n.name === edge[type].name);
      if (!node) return { x: 0, y: 0 };
      
      const nodeHeight = this.getNodeHeight(node);
      
      // 简化处理：从节点中心连线
      return {
        x: (node.left + this.nodeWidth / 2) * this.scale + this.offsetX,
        y: (node.top + nodeHeight / 2) * this.scale + this.offsetY
      };
    },
    
    // 计算合适的缩放比例
    calculateScale() {
      if (!this.nodes || this.nodes.length === 0) return;
      
      const { minX, minY, maxX, maxY } = this.canvasBounds;
      const canvasWidth = maxX - minX;
      const canvasHeight = maxY - minY;
      
      // 根据画布尺寸和小地图尺寸计算缩放比例
      const scaleX = (this.width - 20) / canvasWidth; // 减去一些边距
      const scaleY = (this.height - 20) / canvasHeight;
      
      // 取较小值确保完全显示，并进一步缩小以确保边缘节点可见
      const calculatedScale = Math.min(scaleX, scaleY) * 0.85;
      
      // 保存初始计算的缩放比例，用于重置
      this.initialScale = calculatedScale;
      
      // 设置当前缩放比例
      this.scale = calculatedScale;
      
      // 更新节点位置偏移量，使节点居中显示
      this.updateNodePositions();
    },
    
    // 更新节点位置，使其居中显示
    updateNodePositions() {
      if (!this.nodes || this.nodes.length === 0) return;
      
      const { minX, minY, maxX, maxY } = this.canvasBounds;
      const canvasWidth = maxX - minX;
      const canvasHeight = maxY - minY;
      
      // 计算偏移量，使节点居中
      this.offsetX = (this.width - canvasWidth * this.scale) / 2;
      this.offsetY = (this.height - canvasHeight * this.scale) / 2;
      
      // 确保偏移量不会导致节点超出可视区域
      this.offsetX = Math.max(10, this.offsetX);
      this.offsetY = Math.max(10, this.offsetY);
    },
    
    // 更新视口指示器
    updateViewportIndicator(recalculateScale = true) {
      const { x, y, scale } = this.transform;
      const { width, height } = this.containerSize;

      // 计算主画布的可视区域在整个画布中的比例
      // 视口宽高 = 容器尺寸 / 缩放比例
      const viewportRealWidth = width / scale;
      const viewportRealHeight = height / scale;
      
      // 计算视口在小地图中的位置和大小
      // 小地图中的视口尺寸 = 实际视口尺寸 * 小地图缩放比例
      const viewportWidth = Math.min(viewportRealWidth * this.scale, this.width - 10);
      const viewportHeight = Math.min(viewportRealHeight * this.scale, this.height - 10);

      // 计算视口左上角在小地图中的位置
      // 关键修复：需要考虑主画布的缩放比例
      // 视口左上角 = (主画布左上角位置 / 主画布缩放比例) * 小地图缩放比例 + 小地图偏移量
      let viewportLeft = (-x / scale) * this.scale + this.offsetX;
      let viewportTop = (-y / scale) * this.scale + this.offsetY;

      // 限制视口指示器在小地图内
      const maxLeft = this.width - viewportWidth - 5;
      const maxTop = this.height - viewportHeight - 5;
      
      viewportLeft = Math.max(5, Math.min(maxLeft, viewportLeft));
      viewportTop = Math.max(5, Math.min(maxTop, viewportTop));

      // 保存视口矩形信息
      this.viewportRect = {
        left: viewportLeft,
        top: viewportTop,
        width: viewportWidth,
        height: viewportHeight
      };

      // 更新视口指示器样式
      this.viewportPosition = {
        left: viewportLeft + 'px',
        top: viewportTop + 'px',
        width: viewportWidth + 'px',
        height: viewportHeight + 'px'
      };
    },
    
    // 强制更新视口指示器样式
    forceUpdateViewport() {
      // 更新视口指示器，但不重新计算缩放比例
      this.updateViewportIndicator(false);
      
      // 延迟再次更新，确保在动画完成后位置正确
      setTimeout(() => {
        this.updateViewportIndicator(false);
      }, 50);
    },
    
    // 处理小地图内容区域的鼠标按下事件
    handleContentMouseDown(event) {
      // 记录点击时间，用于区分点击和拖动
      this.lastClickTime = Date.now();
      this.hasMoved = false;
      
      // 检查是否点击在视口指示器上
      const rect = this.$refs.minimapContent.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      const { left, top, width, height } = this.viewportRect;
      
      // 如果点击在视口指示器上，不处理（让视口指示器的mousedown事件处理）
      if (
        clickX >= left && 
        clickX <= left + width && 
        clickY >= top && 
        clickY <= top + height
      ) {
        return;
      }
      
      // 开始画布拖动
      this.dragState = {
        isDragging: true,
        dragType: 'canvas',
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: this.offsetX,
        startOffsetY: this.offsetY
      };
      
      // 添加拖动时的样式
      document.body.style.cursor = 'grabbing';
      
      // 阻止事件冒泡和默认行为
      event.stopPropagation();
      event.preventDefault();
    },
    
    // 处理视口指示器的鼠标按下事件
    handleViewportMouseDown(event) {
      // 获取小地图容器位置
      const rect = this.$refs.minimapContent.getBoundingClientRect();
      // 记录相对于小地图容器的起始坐标
      const startX = event.clientX - rect.left;
      const startY = event.clientY - rect.top;
      
      // 开始视口指示器拖动
      this.dragState = {
        isDragging: true,
        dragType: 'viewport',
        startX: startX,
        startY: startY,
        startTransform: { ...this.transform }
      };
      
      // 添加拖动时的样式
      document.body.style.cursor = 'grabbing';
      
      // 阻止事件冒泡和默认行为
      event.stopPropagation();
      event.preventDefault();
    },
    
    // 处理全局鼠标移动
    handleGlobalMouseMove(event) {
      if (!this.dragState.isDragging) return;
      
      // 标记已经移动
      this.hasMoved = true;
      
      if (this.dragState.dragType === 'viewport') {
        // 处理视口指示器拖动
        // 获取小地图容器位置
        const rect = this.$refs.minimapContent.getBoundingClientRect();
        // 计算鼠标在小地图容器内的坐标
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // 计算鼠标移动的实际距离（考虑小地图缩放比例）
        const deltaX = (mouseX - this.dragState.startX) / this.scale;
        const deltaY = (mouseY - this.dragState.startY) / this.scale;
        
        // 计算新的视图位置
        // 关键修复：需要考虑主画布的缩放比例
        const newX = this.dragState.startTransform.x - deltaX * this.dragState.startTransform.scale;
        const newY = this.dragState.startTransform.y - deltaY * this.dragState.startTransform.scale;
        
        // 发送导航事件
        this.$emit('navigate', { x: newX, y: newY });
      } else if (this.dragState.dragType === 'canvas') {
        // 处理画布拖动
        const deltaX = event.clientX - this.dragState.startX;
        const deltaY = event.clientY - this.dragState.startY;
        
        // 更新节点位置偏移量
        this.offsetX = this.dragState.startOffsetX + deltaX;
        this.offsetY = this.dragState.startOffsetY + deltaY;
        
        // 更新视口指示器，但不重新计算缩放比例
        this.updateViewportIndicator(false);
      }
      
      // 阻止事件冒泡和默认行为
      event.stopPropagation();
      event.preventDefault();
    },
    
    // 处理全局鼠标松开
    handleGlobalMouseUp(event) {
      if (!this.dragState.isDragging) return;
      
      // 检查是否是点击操作（短时间内没有移动）
      const isClick = !this.hasMoved && 
                      (Date.now() - this.lastClickTime < 300) && 
                      this.dragState.dragType === 'canvas';
      
      // 结束拖动状态
      this.dragState.isDragging = false;
      
      // 恢复默认光标
      document.body.style.cursor = '';
      
      // 如果是点击操作，处理导航
      if (isClick) {
        this.handleMinimapClick(event);
      }
    },
    
    // 处理小地图点击导航
    handleMinimapClick(event) {
      const rect = this.$refs.minimapContent.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      // 计算点击位置对应的实际坐标
      // 实际坐标 = (小地图中的点击位置 - 小地图偏移量) / 小地图缩放比例
      const targetX = (clickX - this.offsetX) / this.scale;
      const targetY = (clickY - this.offsetY) / this.scale;
      
      // 计算新的transform值
      // 考虑到视口中心，需要减去视口一半的宽高
      // 关键修复：需要考虑主画布的缩放比例
      const viewportHalfWidth = this.containerSize.width / (2 * this.transform.scale);
      const viewportHalfHeight = this.containerSize.height / (2 * this.transform.scale);
      
      const newX = -(targetX - viewportHalfWidth);
      const newY = -(targetY - viewportHalfHeight);
      
      // 发送导航事件，将视口中心移动到点击位置
      this.$emit('navigate', { x: newX, y: newY });
    },
    
    // 放大小地图
    zoomIn() {
      const newScale = Math.min(this.scale * this.scaleStep, this.maxScale);
      this.updateScale(newScale);
    },
    
    // 缩小小地图
    zoomOut() {
      const newScale = Math.max(this.scale / this.scaleStep, this.minScale);
      this.updateScale(newScale);
    },
    
    // 重置缩放
    resetZoom() {
      this.updateScale(this.initialScale);
    },
    
    // 更新缩放比例
    updateScale(newScale) {
      // 记录当前缩放比例
      const oldScale = this.scale;
      
      // 更新缩放比例
      this.scale = newScale;
      
      // 更新节点位置，保持视口中心不变
      this.updateNodePositions();
      
      // 更新视口指示器，强制使用新的缩放比例
      this.updateViewportIndicator(true);
      
      // 记录用户手动设置的缩放比例
      if (newScale === this.initialScale) {
        // 如果是重置操作，记录初始缩放比例
        localStorage.setItem('minimap_scale', '');
      } else {
        // 如果是用户手动缩放，记录缩放比例
        localStorage.setItem('minimap_scale', newScale.toString());
      }
    }
  }
};
</script>

<style scoped>
.minimap-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e6eaf0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  font-size: 0; /* 消除内部元素间的空白 */
}

.minimap-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
}

.minimap-node {
  position: absolute;
  min-width: 2px;
  min-height: 2px;
  border-radius: 2px;
  opacity: 0.8;
  box-sizing: border-box;
}

.minimap-connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.viewport-indicator {
  position: absolute;
  border: 2px solid #1890ff;
  background: rgba(24, 144, 255, 0.1);
  cursor: move;
  z-index: 10;
  pointer-events: auto;
}

/* 缩放控制样式 */
.minimap-controls {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 3;
}

.minimap-control-btn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.8);
  color: #666;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.minimap-control-btn:hover {
  background: rgba(255, 255, 255, 1);
  color: #1890ff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.minimap-control-btn:active {
  transform: scale(0.95);
}
</style>