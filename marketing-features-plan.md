# 营销功能补充计划

## 第1步: 游客模式实现 (1天)

### 前端实现 (Angular)

```typescript
// apps/ai-recruitment-frontend/src/app/services/guest-usage.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GuestUsageService {
  private readonly GUEST_USAGE_KEY = 'guest_usage_count';
  private readonly GUEST_FEEDBACK_CODE = 'guest_feedback_code';
  private readonly MAX_GUEST_USAGE = 5;

  getUsageCount(): number {
    return parseInt(localStorage.getItem(this.GUEST_USAGE_KEY) || '0');
  }

  incrementUsage(): void {
    const current = this.getUsageCount();
    localStorage.setItem(this.GUEST_USAGE_KEY, (current + 1).toString());
  }

  getRemainingUsage(): number {
    return Math.max(0, this.MAX_GUEST_USAGE - this.getUsageCount());
  }

  isUsageExhausted(): boolean {
    return this.getUsageCount() >= this.MAX_GUEST_USAGE;
  }

  generateFeedbackCode(): string {
    const code = this.generateUUID();
    localStorage.setItem(this.GUEST_FEEDBACK_CODE, code);
    return code;
  }

  getFeedbackCode(): string | null {
    return localStorage.getItem(this.GUEST_FEEDBACK_CODE);
  }

  private generateUUID(): string {
    return 'feedback_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
```

### 后端API支持 (NestJS)

```typescript
// apps/app-gateway/src/marketing/feedback-code.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface FeedbackCode {
  code: string;
  generatedAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  alipayAccount?: string;
  questionnaireData?: any;
}

@Injectable()
export class FeedbackCodeService {
  constructor(
    @InjectModel('FeedbackCode') private feedbackCodeModel: Model<FeedbackCode>
  ) {}

  async recordFeedbackCode(code: string): Promise<void> {
    await this.feedbackCodeModel.create({
      code,
      generatedAt: new Date(),
      isUsed: false
    });
  }

  async validateFeedbackCode(code: string): Promise<boolean> {
    const record = await this.feedbackCodeModel.findOne({ code });
    return !!record && !record.isUsed;
  }

  async markAsUsed(code: string, alipayAccount: string, questionnaireData: any): Promise<void> {
    await this.feedbackCodeModel.updateOne(
      { code },
      {
        isUsed: true,
        usedAt: new Date(),
        alipayAccount,
        questionnaireData
      }
    );
  }
}
```

## 第2步: 营销页面创建 (1天)

### 活动说明页面

```typescript
// apps/ai-recruitment-frontend/src/app/pages/marketing/marketing-campaign.component.ts
@Component({
  selector: 'app-marketing-campaign',
  template: `
    <div class="campaign-container">
      <div class="campaign-header">
        <h1>🎉 免费体验AI招聘助手，还能赚零花钱！</h1>
        <p class="highlight">体验结束后填写反馈问卷，立得3元支付宝红包</p>
      </div>

      <div class="features-showcase">
        <div class="feature-card">
          <h3>📄 智能简历解析</h3>
          <p>AI自动提取简历关键信息，告别手动录入</p>
        </div>
        <div class="feature-card">
          <h3>🎯 职位匹配分析</h3>
          <p>秒级计算候选人与职位的匹配度</p>
        </div>
        <div class="feature-card">
          <h3>📊 专业报告生成</h3>
          <p>一键生成候选人评估报告</p>
        </div>
      </div>

      <div class="usage-status" *ngIf="!isUsageExhausted">
        <p>🔥 您还有 <strong>{{remainingUsage}}</strong> 次免费体验机会</p>
        <button class="start-btn" (click)="startExperience()">立即体验</button>
      </div>

      <div class="feedback-guide" *ngIf="isUsageExhausted">
        <h3>🎁 获得奖励的步骤</h3>
        <ol>
          <li>复制您的专属反馈码：<code>{{feedbackCode}}</code></li>
          <li>点击下方链接填写体验反馈问卷</li>
          <li>在问卷中粘贴您的反馈码</li>
          <li>提交后24小时内收到3元支付宝红包</li>
        </ol>
        <a href="{{questionnaireUrl}}" class="questionnaire-btn" target="_blank">
          💰 填写问卷，获得3元奖励
        </a>
      </div>

      <div class="reward-proof">
        <h3>💳 真实支付截图</h3>
        <div class="payment-screenshots">
          <!-- 展示支付截图 -->
        </div>
      </div>
    </div>
  `
})
export class MarketingCampaignComponent {
  remainingUsage: number;
  isUsageExhausted: boolean;
  feedbackCode: string;
  questionnaireUrl = 'https://wj.qq.com/s2/your-questionnaire-id/';

  constructor(private guestUsageService: GuestUsageService) {
    this.remainingUsage = this.guestUsageService.getRemainingUsage();
    this.isUsageExhausted = this.guestUsageService.isUsageExhausted();
    
    if (this.isUsageExhausted) {
      this.feedbackCode = this.guestUsageService.getFeedbackCode() || 
                         this.guestUsageService.generateFeedbackCode();
    }
  }

  startExperience() {
    this.router.navigate(['/dashboard']);
  }
}
```

