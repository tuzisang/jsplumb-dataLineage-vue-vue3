// @ts-ignore
import panzoom from 'panzoom';
// 封装的jsplumb的通用方法 和工具方法
const comm = {
    //添加端点
    addEndpoint(elID, anchorArr) {
        //AnchorArr 可能有多个锚点需要添加
        anchorArr.forEach(anchor => {
            this.jsplumbInstance.addEndpoint(elID, {
                anchors: anchor,
                uuid: elID.concat(this.minus, anchor)
            }, this.commConfig)
        })
    },
    //将端点连线
    connectEndpoint(from, to) {
        this.jsplumbInstance.connect({
            uuids: [from, to]
        }, this.commConfig);
    },
    //封装拖动，添加辅助对齐线功能
    draggableNode(nodeID) {
        this.jsplumbInstance.draggable(nodeID, {
            grid: this.commGrid,
            drag: (params) => {
                this.alignForLine(nodeID, params.pos)
            },
            start: () => {
            },
            stop: (params) => {
                this.auxiliaryLine.isShowXLine = false
                this.auxiliaryLine.isShowYLine = false
                this.changeNodePosition(nodeID, params.pos)
                this.redrawConnections()
            }
        })
    },
    //移动节点时，动态显示对齐线
    alignForLine(nodeID, position) {
        let showXLine = false, showYLine = false
        this.json.nodes.some(el => {
            if (el.name !== nodeID && el.left === position[0]) {
                this.auxiliaryLinePos.x = position[0];
                showYLine = true
            }
            if (el.name !== nodeID && el.top === position[1]) {
                this.auxiliaryLinePos.y = position[1];
                showXLine = true
            }
        })
        this.auxiliaryLine.isShowYLine = showYLine
        this.auxiliaryLine.isShowXLine = showXLine
    },
    changeNodePosition(nodeID, pos) {
        this.json.nodes.some(v => {
            if (nodeID === v.name) {
                v.left = pos[0]
                v.top = pos[1]
                return true
            } else {
                return false
            }
        })
    },
    //初始化缩放功能
    initPanZoom() {
        const mainContainer = this.jsplumbInstance.getContainer();
        const mainContainerWrap = mainContainer.parentNode;
        const pan = panzoom(mainContainer, {
            smoothScroll: true,
            bounds: false,
            // autocenter: true,
            zoomDoubleClickSpeed: 1,
            minZoom: 0.1,
            maxZoom: 3,
            //设置滚动缩放的组合键，默认不需要组合键
            beforeWheel: (e) => {
                // 允许滚轮缩放，不需要组合键
                return false;
            },
            beforeMouseDown: function (e) {
                // 允许鼠标拖拽平移，不需要组合键
                return false;
            }
        });
        this.jsplumbInstance.mainContainerWrap = mainContainerWrap;
        this.jsplumbInstance.pan = pan;
        // 缩放时设置jsPlumb的缩放比率
        pan.on("zoom", (e: any) => {
            const {x, y, scale} = e.getTransform();
            this.jsplumbInstance.setZoom(scale);
            //根据缩放比例，缩放对齐辅助线长度和位置
            this.auxiliaryLinePos.width = (1 / scale) * 100 + '%'
            this.auxiliaryLinePos.height = (1 / scale) * 100 + '%'
            this.auxiliaryLinePos.offsetX = -(x / scale)
            this.auxiliaryLinePos.offsetY = -(y / scale)
        });
        pan.on("panend", (e: any) => {
            const {x, y, scale} = e.getTransform();
            this.auxiliaryLinePos.width = (1 / scale) * 100 + '%'
            this.auxiliaryLinePos.height = (1 / scale) * 100 + '%'
            this.auxiliaryLinePos.offsetX = -(x / scale)
            this.auxiliaryLinePos.offsetY = -(y / scale)
        })
        // 平移时设置鼠标样式 - 优化版本
        mainContainerWrap.style.cursor = "move";
        
        // 使用优化的事件处理
        const wrapMousedown = function() {
            this.style.cursor = "grabbing";
        };
        
        const wrapMouseout = function() {
            this.style.cursor = "move";
        };
        
        const wrapMouseup = function() {
            this.style.cursor = "move";
        };
        
        // 添加事件监听器
        mainContainerWrap.addEventListener("mousedown", wrapMousedown);
        mainContainerWrap.addEventListener("mouseout", wrapMouseout);
        mainContainerWrap.addEventListener("mouseup", wrapMouseup);
        
        // 存储事件处理器引用，以便后续清理
        this.panzoomEventHandlers = {
            mousedown: wrapMousedown,
            mouseout: wrapMouseout,
            mouseup: wrapMouseup
        };
    },
    //初始化节点位置  （以便对齐,居中）
    fixNodesPosition() {
        if (this.json.nodes && this.$refs.flowWrap) {
            const nodeWidth = 120
            const nodeHeight = 40
            let wrapInfo = this.$refs.flowWrap.getBoundingClientRect()
            let maxLeft = 0,
                minLeft = Infinity,
                maxTop = 0,
                minTop = Infinity;
            let nodePoint = {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }
            let fixTop = 0,
                fixLeft = 0;
            this.json.nodes.forEach(el => {
                let top = el.top
                let left = el.left
                maxLeft = left > maxLeft ? left : maxLeft
                minLeft = left < minLeft ? left : minLeft
                maxTop = top > maxTop ? top : maxTop
                minTop = top < minTop ? top : minTop
            })
            
            // 如果节点位置都很小（比如都是50以内），说明是初始数据，需要重新布局
            if (maxLeft < 100 && maxTop < 100) {
                // 使用简单的网格布局
                this.json.nodes.forEach((node, index) => {
                    const row = Math.floor(index / 3); // 每行3个节点
                    const col = index % 3;
                    node.top = 100 + row * 150;
                    node.left = 100 + col * 300;
                });
            } else {
                // 计算画布中心位置 - 使用更合理的位置
                const canvasCenterX = 800; // 画布中心附近
                const canvasCenterY = 400; // 画布中心附近
                
                // 计算节点群的中心位置
                const nodesCenterX = (maxLeft + minLeft) / 2;
                const nodesCenterY = (maxTop + minTop) / 2;
                
                // 计算需要移动的距离，使节点群居中
                fixLeft = canvasCenterX - nodesCenterX;
                fixTop = canvasCenterY - nodesCenterY;

                this.json.nodes.map(el => {
                    let top = Number(el.top) + fixTop;
                    let left = Number(el.left) + fixLeft;
                    el.top = (Math.round(top / 20)) * 20
                    el.left = (Math.round(left / 20)) * 20
                })
            }
        }
    },
    // 轻量级重绘连接线，避免reset导致视角丢失
    redrawConnectionsSoft() {
        if (!this.jsplumbInstance) return;
        // 仅重新计算和绘制，而不改变平移缩放状态
        this.jsplumbInstance.repaintEverything();
    },
    // 保留原有redrawConnections但弃用reset
    redrawConnections() {
        this.redrawConnectionsSoft();
    }
}

export default comm
