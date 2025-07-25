# **风险登记册 (Risk Register): AI 招聘助理**

版本: 1.0  
发布日期: 2025-07-22

### **1\. 文档目的**

本《风险登记册》旨在对“AI 招聘助理”项目中已识别的、潜在的风险进行详细记录、定性分析、量化评估，并制定相应的应对策略。本文档将作为项目团队持续监控和控制风险的依据。

### **2\. 风险登记表**

| Risk ID | 风险描述 (Risk Description) | 风险类别 (Category) | 可能性 (Probability) | 影响 (Impact) | 风险等级 (Level) | 应对策略 (Strategy) | 具体应对措施 (Action Plan) | 风险负责人 (Owner) | 状态 (Status) |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **R001** | **Vision LLM 解析非标简历的准确率不达标**，导致提取的信息质量低下，影响后续所有模块。 | 技术 (Technical) | 中 (Medium) | 高 (High) | **高 (High)** | 减轻 (Mitigate) | 1\. **PoC优先**: 在 Sprint-01 阶段，对至少 3 种不同版式、复杂度的简历进行解析测试，量化准确率。\<br\>2. **备选方案**: 准备传统的 OCR \+ 正则表达式/NLP 模型作为备选解析方案。\<br\>3. **Prompt优化**: 持续迭代用于解析的 Prompt，加入更多结构化指令。 | Claude Code (AI 开发者) | Open |
| **R002** | **项目范围蔓延 (Scope Creep)**，在开发过程中不断被要求增加 MVP 范围之外的功能。 | 项目管理 (Management) | 中 (Medium) | 中 (Medium) | **中 (Medium)** | 规避 (Avoid) | 1\. **基线冻结**: 严格遵循已批准的《项目范围说明书》作为范围基线。\<br\>2. **变更控制**: 建立正式的变更请求流程，所有范围变更需经项目发起人审批。\<br\>3. **定期重申**: 在每次 Sprint 规划会议上重申 MVP 范围。 | Gemini (AI 项目经理) | Open |
| **R003** | **外部 LLM API 服务不稳定或大幅提价**，导致项目服务中断或成本超出预算。 | 外部依赖 (External) | 低 (Low) | 高 (High) | **中 (Medium)** | 减轻 (Mitigate) | 1\. **设计适配层**: 在系统设计中，将 LLM 调用封装在独立的适配器层，便于快速切换不同的模型供应商。\<br\>2. **监控与告警**: 设置对 API 延迟和错误率的监控告警。\<br\>3. **成本预算**: 在成本计划中为 API 调用设置明确的预算和用量告警阈值。 | Gemini (AI 项目经理) | Open |
| **R004** | **处理个人简历数据时，未能满足数据隐私与合规要求** (如 GDPR, PIPL)，导致法律和声誉风险。 | 合规 (Compliance) | 低 (Low) | 高 (High) | **中 (Medium)** | 减轻 (Mitigate) | 1\. **设计即合规**: 严格执行 Detailed Design v2.0 中定义的合规嵌入点（数据加密、审计日志等）。\<br\>2. **数据匿名化**: 在非必要环节，对敏感个人信息进行脱敏处理。\<br\>3. **明确告知**: 在 UI 界面明确告知用户数据处理政策。 | Codex CLI (AI 开发者) | Open |
| **R005** | **AI 开发代理之间的协作效率未达预期**，或其生成的代码/文档质量不一致，导致集成困难和返工。 | 资源 (Resource) | 中 (Medium) | 中 (Medium) | **中 (Medium)** | 减轻 (Mitigate) | 1\. **明确契约**: 严格执行“契约驱动开发”，所有模块间交互依赖预定义的 Schema。\<br\>2. **强制代码审查**: 坚持 AI 代理间的交叉 Code Review 流程。\<br\>3. **持续监督**: 项目经理持续监控 AGENT\_DIALOGUE.md，及时发现协作问题。 | Gemini (AI 项目经理) | Open |

