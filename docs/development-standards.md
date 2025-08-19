# AI招聘系统开发规范
## Development Standards - AI Recruitment System

### 📋 概述 Overview

本文档定义了AI招聘系统的编码标准、最佳实践和团队协作规范，确保代码质量一致性和项目可维护性。

### 🏗️ 项目架构规范 Project Architecture Standards

#### 目录结构标准
```
AI-Recruitment-Clerk/
├── apps/                          # 应用程序
│   ├── ai-recruitment-frontend/   # Angular前端应用
│   ├── app-gateway/               # API网关服务
│   ├── resume-parser-svc/         # 简历解析服务
│   ├── jd-extractor-svc/         # 职位描述提取服务
│   ├── scoring-engine-svc/       # 评分引擎服务
│   └── report-generator-svc/     # 报告生成服务
├── libs/                          # 共享库
│   └── shared-dtos/              # 共享数据传输对象
├── docs/                          # 项目文档
├── e2e/                          # 端到端测试
└── scripts/                      # 构建和部署脚本
```

#### 微服务设计原则
1. **单一职责**: 每个服务专注单一业务领域
2. **数据独立**: 每个服务管理自己的数据
3. **异步通信**: 使用NATS消息队列进行服务间通信
4. **故障隔离**: 服务失败不影响其他服务
5. **独立部署**: 每个服务可独立部署和扩展

### 💻 编码标准 Coding Standards

#### TypeScript配置标准

**严格模式要求** (所有项目必须启用):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 命名规范 Naming Conventions

**文件命名**:
- 组件: `component-name.component.ts`
- 服务: `service-name.service.ts`
- 模块: `module-name.module.ts`
- 接口: `interface-name.interface.ts`
- 枚举: `enum-name.enum.ts`
- 常量: `constants.ts`

**代码命名**:
```typescript
// 类名：PascalCase
class UserService {}
class ApiGatewayController {}

// 方法和变量：camelCase
const userId = '123';
function validateUser() {}

// 常量：UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// 接口：I前缀 + PascalCase
interface IUserRepository {}
interface IEmailService {}

// 枚举：PascalCase
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}
```

#### 组件规范 Component Standards

**Angular组件标准**:
```typescript
@Component({
  selector: 'arc-component-name',  // 统一前缀 'arc-'
  standalone: true,                // 优先使用独立组件
  imports: [CommonModule],         // 明确声明依赖
  templateUrl: './component.html', // 分离模板文件
  styleUrls: ['./component.scss']  // 分离样式文件
})
export class ComponentNameComponent implements OnInit, OnDestroy {
  // 使用生命周期接口
}
```

**组件大小限制**:
- 单个组件文件：≤300行
- 单个方法：≤50行
- 圈复杂度：≤10

#### 服务规范 Service Standards

**NestJS服务基础模式**:
```typescript
@Injectable()
export class ServiceName extends BaseService {
  constructor(
    // 依赖注入参数
  ) {
    super({
      serviceName: 'ServiceName',
      enableMetrics: true,
      enableCaching: true
    });
  }

  async methodName(): Promise<ReturnType> {
    return this.withTiming(async () => {
      // 业务逻辑
    }, 'methodName');
  }
}
```

### 🎨 代码格式化 Code Formatting

#### ESLint配置
使用项目根目录的`eslint.config.mjs`统一配置：
- Nx模块边界检查
- Angular特定规则
- TypeScript严格检查

#### Prettier配置
```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

#### 自动格式化
```bash
# 格式化所有文件
npm run format

# 检查代码规范
npm run lint
```

### 🧪 测试标准 Testing Standards

#### 测试策略
1. **单元测试**: 覆盖率≥80%
2. **集成测试**: 关键业务流程覆盖
3. **端到端测试**: 用户关键路径验证

#### 测试文件命名
- 单元测试: `*.spec.ts`
- 集成测试: `*.integration.spec.ts`
- 端到端测试: `*.e2e.spec.ts`

#### 测试结构标准
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(() => {
    // 测试设置
  });

  afterEach(() => {
    // 清理
  });

  describe('methodName', () => {
    it('should handle success case', () => {
      // Given - 准备数据
      // When - 执行操作
      // Then - 验证结果
    });

    it('should handle error case', () => {
      // 错误场景测试
    });
  });
});
```

### 🚨 错误处理规范 Error Handling Standards

#### 统一错误处理
使用`libs/shared-dtos/src/common/error-handling.patterns.ts`中的标准异常：

```typescript
// 业务逻辑错误
throw new BusinessLogicException('USER_NOT_FOUND', 'User does not exist');

// 验证错误
throw new ValidationException('Invalid input data', validationErrors);

// 外部服务错误
throw new ExternalServiceException('PaymentService', 'Payment failed');
```

#### 错误日志标准
```typescript
// 使用ErrorHandler统一处理
try {
  // 业务逻辑
} catch (error) {
  throw ErrorHandler.handleError(error, 'methodContext');
}
```

