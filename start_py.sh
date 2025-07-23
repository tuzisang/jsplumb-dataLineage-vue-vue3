#!/bin/bash

# --- 检查并杀死占用端口的进程 ---
PORT=5000 # 你的 Python 服务监听的端口

echo "正在检查端口 ${PORT} 上的进程..."
PID=$(lsof -t -i:${PORT} 2>/dev/null)

if [ -n "$PID" ]; then
    echo "发现端口 ${PORT} 上的进程: ${PID}"
    echo "正在杀死进程..."
    kill -9 "$PID"
    echo "进程已杀死。"
    sleep 1
else
    echo "端口 ${PORT} 上未发现任何进程。"
fi
# --- 端口检查结束 ---


# 1. 删除旧的虚拟环境目录
rm -rf venv

# 2. 创建新的虚拟环境，明确使用 python3
python3 -m venv venv

# 3. 激活虚拟环境
source venv/bin/activate

# 4. 安装项目所需的 Python 依赖
echo "正在安装项目依赖..."
pip install -r requirements.txt

# 5. 在后台启动 Python 服务，不记录日志
echo "正在后台启动 Python 服务..."
nohup python api/server.py > /dev/null 2>&1 &

echo "Python 服务已在后台启动 (无日志输出到终端)。"
echo "你可以使用以下命令检查其状态: ps aux | grep 'python api/server.py'"
echo "或者检查端口 ${PORT} 的占用情况: lsof -i:${PORT}"
