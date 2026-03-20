# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Backend Image
FROM node:20-slim
WORKDIR /app
# 安装 sqlite3 编译所需的库 (虽然通常会有 prebuild，但安装这些比较稳)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
# 将前端构建产物复制到后端公共目录
COPY --from=frontend-build /app/frontend/dist ./public

ENV PORT=3000
ENV DATA_DIR=/app/data
ENV LOG_FILE_PATH=/etc/mosdns/mosdns.log

# 声明匿名卷，防止外部挂载覆盖 node_modules (关键！)
VOLUME ["/app/node_modules"]

EXPOSE 3000
CMD ["node", "index.js"]
