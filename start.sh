#!/usr/bin/env bash
# 尼泊尔泥石流 3D 动力学仿真系统启动脚本

cd "$(dirname "$0")"

PORT=8090
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "======================================================="
echo " 🏔️ 尼泊尔喜马拉雅泥石流灾害 3D 动态仿真系统"
echo " NEPAL DEBRIS FLOW DYNAMICS & RISK EVALUATION 3D"
echo "======================================================="
echo " 本地服务正在启动: http://localhost:$PORT"
echo " 请在浏览器中打开上方链接即可体验 60 FPS 动态演示"
echo "======================================================="

if which xdg-open > /dev/null 2>&1; then
  xdg-open "http://localhost:$PORT" &
fi

python3 -m http.server $PORT
