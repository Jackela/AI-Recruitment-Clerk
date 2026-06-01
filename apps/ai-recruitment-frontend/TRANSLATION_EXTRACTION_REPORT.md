# Phase 1.1 - 硬编码中文文本提取报告

## 1. 统计摘要

- **扫描文件总数**: 331 个
- **包含中文的文件数**: 125 个
- **中文文本总出现次数**: 2015 次
- **唯一中文文本数**: 1451 个
- **生成的翻译键总数**: 1451 个

## 2. 按类别分类的键统计

- common: 524 个键
- components: 294 个键
- analysis: 250 个键
- jobs: 121 个键
- resume: 95 个键
- errors: 74 个键
- navigation: 40 个键
- validation: 28 个键
- toast: 18 个键
- mobile: 7 个键

## 3. 生成的翻译文件

- **中文翻译文件**: `src/assets/i18n/zh-CN-complete.json` (1451 个键)
- **英文翻译文件**: `src/assets/i18n/en-US-complete.json` (1451 个键)

注意: en-US-complete.json 中的 `[TRANSLATE]` 标记需要人工翻译。

## 4. 建议的键命名规范

```
格式: {category}.{subcategory}.{element}

类别前缀:
  - common.*     - 通用文本（操作按钮、状态、通用提示）
  - jobs.*       - 职位管理相关
  - resume.*     - 简历管理相关
  - analysis.*   - 分析功能相关
  - errors.*     - 错误消息
  - toast.*      - 通知消息
  - navigation.* - 导航相关
  - validation.* - 表单验证
  - components.* - 共享组件
  - mobile.*     - 移动端特定

命名规则:
  1. 使用小写字母和数字
  2. 使用下划线分隔单词
  3. 避免重复，相同含义使用相同键
  4. 保持语义清晰，键名反映内容
  5. 对于日期/时间格式，使用特殊标记
```

## 5. 后续步骤

1. **人工翻译**: 完善 en-US-complete.json 中的 `[TRANSLATE]` 标记文本
2. **优化键名**: 根据实际使用场景优化键名结构
3. **消除重复**: 合并相似的翻译键
4. **实现翻译管道**: 在 Angular 应用中集成 ngx-translate 或类似库
5. **替换硬编码文本**: 逐步替换源码中的中文文本为翻译键

---

生成时间: 2026-03-17
