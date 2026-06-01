# E2E测试修复记录

## 问题

E2E测试服务器启动失败：Manage server lifecycle - FAILED

## 根本原因

CI配置中 `verify-build-output` 路径与 Angular 17+ 构建输出结构不匹配

### 错误配置

```yaml
verify-build-output: 'dist/apps/ai-recruitment-frontend'
```

### 正确配置

```yaml
verify-build-output: 'dist/apps/ai-recruitment-frontend/browser'
```

## 技术细节

- Angular 17+ 使用 `@angular/build:application` executor
- 构建输出默认放在 `browser` 子目录下
- proxy-server.cjs 明确期望 `browser` 子目录中的静态文件
- server-lifecycle action 在构建后验证目录存在性

## 修复文件

- `.github/workflows/ci.yml` 第271行

## 修复时间

2026-03-27