### 📚 文档规范 Documentation Standards

#### 代码注释
```typescript
/**
 * 用户服务 - 处理用户相关业务逻辑
 * User Service - Handles user-related business logic
 * 
 * @author TeamName
 * @since v1.0.0
 */
@Injectable()
export class UserService {
  /**
   * 创建新用户
   * Creates a new user
   * 
   * @param userData 用户数据
   * @returns Promise<User> 创建的用户对象
   * @throws {ValidationException} 当用户数据无效时
   */
  async createUser(userData: CreateUserDto): Promise<User> {
    // 实现
  }
}
```

#### API文档要求
- 所有公开API必须有OpenAPI文档
- 包含请求/响应示例
- 错误码和错误消息说明

### 🔄 Git工作流规范 Git Workflow Standards

#### 分支命名规范
- `feature/feature-name` - 新功能开发
- `bugfix/bug-description` - Bug修复
- `hotfix/critical-fix` - 紧急修复
- `refactor/refactor-scope` - 重构
- `docs/documentation-update` - 文档更新

#### 提交消息规范
```
type(scope): 简短描述

详细描述(可选)

相关Issue: #123
```

**类型标识**:
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/配置更新

#### 代码审查检查清单
- [ ] 代码符合项目编码规范
- [ ] 单元测试覆盖新功能/修复
- [ ] 文档已更新
- [ ] 无明显性能问题
- [ ] 错误处理完善
- [ ] 安全性检查通过

### 🔐 安全规范 Security Standards

#### 数据保护
1. **敏感数据**: 不得在日志中记录敏感信息
2. **密码存储**: 使用bcrypt等安全哈希算法
3. **API安全**: 实施JWT认证和授权
4. **输入验证**: 所有用户输入必须验证

#### 依赖安全
```bash
# 定期检查安全漏洞
npm audit

# 修复已知漏洞
npm audit fix
```

### 🚀 部署规范 Deployment Standards

#### 环境配置
- **开发环境**: 本地开发配置
- **测试环境**: 功能测试验证
- **预生产环境**: 生产环境镜像
- **生产环境**: 正式服务环境

#### 环境变量管理
```bash
# 必需环境变量
NODE_ENV=production
DATABASE_URL=***
JWT_SECRET=***
REDIS_URL=***
```

#### 部署检查清单
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 安全扫描通过
- [ ] 性能测试验证
- [ ] 数据库迁移准备
- [ ] 回滚计划确认

### 📊 性能规范 Performance Standards

#### 前端性能目标
- 首屏加载时间: <3秒 (3G网络)
- 应用包大小: <500KB (初始)
- 组件渲染时间: <100ms
- 内存使用: <100MB (移动端)

#### 后端性能目标
- API响应时间: <200ms (P95)
- 数据库查询: <100ms
- 内存使用: <512MB (单服务)
- CPU使用: <70% (正常负载)

#### 性能监控
```typescript
// 使用BaseService内置性能追踪
async performOperation(): Promise<Result> {
  return this.withTiming(async () => {
    // 业务操作
  }, 'operationName');
}
```

### 🔧 开发工具配置 Development Tools Configuration

#### VS Code推荐扩展
- Angular Language Service
- TypeScript Importer
- ESLint
- Prettier
- GitLens
- Jest Runner

#### IDE配置文件
项目包含`.vscode/settings.json`统一开发环境配置。

### 📈 代码质量监控 Code Quality Monitoring

#### 质量指标阈值
- 代码重复度: <5%
- 圈复杂度: <10
- 测试覆盖率: >80%
- TypeScript严格模式: 100%
- 技术债务: <5%

#### 持续集成检查
```bash
# 代码质量检查流水线
npm run lint        # 代码规范检查
npm run test        # 单元测试
npm run build       # 构建验证
npm audit          # 安全检查
```

### 🤝 团队协作规范 Team Collaboration Standards

#### 沟通规范
1. **技术讨论**: 在相关Issue或PR中进行
2. **设计决策**: 通过RFC文档记录
3. **知识分享**: 定期技术分享会
4. **问题解决**: 结对编程或代码审查

#### 知识管理
- 重要决策记录在`docs/architecture/`
- 常见问题整理在`docs/faq/`
- 最佳实践更新在此规范文档

### 📅 版本发布规范 Release Standards

#### 版本号规则
使用语义版本控制(SemVer):
- `MAJOR.MINOR.PATCH`
- 破坏性变更: MAJOR+1
- 新功能: MINOR+1
- Bug修复: PATCH+1

#### 发布流程
1. 代码冻结和测试验证
2. 版本号更新和CHANGELOG编写
3. 创建发布分支和标签
4. 部署到预生产环境验证
5. 生产环境发布
6. 发布后监控和验证

---

**文档版本**: v1.0  
**最后更新**: 2024年12月19日  
**维护团队**: 开发标准委员会

此规范文档将根据项目发展和团队反馈持续更新。所有团队成员应遵循这些标准，确保代码质量和项目可维护性。