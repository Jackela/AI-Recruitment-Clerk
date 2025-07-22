# 📚 Documentation Index | 文档索引

> **AI Recruitment Clerk - Complete Documentation Guide**  
> **AI 招聘助理 - 完整文档指南**

## 🌐 Language Selection | 语言选择

| Language | Version | Status |
|----------|---------|--------|
| **English** | [README.md](./README.md) | ✅ Complete |
| **中文** | [README.zh-CN.md](./README.zh-CN.md) | ✅ 完整 |

## 📖 Core Documentation | 核心文档

### English Documentation
| Document Type | File Path | Description |
|---------------|-----------|-------------|
| 🏠 **Main README** | [README.md](./README.md) | Project overview and quick start |
| 🔖 **Project Overview** | [docs/en-US/PROJECT_OVERVIEW.md](./docs/en-US/PROJECT_OVERVIEW.md) | Complete architecture and development status |
| 📈 **Development Status** | [docs/en-US/DEVELOPMENT_STATUS.md](./docs/en-US/DEVELOPMENT_STATUS.md) | Progress tracking and milestones |
| 🏗 **Architecture Summary** | [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md) | Technical architecture deep dive |
| 👨‍💻 **Developer Guide** | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Development environment and standards |

### 中文文档
| 文档类型 | 文件路径 | 描述 |
|----------|----------|------|
| 🏠 **主要说明** | [README.zh-CN.md](./README.zh-CN.md) | 项目概述和快速开始 |
| 🔖 **项目概览** | [docs/zh-CN/PROJECT_OVERVIEW.zh-CN.md](./docs/zh-CN/PROJECT_OVERVIEW.zh-CN.md) | 完整架构和开发状态 |
| 📈 **开发状态** | [docs/zh-CN/DEVELOPMENT_STATUS.zh-CN.md](./docs/zh-CN/DEVELOPMENT_STATUS.zh-CN.md) | 进度跟踪和里程碑 |
| 🏗 **架构总结** | [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md) | 技术架构深入解析 |
| 👨‍💻 **开发指南** | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | 开发环境和规范 |

## 📋 Specifications & Requirements | 规格说明与需求

| Document | Path | Language | Description |
|----------|------|----------|-------------|
| Project Mission | [specs/PROJECT_MISSION.md](./specs/PROJECT_MISSION.md) | 中文 | Core mission and objectives |
| System Context | [specs/SYSTEM_CONTEXT.mermaid](./specs/SYSTEM_CONTEXT.mermaid) | Diagram | System boundary diagram |
| API Specification | [specs/api_spec.openapi.yml](./specs/api_spec.openapi.yml) | YAML | RESTful API definitions |
| Data Models | [specs/data_models.ts](./specs/data_models.ts) | TypeScript | Data model migration reference |

## 🏢 Business Documentation | 商业文档

| Document Type | File Path | Language | Description |
|---------------|-----------|----------|-------------|
| Business Requirements | [documents/商业需求文档 (BRD).md](./documents/商业需求文档%20(Business%20Requirements%20Document,%20BRD).md) | 中文 | Business requirements analysis |
| High-Level Design | [documents/概要设计文档 (HLD).md](./documents/概要设计文档%20(High-Level%20Design,%20HLD)_%20AI%20招聘助理.md) | 中文 | System architecture design |
| Low-Level Design | [documents/详细设计文档 (LLD).md](./documents/详细设计文档%20(Low-Level%20Design,%20LLD)_%20AI%20招聘助理.md) | 中文 | Detailed technical implementation |

## 🛠 Technical Documentation | 技术文档

### Shared Libraries | 共享库
| Component | Path | Description |
|-----------|------|-------------|
| Shared DTOs | [libs/shared-dtos/](./libs/shared-dtos/) | Unified data models and events |
| Package Config | [libs/shared-dtos/package.json](./libs/shared-dtos/package.json) | Library configuration |

