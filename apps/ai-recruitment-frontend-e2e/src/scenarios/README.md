# 复杂端到端场景测试 (Complex E2E Scenarios)

本目录包含 8 个复杂的端到端用户场景测试，覆盖完整的业务流程和边缘情况。

## 测试文件列表

| 序号 | 文件名                                   | 描述               | 主要测试点                                          |
| ---- | ---------------------------------------- | ------------------ | --------------------------------------------------- |
| 1    | `complete-hiring-flow.spec.ts`           | 完整招聘流程       | 端到端业务流程：创建职位→上传简历→分析匹配→生成报告 |
| 2    | `concurrent-users.spec.ts`               | 多用户并发场景     | 同时操作、数据一致性、并发编辑处理                  |
| 3    | `error-recovery.spec.ts`                 | 错误恢复场景       | 网络中断、服务器错误、超时恢复、token 过期          |
| 4    | `security/permission-escalation.spec.ts` | 权限升级防护       | 未授权访问、IDOR 攻击防护、角色边界                 |
| 5    | `data-consistency.spec.ts`               | 数据一致性场景     | 删除后计数更新、缓存一致性、搜索同步                |
| 6    | `session-management.spec.ts`             | 会话管理和超时     | 自动登出、多设备会话、记住我功能                    |
| 7    | `bulk-operations.spec.ts`                | 批量操作场景       | CSV 导入、批量删除、批量导出、批量分析              |
| 8    | `cross-browser-session.spec.ts`          | 跨浏览器会话持久性 | 页面刷新、多标签页、离线同步                        |

## 运行测试

### 运行所有场景测试

```bash
npx playwright test src/scenarios/
```

### 运行特定场景

```bash
# 完整招聘流程
npx playwright test src/scenarios/complete-hiring-flow.spec.ts

# 并发用户测试
npx playwright test src/scenarios/concurrent-users.spec.ts

# 安全测试
npx playwright test src/scenarios/security/
```

### 带 UI 模式运行

```bash
npx playwright test src/scenarios/ --ui
```

## 测试覆盖范围

### 业务流程 (Business Flows)

- ✅ 完整招聘周期
- ✅ 多候选人申请流程
- ✅ 候选人排名和比较
- ✅ 报告生成和下载

### 并发与性能 (Concurrency)

- ✅ 多用户同时操作
- ✅ 并发数据修改
- ✅ 文件上传并发

### 错误处理 (Error Handling)

- ✅ 网络中断恢复
- ✅ 服务器错误重试
- ✅ 超时处理
- ✅ 认证失败恢复

### 安全性 (Security)

- ✅ 权限控制验证
- ✅ API 端点保护
- ✅ 数据访问隔离
- ✅ JWT 验证

### 数据完整性 (Data Integrity)

- ✅ 删除后状态更新
- ✅ 跨页面数据同步
- ✅ 批量操作一致性
- ✅ 搜索索引更新

### 会话管理 (Session Management)

- ✅ 会话超时处理
- ✅ 多设备登录
- ✅ 强制登出
- ✅ Token 刷新

## 注意事项

1. **测试隔离**: 每个测试使用独立的浏览器上下文，确保测试间不相互影响
2. **等待策略**: 使用显式等待处理异步操作和网络延迟
3. **错误处理**: 测试包含错误恢复和边界情况验证
4. **数据准备**: 测试使用 `test-data.ts` 中的 fixtures 进行数据准备

## 扩展指南

添加新场景测试时：

1. 在 `src/scenarios/` 目录下创建新的 `.spec.ts` 文件
2. 使用已有的 Page Objects 和 helpers
3. 从 `test-data.ts` 导入测试数据
4. 添加详细的测试描述和注释
5. 更新本 README 文件
