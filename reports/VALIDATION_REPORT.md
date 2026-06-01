# 验证报告

**生成时间**: 2026/3/18 15:22:11

## 总体概览

| 指标 | 数值 |
|------|------|
| 状态 | ❌ FAILED |
| 总测试数 | 125 |
| 通过 | 119 |
| 失败 | 6 |
| 警告 | 0 |

## 详细结果

### 🧪 单元测试

**状态**: ✅ PASSED

**摘要**:

```json
{
  "lines": {
    "total": 1000,
    "covered": 850,
    "skipped": 0,
    "pct": 85
  },
  "statements": {
    "total": 1200,
    "covered": 1000,
    "skipped": 0,
    "pct": 83.33
  },
  "functions": {
    "total": 200,
    "covered": 170,
    "skipped": 0,
    "pct": 85
  },
  "branches": {
    "total": 500,
    "covered": 400,
    "skipped": 0,
    "pct": 80
  }
}
```

**覆盖率**: 85%

---

### 🤖 AI验证

**状态**: ✅ PASSED

**摘要**:

```json
{
  "totalValidations": 50,
  "passed": 48,
  "failed": 2,
  "issues": [
    {
      "type": "false_positive",
      "count": 1,
      "severity": "low"
    },
    {
      "type": "missed_detection",
      "count": 1,
      "severity": "medium"
    }
  ]
}
```

---

### 👁️ 视觉回归

**状态**: ❌ FAILED

**摘要**:

```json
{
  "totalSnapshots": 25,
  "passed": 24,
  "failed": 1,
  "newSnapshots": 0,
  "updatedSnapshots": 2
}
```

---

### ⚡ 性能测试

**状态**: ✅ PASSED

**摘要**:

```json
{
  "metrics": {
    "firstContentfulPaint": 1200,
    "largestContentfulPaint": 2500,
    "timeToInteractive": 3000,
    "totalBlockingTime": 150,
    "cumulativeLayoutShift": 0.05
  },
  "thresholds": {
    "firstContentfulPaint": 1800,
    "largestContentfulPaint": 4000,
    "timeToInteractive": 5000,
    "totalBlockingTime": 300,
    "cumulativeLayoutShift": 0.1
  },
  "violations": []
}
```

---

### ♿ 可访问性

**状态**: ❌ FAILED

**摘要**:

```json
{
  "violations": 2,
  "warnings": 1,
  "score": 85,
  "criticalIssues": 0
}
```

**可访问性问题** (显示前10个):

| 影响级别 | 描述 | 元素 |
|----------|------|------|
| serious | 表单元素缺少关联标签 | `input#search` |
| moderate | 颜色对比度不足 | `.text-muted` |

---

### ✅ 综合验证

**状态**: ✅ PASSED

**摘要**:

```json
{
  "totalChecks": 100,
  "passed": 95,
  "failed": 5,
  "categories": {
    "security": {
      "passed": 20,
      "failed": 0
    },
    "performance": {
      "passed": 18,
      "failed": 2
    },
    "reliability": {
      "passed": 19,
      "failed": 1
    },
    "maintainability": {
      "passed": 18,
      "failed": 2
    },
    "usability": {
      "passed": 20,
      "failed": 0
    }
  }
}
```

---

## 改进建议

1. 🔴 **[可访问性]** 发现 0 个关键可访问性问题
2. 🟡 **[视觉回归]** 发现 1 个视觉回归问题，请审查UI变更
3. 🟡 **[性能]** 建议优化数据库查询，减少N+1查询问题
4. 🟢 **[可维护性]** 建议增加更多代码注释

## 结论

❌ 验证未通过，请修复上述问题后再进行部署。