### Service Documentation | 服务文档
| Service | Test Coverage | Status | Key Files |
|---------|---------------|--------|-----------|
| **Resume Parser** ⭐ | **240+ tests** | TDD Ready | [apps/resume-parser-svc/](./apps/resume-parser-svc/) |
| **JD Extractor** | Architecture Complete | Planning | [apps/jd-extractor-svc/](./apps/jd-extractor-svc/) |
| **Scoring Engine** | Architecture Complete | Planning | [apps/scoring-engine-svc/](./apps/scoring-engine-svc/) |
| **API Gateway** | Basic Implementation | Active | [apps/app-gateway/](./apps/app-gateway/) |

## 🧪 Testing Documentation | 测试文档

### Resume Parser Service Test Suite ⭐
| Test File | Test Count | Focus Area |
|-----------|------------|-----------|
| [parsing.service.spec.ts](./apps/resume-parser-svc/src/parsing/parsing.service.spec.ts) | 35 | Core business flow, **Test 4** |
| [vision-llm.service.spec.ts](./apps/resume-parser-svc/src/vision-llm/vision-llm.service.spec.ts) | 46 | Vision LLM integration |
| [gridfs.service.spec.ts](./apps/resume-parser-svc/src/gridfs/gridfs.service.spec.ts) | 58 | File storage operations |
| [field-mapper.service.spec.ts](./apps/resume-parser-svc/src/field-mapper/field-mapper.service.spec.ts) | 46 | Data normalization |
| [nats.client.spec.ts](./apps/resume-parser-svc/src/nats/nats.client.spec.ts) | 55 | Event messaging |

**Total Test Coverage**: **240+ comprehensive unit tests**

## 🎯 Key Features & Highlights | 重点功能与亮点

### Test 4: Event Payload Verification 🎯
- **Primary Focus**: `analysis.resume.parsed` event structure validation
- **Location**: `apps/resume-parser-svc/src/parsing/parsing.service.spec.ts:368-406`
- **Purpose**: Ensure correct jobId, resumeId, and structured resumeDto in published events

### TDD Methodology Success ✅
- **Red-Green-Refactor** cycle implementation
- Complete mock strategies with `jest.mock()` and `jest.spyOn()`
- Expected failure patterns for unimplemented methods
- High test coverage (>95% target for Resume Parser Service)

## 🔄 Development Workflow | 开发工作流程

### Current Phase: Phase 2 Implementation
1. **Completed** ✅: Architecture design and comprehensive testing
2. **In Progress** 🔄: Resume Parser Service business logic implementation
3. **Next Steps** 📋: Other services testing and integration

### Quick Commands | 常用命令

```bash
# Install dependencies | 安装依赖
pnpm install

# Run all tests | 运行所有测试
pnpm exec nx run-many --target=test --all

# Build all services | 构建所有服务
pnpm exec nx run-many --target=build --all

# Start specific service | 启动特定服务
pnpm exec nx serve resume-parser-svc
```

## 📊 Project Status Dashboard | 项目状态面板

| Metric | Value | Status |
|--------|-------|--------|
| **Architecture Design** | 100% | ✅ Complete |
| **Resume Parser Tests** | 240+ tests | ✅ Complete |
| **Shared Libraries** | DTO Migration | ✅ Complete |
| **Business Logic** | Implementation | 🔄 In Progress |
| **Integration Testing** | Planning | 📋 Pending |

## 🤝 Contributing | 贡献指南

1. Follow TDD methodology | 遵循TDD方法论
2. Maintain >90% test coverage | 保持>90%测试覆盖率
3. Use TypeScript strict mode | 使用TypeScript严格模式
4. Follow NestJS best practices | 遵循NestJS最佳实践
5. Update documentation | 更新文档

---

**Documentation Status**: ✅ Complete Bilingual Coverage  
**Last Updated**: 2025-07-22  
**Next Review**: 2025-07-25

> 💡 **Quick Navigation**: Use Ctrl+F to search for specific topics or file paths in this index.