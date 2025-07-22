# **概要设计文档 (High-Level Design, HLD): AI 招聘助理**

版本: 1.0  
发布日期: 2025-07-22

### **1\. 引言 (Introduction)**

#### **1.1. 文档目的**

本《概要设计文档》旨在为“AI 招聘助理”项目提供一个高层级的系统架构蓝图。它定义了系统的核心组件、技术选型、模块职责以及它们之间的交互方式。本文档是连接《软件需求规格说明书 (SRS)》与《详细设计文档 (LLD)》的桥梁，为后续的详细设计和开发工作提供统一的架构指导。

#### **1.2. 范围**

本文档的设计范围覆盖了在 SRS v1.0 中定义的全部功能性和非功能性需求。它专注于系统的宏观结构，而不涉及具体模块内部的实现细节。

### **2\. 系统架构 (System Architecture)**

#### **2.1. 架构风格**

本项目采用**事件驱动的微服务架构 (Event-Driven Microservices Architecture)**。该架构通过将系统拆分为一组小型的、独立的、围绕业务领域构建的服务，并通过异步消息（事件）进行通信，从而实现高度的解耦、可扩展性和弹性。

#### **2.2. 架构图**

下图展示了系统的核心组件及其交互关系：

graph TD  
    subgraph "用户界面 (User Interface)"  
        A\[Angular SPA\]  
    end

    subgraph "后端微服务 (Backend Microservices)"  
        B\[API Gateway\]  
        C\[JD Extractor Svc\]  
        D\[Resume Parser Svc\]  
        E\[Field Mapper Svc\]  
        F\[Scoring Engine Svc\]  
        G\[Report Generator Svc\]  
    end

    subgraph "数据与消息层 (Data & Messaging Layer)"  
        H\[(NATS JetStream Event Bus)\]  
        I\[(MongoDB Database)\]  
        J\[(GridFS for Files)\]  
    end

    A \-- REST/HTTPS API Calls \--\> B  
    B \-- Publishes Events \--\> H  
      
    H \-- Events \--\> C  
    H \-- Events \--\> D  
    H \-- Events \--\> E  
    H \-- Events \--\> F  
    H \-- Events \--\> G

    C \-- R/W \--\> I  
    D \-- R/W \--\> I & J  
    F \-- R/W \--\> I  
    G \-- R/W \--\> I & J

    style A fill:\#E3F2FD  
    style B fill:\#BBDEFB  
    style H fill:\#FFF9C4  
    style I fill:\#F5F5F5

### **3\. 技术栈 (Technology Stack)**

| 类别 | 技术选型 | 理由 |
| :---- | :---- | :---- |
| **前端框架** | Angular 18 | 提供强大的企业级功能，与后端 NestJS 共享 TypeScript 生态。 |
| **后端框架** | NestJS 11 (on Node.js) | 基于 TypeScript，提供模块化、可测试的架构，非常适合微服务。 |
| **数据库** | MongoDB 6.x | 面向文档的数据库，灵活的 Schema 适合存储非结构化的 JD 和简历数据。 |
| **文件存储** | Mongo GridFS | 适合存储大于 16MB 的文件（如简历 PDF），与主数据库无缝集成。 |
| **事件总线** | NATS JetStream | 轻量级、高性能的云原生消息系统，支持持久化流，保证事件不丢失。 |
| **项目管理** | Nx Monorepo | 统一管理前端和多个后端微服务的代码，简化依赖和构建流程。 |
| **测试** | Vitest, Supertest, Playwright | 现代、高效的单元测试、集成测试和 E2E 测试框架。 |
| **可观测性** | Grafana LGTM Stack | 提供日志、指标和追踪的全方位监控解决方案。 |

### **4\. 模块划分与职责 (Module Breakdown & Responsibilities)**

| 模块 (NestJS 微服务) | 核心职责 | 主要交互 |
| :---- | :---- | :---- |
| **app-gateway** | 系统的统一入口，处理 API 请求、用户认证 (JWT)、请求校验和任务分发。 | 接收前端 REST 请求，向 NATS 发布初始事件。 |
| **jd-extractor-svc** | 从 JD 文本中提取结构化的招聘要求 (JdDTO)。 | 订阅 job.jd.submitted 事件，发布 analysis.jd.extracted 事件。 |
| **resume-parser-svc** | 调用 Vision LLM 解析简历 PDF，提取原始信息。 | 订阅 job.resume.submitted 事件，与 GridFS 和外部 LLM API 交互。 |
| **field-mapper-svc** | 将 LLM 返回的原始信息归一化为标准的 ResumeDTO。 | (作为 resume-parser-svc 的内部逻辑或独立服务) |
| **scoring-engine-svc** | 接收结构化的 JD 和简历信息，计算匹配分数。 | 订阅 analysis.jd.extracted 和 analysis.resume.parsed 事件，发布 analysis.match.scored 事件。 |
| **report-generator-svc** | 根据评分结果，生成最终的 Markdown 分析报告。 | 订阅 analysis.match.scored 事件，将报告存入 GridFS。 |

### **5\. 数据流图 (Data Flow Diagram)**

一个核心业务流程（上传一份简历）的数据流如下：

1. **用户**通过 **Angular SPA** 上传一份简历 PDF 到 **API Gateway**。  
2. **API Gateway** 将文件存入 **GridFS**，并向 **NATS** 发布一个 job.resume.submitted 事件（包含文件引用）。  
3. **Resume Parser Svc** 订阅到该事件，从 **GridFS** 下载文件，调用 **Vision LLM** 进行解析，并将结果归一化为 ResumeDTO。  
4. **Resume Parser Svc** 向 **NATS** 发布一个 analysis.resume.parsed 事件（包含 ResumeDTO）。  
5. **Scoring Engine Svc** 订阅到该事件，从内部缓存获取对应的 JdDTO，计算匹配度，并向 **NATS** 发布一个 analysis.match.scored 事件。  
6. **Report Generator Svc** 订阅到该事件，生成 Markdown 报告，存入 **GridFS**，并更新 **MongoDB** 中的记录状态。  
7. **用户**最终通过 **API Gateway** 查询并获取到该报告。

### **6\. 接口定义 (High-level API Definitions)**

系统的主要外部接口由 app-gateway 提供：

* POST /jobs: 创建招聘岗位。  
* POST /jobs/{jobId}/resumes: 上传简历。  
* GET /jobs/{jobId}/reports: 获取分析报告列表。  
* GET /reports/{reportId}: 获取单个报告详情。