/**
 * 性能监控工具
 * 用于监控和优化引导和动画系统的性能
 */

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 60,
      frameTime: 0,
      memoryUsage: 0,
      animationCount: 0,
      renderTime: 0,
      eventLatency: 0
    };

    this.isMonitoring = false;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.monitoringInterval = null;
    this.rafId = null;

    // 性能阈值
    this.thresholds = {
      minFPS: 30,
      maxFrameTime: 33, // 30fps = 33ms per frame
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxAnimationCount: 10,
      maxRenderTime: 16 // 60fps = 16ms per frame
    };
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();

    // 开始帧率监控
    this.startFrameRateMonitoring();

    // 开始定期指标收集
    this.startMetricsCollection();

    console.log('性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('性能监控已停止');
  }

  /**
   * 开始帧率监控
   */
  startFrameRateMonitoring() {
    const measureFrame = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.metrics.frameTime = delta;

      this.frameCount++;

      // 每秒计算一次FPS
      if (delta >= 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / delta);
        this.frameCount = 0;
        this.lastFrameTime = now;

        // 检查性能警告
        this.checkPerformanceWarnings();
      }

      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * 开始定期指标收集
   */
  startMetricsCollection() {
    this.monitoringInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      this.collectMemoryUsage();
      this.reportMetrics();
    }, 1000);
  }

  /**
   * 收集内存使用情况
   */
  collectMemoryUsage() {
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
  }

  /**
   * 检查性能警告
   */
  checkPerformanceWarnings() {
    const warnings = [];

    if (this.metrics.fps < this.thresholds.minFPS) {
      warnings.push(`FPS过低: ${this.metrics.fps} < ${this.thresholds.minFPS}`);
    }

    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      warnings.push(`帧时间过长: ${this.metrics.frameTime.toFixed(2)}ms > ${this.thresholds.maxFrameTime}ms`);
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      warnings.push(`内存使用过高: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    if (this.metrics.animationCount > this.thresholds.maxAnimationCount) {
      warnings.push(`动画数量过多: ${this.metrics.animationCount} > ${this.thresholds.maxAnimationCount}`);
    }

    if (warnings.length > 0) {
      console.warn('性能警告:', warnings);
      this.emitPerformanceWarning(warnings);
    }
  }

  /**
   * 触发性能警告事件
   */
  emitPerformanceWarning(warnings) {
    const event = new CustomEvent('performance-warning', {
      detail: {
        warnings,
        metrics: { ...this.metrics },
        timestamp: performance.now()
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * 报告当前指标
   */
  reportMetrics() {
    const report = {
      ...this.metrics,
      timestamp: performance.now()
    };

    // 开发环境下输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log('性能指标:', {
        FPS: this.metrics.fps,
        '帧时间': `${this.metrics.frameTime.toFixed(2)}ms`,
        '内存使用': `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        '活动动画': this.metrics.animationCount
      });
    }

    // 触发性能指标事件
    const event = new CustomEvent('performance-metrics', { detail: report });
    window.dispatchEvent(event);
  }

  /**
   * 更新动画数量
   */
  updateAnimationCount(count) {
    this.metrics.animationCount = count;
  }

  /**
   * 更新渲染时间
   */
  updateRenderTime(time) {
    this.metrics.renderTime = time;
  }

  /**
   * 更新事件延迟
   */
  updateEventLatency(latency) {
    this.metrics.eventLatency = latency;
  }

  /**
   * 获取当前性能报告
   */
  getPerformanceReport() {
    return {
      current: { ...this.metrics },
      thresholds: { ...this.thresholds },
      status: this.getPerformanceStatus(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * 获取性能状态
   */
  getPerformanceStatus() {
    const score = this.calculatePerformanceScore();

    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * 计算性能分数
   */
  calculatePerformanceScore() {
    let score = 100;

    // FPS评分 (40%)
    const fpsScore = Math.min(100, (this.metrics.fps / 60) * 100);
    score = score * 0.6 + fpsScore * 0.4;

    // 内存使用评分 (20%)
    const memoryScore = Math.max(0, 100 - (this.metrics.memoryUsage / this.thresholds.maxMemoryUsage) * 100);
    score = score * 0.8 + memoryScore * 0.2;

    // 动画数量评分 (20%)
    const animationScore = Math.max(0, 100 - (this.metrics.animationCount / this.thresholds.maxAnimationCount) * 50);
    score = score * 0.8 + animationScore * 0.2;

    return Math.round(score);
  }

  /**
   * 获取性能优化建议
   */
  getRecommendations() {
    const recommendations = [];

    if (this.metrics.fps < 45) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: '帧率过低，建议启用性能模式或减少动画效果',
        action: 'enable-performance-mode'
      });
    }

    if (this.metrics.memoryUsage > 80 * 1024 * 1024) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: '内存使用较高，建议清理缓存或重启应用',
        action: 'clear-cache'
      });
    }

    if (this.metrics.animationCount > 8) {
      recommendations.push({
        type: 'animation',
        priority: 'medium',
        message: '动画数量较多，建议减少并发动画数量',
        action: 'reduce-animations'
      });
    }

    if (this.metrics.renderTime > 20) {
      recommendations.push({
        type: 'rendering',
        priority: 'high',
        message: '渲染时间过长，建议优化DOM操作或启用虚拟化',
        action: 'optimize-rendering'
      });
    }

    return recommendations;
  }

  /**
   * 应用性能优化建议
   */
  async applyRecommendation(recommendation) {
    switch (recommendation.action) {
      case 'enable-performance-mode':
        await this.enablePerformanceMode();
        break;
      case 'clear-cache':
        await this.clearCache();
        break;
      case 'reduce-animations':
        await this.reduceAnimations();
        break;
      case 'optimize-rendering':
        await this.optimizeRendering();
        break;
      default:
        console.warn('未知的优化建议:', recommendation.action);
    }
  }

  /**
   * 启用性能模式
   */
  async enablePerformanceMode() {
    // 触发性能模式启用事件
    const event = new CustomEvent('enable-performance-mode');
    window.dispatchEvent(event);
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    // 清理各种缓存
    if (window.caches) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map(name => window.caches.delete(name)));
    }

    // 触发缓存清理事件
    const event = new CustomEvent('clear-cache');
    window.dispatchEvent(event);
  }

  /**
   * 减少动画
   */
  async reduceAnimations() {
    // 触发动画减少事件
    const event = new CustomEvent('reduce-animations');
    window.dispatchEvent(event);
  }

  /**
   * 优化渲染
   */
  async optimizeRendering() {
    // 触发渲染优化事件
    const event = new CustomEvent('optimize-rendering');
    window.dispatchEvent(event);
  }
}

