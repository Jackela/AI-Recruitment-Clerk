# **AI Recruitment Clerk — 详细设计文档 v2.0**

版本: 2.0  
状态: 基线 (Baseline)  
上次更新: 2025-07-22  
核心架构: 事件驱动微服务 (Event-Driven Microservices) on MEAN Stack (MongoDB, Express/NestJS, Angular, Node.js)

### **1\. 设计原则与目标**

本文档继承并扩展 v1.3 设计，遵循以下核心原则：

* **单一职责原则 (Single Responsibility Principle)**: 每个微服务聚焦于一个独立的业务领域。  
* **契约驱动开发 (Contract-Driven Development)**: 服务间的通信严格遵循预定义的事件（NATS Subjects）和数据（DTO）模式。  
* **函数式核心，命令式外壳 (Functional Core, Imperative Shell)**: 业务逻辑使用纯函数实现，副作用（IO、DB、网络）被隔离在外层。  
* **可观测性优先 (Observability-First)**: 所有服务内置日志、追踪和指标，便于监控和调试。  
* **安全与合规内建 (Security & Compliance by Design)**: 在架构的每一层都嵌入安全和合规性考量。

### **2\. 系统架构总览**

系统由 Angular SPA 前端、一个 API 网关和多个后端微服务构成，通过 NATS JetStream 事件总线进行异步通信。

graph TD  
    subgraph User Facing  
        A\[Angular SPA\]  
    end

    subgraph Backend Services  
        B\[API Gateway (NestJS)\]  
        C\[JD Extractor Svc\]  
        D\[Resume Parser Svc\]  
        E\[Field Mapper Svc\]  
        F\[Scoring Engine Svc\]  
        G\[Report Generator Svc\]  
    end

    subgraph Data & Messaging  
        H\[(NATS JetStream)\]  
        I\[(MongoDB Atlas)\]  
        J\[(Mongo GridFS)\]  
    end

    A \-- REST/HTTPS \--\> B  
    B \-- Publishes Events \--\> H  
    C \-- Subscribes/Publishes \--\> H  
    D \-- Subscribes/Publishes \--\> H  
    E \-- Subscribes/Publishes \--\> H  
    F \-- Subscribes/Publishes \--\> H  
    G \-- Subscribes/Publishes \--\> H

    C \-- R/W \--\> I  
    D \-- R/W \--\> I & J  
    F \-- R/W \--\> I  
    G \-- R/W \--\> I & J

    style A fill:\#C5E1A5  
    style B fill:\#81D4FA  
    style H fill:\#FFE082  
    style I fill:\#BDBDBD

### **3\. API 网关 (app-gateway) 接口定义**

网关是系统的唯一入口，负责认证、请求校验和任务分发。

* **认证**: 所有端点使用 JWT Bearer Token 进行保护。  
* **API Endpoints**:  
  * POST /jobs  
    * **描述**: 创建一个新的招聘岗位（Job），并提交 JD。  
    * **请求体**: { "jobTitle": "string", "jdText": "string" }  
    * **成功响应 (202)**: { "jobId": "string", "message": "Job received and is being processed." }  
    * **动作**: 发布 job.jd.submitted 事件到 NATS。  
  * POST /jobs/{jobId}/resumes  
    * **描述**: 为指定的岗位批量上传简历。  
    * **请求体**: multipart/form-data，包含多个 PDF 文件。  
    * **成功响应 (202)**: { "jobId": "string", "submittedResumes": 5, "message": "Resumes received and are being processed." }  
    * **动作**: 为每个简历文件，将其存入 GridFS 临时区，并发布 job.resume.submitted 事件到 NATS。  
  * GET /jobs/{jobId}/reports  
    * **描述**: 获取指定岗位下所有简历的分析报告列表。  
    * **成功响应 (200)**: \[{ "resumeId": "string", "candidateName": "string", "matchScore": 88, "status": "Completed", "reportUrl": "/reports/{reportId}" }\]  
  * GET /reports/{reportId}  
    * **描述**: 获取单个分析报告的详细内容（Markdown 格式）。  
    * **成功响应 (200)**: { "reportMarkdown": "string" }