## 第3步: 问卷集成系统 (1天)

### 腾讯问卷设计

```markdown
# AI招聘助手体验反馈问卷

## 第1部分：身份验证
1. 【必填】请输入您的专属反馈码：____
2. 【必填】请输入您的支付宝账号：____
3. 【可选】您的姓氏（用于支付验证）：____

## 第2部分：核心反馈
4. 【必填】您觉得AI简历解析功能的准确性如何？（1-5分）
5. 【必填】使用过程中遇到的主要问题：____
6. 【必填】您最喜欢的功能是什么？为什么？____
7. 【必填】您认为哪些方面需要改进？____
8. 【可选】您还希望增加什么功能？____

## 第3部分：用户画像
9. 您的身份：□HR □招聘经理 □猎头 □求职者 □学生 □其他
10. 公司规模：□<50人 □50-500人 □500-5000人 □>5000人
11. 是否愿意继续使用：□非常愿意 □比较愿意 □一般 □不太愿意 □完全不愿意
```

### 自动化处理脚本

```python
# scripts/process-questionnaire-data.py
import pandas as pd
import json
import requests
from datetime import datetime

class QuestionnaireProcessor:
    def __init__(self, excel_file, api_endpoint):
        self.excel_file = excel_file
        self.api_endpoint = api_endpoint
        
    def process_responses(self):
        """处理问卷响应数据"""
        df = pd.read_excel(self.excel_file)
        
        for index, row in df.iterrows():
            feedback_code = row['专属反馈码']
            alipay_account = row['支付宝账号']
            feedback_quality = self.assess_feedback_quality(row)
            
            if feedback_quality >= 3:  # 质量评分≥3才给奖励
                self.mark_for_payment(feedback_code, alipay_account, row.to_dict())
                
    def assess_feedback_quality(self, row):
        """评估反馈质量"""
        score = 0
        
        # 检查字数
        if len(str(row['遇到的主要问题'])) > 10:
            score += 1
        if len(str(row['最喜欢的功能'])) > 10:
            score += 1
        if len(str(row['需要改进的方面'])) > 10:
            score += 1
            
        # 检查是否有建设性意见
        if any(word in str(row) for word in ['建议', '希望', '应该', '可以']):
            score += 1
            
        return score
        
    def mark_for_payment(self, code, alipay, data):
        """标记为待支付"""
        payload = {
            'feedback_code': code,
            'alipay_account': alipay,
            'questionnaire_data': data,
            'payment_amount': 3.00,
            'created_at': datetime.now().isoformat()
        }
        
        response = requests.post(f"{self.api_endpoint}/mark-payment", json=payload)
        return response.json()
```

## 营销内容准备

### 小红书文案模板

```markdown
🔥【真实收入】AI招聘工具体验官，3元/次，当天到账！

姐妹们！我发现了一个超简单的赚零花钱方式！
体验一款AI招聘工具，认真填写反馈就能得3元💰

✨ 体验内容：
• 上传简历，AI自动解析
• 职位匹配度分析  
• 生成专业报告
• 全程5-10分钟

💰 奖励发放：
• 体验完填问卷即可获得3元
• 支付宝直接转账
• 24小时内到账

🎯 参与方式：
1. 点击链接体验工具
2. 完成5次免费体验
3. 获取专属反馈码
4. 填写反馈问卷
5. 坐等3元到账💕

[链接] https://your-app.railway.app/campaign

#副业 #零花钱 #AI工具 #体验官 #真实收入
```

### 支付话术模板

```
支付宝转账备注：AI招聘工具反馈奖励 - 反馈码:XXXX
```