/**
 * 性能监控器单例
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor() {
  return {
    monitor: performanceMonitor,
    startMonitoring: () => performanceMonitor.startMonitoring(),
    stopMonitoring: () => performanceMonitor.stopMonitoring(),
    getReport: () => performanceMonitor.getPerformanceReport(),
    updateAnimationCount: (count) => performanceMonitor.updateAnimationCount(count),
    updateRenderTime: (time) => performanceMonitor.updateRenderTime(time)
  };
}

/**
 * 性能装饰器
 */
export function withPerformanceMonitoring(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args) {
    const startTime = performance.now();
    const result = await originalMethod.apply(this, args);
    const endTime = performance.now();

    performanceMonitor.updateRenderTime(endTime - startTime);

    return result;
  };

  return descriptor;
}

/**
 * 防抖性能监控
 */
export function createPerformanceDebounce(func, delay = 100) {
  let timeoutId;
  let lastCallTime = 0;

  return function (...args) {
    const now = performance.now();
    lastCallTime = now;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (now === lastCallTime) {
        performanceMonitor.updateEventLatency(performance.now() - now);
        func.apply(this, args);
      }
    }, delay);
  };
}

/**
 * 节流性能监控
 */
export function createPerformanceThrottle(func, limit = 16) {
  let inThrottle;
  let lastCallTime = 0;

  return function (...args) {
    const now = performance.now();

    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      lastCallTime = now;

      setTimeout(() => {
        inThrottle = false;
        performanceMonitor.updateEventLatency(now - lastCallTime);
      }, limit);
    }
  };
}

export default performanceMonitor;