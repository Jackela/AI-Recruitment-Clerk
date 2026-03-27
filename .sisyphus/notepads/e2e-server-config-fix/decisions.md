# E2E测试服务器配置修复

## 问题
CI日志显示：`e2e_smoke - Manage server lifecycle - FAILED`

## 根因
Angular 20+ 使用 `@angular/build:application` 构建器，输出结构如下：
```
dist/apps/ai-recruitment-frontend/
├── browser/
│   ├── index.html
│   ├── main.js
│   └── ...
└── server/
    └── ...
```

但CI配置中：`STATIC_DIR=dist/apps/ai-recruitment-frontend` 缺少 `browser` 子目录，导致proxy-server找不到静态文件。

## 修复

### 1. 更新CI配置 (`.github/workflows/ci.yml`)
```yaml
# 修复前
serve-command: 'STATIC_DIR=dist/apps/ai-recruitment-frontend node scripts/proxy-server.cjs'

# 修复后  
serve-command: 'STATIC_DIR=dist/apps/ai-recruitment-frontend/browser node scripts/proxy-server.cjs'
```

### 2. 增强proxy-server.cjs
- 添加智能路径检测函数 `getStaticDir()`
- 如果提供的STATIC_DIR包含browser子目录，自动使用它
- 支持多路径回退机制

## 验证
- proxy-server.cjs 语法检查通过
- 路径配置与Angular 20+构建输出结构一致