### **4\. 事件与数据契约 (NATS Subjects & DTOs)**

这是系统的心跳。所有服务间通信都通过以下事件。

* **数据传输对象 (DTOs)**: 使用 io-ts / zod 定义，确保类型安全。  
  * JdDTO: 包含从 JD 中提取的技能、经验、学历等结构化数据。  
  * ResumeDTO: 包含从简历中提取的联系方式、工作经历、教育背景、技能列表等结构化数据。  
  * ScoreDTO: 包含各维度（技能、经验等）的得分和总分。  
* **NATS Subjects (事件主题)**:  
  * job.jd.submitted  
    * **负载**: { jobId: string, jdText: string }  
    * **发布者**: app-gateway  
    * **订阅者**: jd-extractor-svc  
  * job.resume.submitted  
    * **负载**: { jobId: string, resumeId: string, tempGridFsUrl: string }  
    * **发布者**: app-gateway  
    * **订阅者**: resume-parser-svc  
  * analysis.jd.extracted  
    * **负载**: { jobId: string, jdDto: JdDTO }  
    * **发布者**: jd-extractor-svc  
    * **订阅者**: scoring-engine-svc  
  * analysis.resume.parsed  
    * **负载**: { jobId: string, resumeId: string, resumeDto: ResumeDTO }  
    * **发布者**: resume-parser-svc (经 field-mapper-svc 归一化后)  
    * **订阅者**: scoring-engine-svc  
  * analysis.match.scored  
    * **负载**: { jobId: string, resumeId: string, scoreDto: ScoreDTO }  
    * **发布者**: scoring-engine-svc  
    * **订阅者**: report-generator-svc

### **5\. 微服务深度解析**

#### **5.1 jd-extractor-svc**

* **职责**: 将非结构化的 JD 文本转化为结构化的 JdDTO。  
* **核心逻辑**:  
  1. 订阅 job.jd.submitted。  
  2. 使用一个经过优化的 Prompt，调用一个通用的 LLM (如 Gemini) 来提取关键信息。  
  3. 将提取结果校验并转换为 JdDTO。  
  4. 发布 analysis.jd.extracted 事件。

#### **5.2 resume-parser-svc**

* **职责**: 解析 PDF 简历，提取原始结构化信息。这是最关键和最复杂的IO密集型服务。  
* **核心逻辑**:  
  1. 订阅 job.resume.submitted。  
  2. 从 GridFS 下载 PDF 文件。  
  3. 调用 **Vision LLM** (如 Gemini 1.5 Pro with native PDF understanding)，传入 PDF 文件。  
  4. LLM 返回一个结构化的 JSON，包含文本内容和大致的布局信息。  
  5. **失败处理**: 如果 LLM 调用失败，实现一个带指数退避的重试策略（最多3次）。如果最终失败，发布一个 job.resume.failed 事件，并注明原因。  
  6. 将原始 JSON 传递给 field-mapper-svc 进行归一化。

#### **5.3 scoring-engine-svc**

* **职责**: 计算简历和 JD 之间的匹配分数。  
* **核心逻辑**:  
  1. 订阅 analysis.jd.extracted 和 analysis.resume.parsed。  
  2. 在内存（或 Redis）中缓存 JD 信息。  
  3. 收到简历信息后，执行匹配算法：  
     * **技能匹配**: 使用 Set 理论计算技能交集，并可对关键技能加权。  
     * **经验匹配**: 计算年限差距。  
     * **学历匹配**: 进行等级比较。  
  4. **加权聚合**: 将各维度得分按预设权重（例如：技能 0.5, 经验 0.3, 学历 0.2）聚合为总分。  
  5. 发布 analysis.match.scored 事件。

#### **5.4 report-generator-svc**

* **职责**: 生成最终面向用户的 Markdown 分析报告。  
* **核心逻辑**:  
  1. 订阅 analysis.match.scored。  
  2. 根据 ScoreDTO 和原始的 ResumeDTO，使用一个 Markdown 模板引擎（如 handlebars 或 EJS）填充内容。  
  3. **亮点与差距生成**: 调用 LLM，输入 JdDTO 和 ResumeDTO，让其用自然语言生成“优势”和“潜在差距”部分。  
  4. **面试问题生成**: 再次调用 LLM，基于“潜在差距”部分，生成 2-3 个有针对性的面试问题。  
  5. 将最终的 Markdown 报告存入 GridFS，并更新 MongoDB 中的 reports 集合。

### **6\. 前端架构 (Angular SPA)**

* **核心技术**: Angular 18, TypeScript, RxJS, NgRx (状态管理), Tailwind CSS。  
* **组件分解 (Component Breakdown)**:  
  * JobCreationComponent: 包含一个表单，用于提交新的 JD。  
  * ResumeUploadComponent: 负责处理文件上传逻辑，包括拖拽上传和进度显示。  
  * JobDashboardComponent: 主仪表盘，显示所有进行中的招聘岗位。  
  * ReportListComponent: 表格形式展示一个岗位下所有简历的分析结果列表。  
  * ReportViewComponent: 渲染并显示单份 Markdown 格式的分析报告。  
* **状态管理 (NgRx)**:  
  * **Store**: 维护一个全局状态树。  
  * **State**: { jobs: Job\[\], reports: { \[jobId\]: Report\[\] }, selectedReport: Report | null }  
  * **Actions**: 用户交互触发 Actions (e.g., \[Jobs API\] Load Jobs Success)。  
  * **Reducers**: 纯函数，根据 Actions 更新 State。  
  * **Effects**: 处理副作用，如调用后端 API。

### **7\. 实施路线图 (Roadmap)**

**里程碑 1: 基础架构与核心解析 (Sprint 0-1)**

* \[x\] **任务 1.1**: 使用 Nx 搭建 Monorepo，包含各微服务和 Angular 应用的骨架。  
* \[ \] **任务 1.2**: 使用 io-ts/zod 定义所有核心 DTO 和 NATS 事件负载 Schema。  
* \[ \] **任务 1.3**: 实现 resume-parser-svc 的 PoC，能够成功调用 Vision LLM 并解析一份简历。  
* \[ \] **任务 1.4**: 搭建 Angular SPA 骨架，实现组件路由。

**里程碑 2: 端到端流程打通 (Sprint 2\)**

* \[ \] **任务 2.1**: 完成 jd-extractor-svc 和 scoring-engine-svc 的基本逻辑。  
* \[ \] **任务 2.2**: 完成 report-generator-svc 的模板渲染部分。  
* \[ \] **任务 2.3**: 实现 API 网关的所有端点。  
* \[ \] **目标**: 能够通过 API 上传 JD 和一份简历，并在 MongoDB 中看到最终生成的报告记录。

**里程碑 3: 前端集成与用户体验优化 (Sprint 3\)**

* \[ \] **任务 3.1**: 完成前端所有组件的开发，与 API 网关完全对接。  
* \[ \] **任务 3.2**: 实现前端的 JWT 认证流程。  
* \[ \] **任务 3.3**: 编写 E2E 测试 (Playwright)，覆盖核心用户场景。

**里程碑 4: 高级功能与优化 (Post-MVP)**

* \[ \] **任务 4.1**: 实现 feedback-svc，允许用户调整评分权重。  
* \[ \] **任务 4.2**: 对接 Grafana LGTM Stack，建立完整的可观测性仪表盘。  
* \[ \] **任务 4.3**: 性能基准测试与优化。