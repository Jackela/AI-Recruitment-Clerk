#!/bin/bash
# 快速营销功能设置脚本

echo "🚀 开始营销功能快速设置..."

# 第1步: 创建营销相关文件夹
echo "📁 创建营销文件结构..."
mkdir -p apps/ai-recruitment-frontend/src/app/pages/marketing
mkdir -p apps/ai-recruitment-frontend/src/app/services/marketing
mkdir -p apps/app-gateway/src/marketing
mkdir -p marketing-assets

# 第2步: 生成游客模式服务文件
echo "👤 创建游客模式服务..."
cat > apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.ts << 'EOF'
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
    const code = 'feedback_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem(this.GUEST_FEEDBACK_CODE, code);
    return code;
  }

  getFeedbackCode(): string | null {
    return localStorage.getItem(this.GUEST_FEEDBACK_CODE);
  }
}
EOF

# 第3步: 创建营销活动页面
echo "📄 创建营销活动页面..."
cat > apps/ai-recruitment-frontend/src/app/pages/marketing/campaign.component.ts << 'EOF'
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GuestUsageService } from '../../services/marketing/guest-usage.service';

@Component({
  selector: 'app-campaign',
  templateUrl: './campaign.component.html',
  styleUrls: ['./campaign.component.scss']
})
export class CampaignComponent implements OnInit {
  remainingUsage: number = 0;
  isUsageExhausted: boolean = false;
  feedbackCode: string = '';
  questionnaireUrl = 'https://wj.qq.com/s2/your-questionnaire-id/';

  constructor(
    private guestUsageService: GuestUsageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.remainingUsage = this.guestUsageService.getRemainingUsage();
    this.isUsageExhausted = this.guestUsageService.isUsageExhausted();
    
    if (this.isUsageExhausted) {
      this.feedbackCode = this.guestUsageService.getFeedbackCode() || 
                         this.guestUsageService.generateFeedbackCode();
    }
  }

  startExperience(): void {
    this.router.navigate(['/dashboard']);
  }

  copyFeedbackCode(): void {
    navigator.clipboard.writeText(this.feedbackCode);
    alert('反馈码已复制到剪贴板！');
  }
}
EOF

# 第4步: 创建后端反馈码服务
echo "⚙️  创建后端反馈码服务..."
cat > apps/app-gateway/src/marketing/feedback-code.controller.ts << 'EOF'
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { FeedbackCodeService } from './feedback-code.service';

@Controller('marketing/feedback-codes')
export class FeedbackCodeController {
  constructor(private readonly feedbackCodeService: FeedbackCodeService) {}

  @Post('record')
  async recordFeedbackCode(@Body('code') code: string) {
    await this.feedbackCodeService.recordFeedbackCode(code);
    return { success: true };
  }

  @Get('validate/:code')
  async validateFeedbackCode(@Param('code') code: string) {
    const isValid = await this.feedbackCodeService.validateFeedbackCode(code);
    return { valid: isValid };
  }

  @Post('mark-used')
  async markAsUsed(@Body() data: any) {
    await this.feedbackCodeService.markAsUsed(
      data.code, 
      data.alipayAccount, 
      data.questionnaireData
    );
    return { success: true };
  }
}
EOF

# 第5步: 创建问卷数据处理脚本
echo "📊 创建问卷数据处理工具..."
cat > scripts/process-questionnaire.py << 'EOF'
import pandas as pd
import json
import uuid
from datetime import datetime

def process_questionnaire_responses(excel_file):
    """处理腾讯问卷导出的Excel数据"""
    df = pd.read_excel(excel_file)
    
    payment_list = []
    
    for index, row in df.iterrows():
        # 提取关键信息
        feedback_code = row.iloc[1]  # 反馈码列
        alipay_account = row.iloc[2]  # 支付宝账号列
        
        # 评估反馈质量
        quality_score = assess_feedback_quality(row)
        
        if quality_score >= 3:  # 高质量反馈
            payment_info = {
                'id': str(uuid.uuid4()),
                'feedback_code': feedback_code,
                'alipay_account': alipay_account,
                'amount': 3.00,
                'quality_score': quality_score,
                'created_at': datetime.now().isoformat(),
                'payment_status': 'pending',
                'feedback_data': row.to_dict()
            }
            payment_list.append(payment_info)
    
    # 导出待支付列表
    with open(f'payment_list_{datetime.now().strftime("%Y%m%d")}.json', 'w', encoding='utf-8') as f:
        json.dump(payment_list, f, ensure_ascii=False, indent=2)
    
    print(f"处理完成！有效反馈数量: {len(payment_list)}")
    return payment_list

def assess_feedback_quality(row):
    """评估反馈质量分数"""
    score = 0
    
    # 基础分数
    score += 1
    
    # 检查文本长度和质量
    text_fields = [str(row.iloc[i]) for i in range(4, 8)]  # 反馈问题列
    
    for text in text_fields:
        if len(text) > 10 and text != 'nan':
            score += 1
            
    # 检查建设性意见
    full_text = ' '.join(text_fields).lower()
    if any(word in full_text for word in ['建议', '希望', '应该', '可以', '改进', '优化']):
        score += 1
        
    return min(score, 5)

if __name__ == "__main__":
    # 使用示例
    process_questionnaire_responses('questionnaire_responses.xlsx')
EOF

# 第6步: 创建小红书营销文案
echo "📱 创建营销文案..."
cat > marketing-assets/xiaohongshu-post.md << 'EOF'
# 小红书营销文案

## 标题选项
1. 🔥【真实收入】AI招聘工具体验官，3元/次，当天到账！
2. 💰 副业分享：体验AI工具就能赚钱，已收款3元！
3. 🎯 零门槛副业：AI工具测试员，10分钟赚3元

## 正文内容

姐妹们！我又发现了一个超简单的赚零花钱方式！
体验一款AI招聘工具，认真填写反馈就能得3元💰

我已经亲测，真的会到账！！
[展示支付宝收款截图]

✨ 体验内容：
• 上传简历，AI自动解析
• 职位匹配度分析  
• 生成专业报告
• 全程只需5-10分钟

💰 奖励发放：
• 体验完填问卷即可获得3元
• 支付宝直接转账
• 24小时内到账，已验证真实！

🎯 参与步骤：
1. 点击下方链接体验工具
2. 完成5次免费体验  
3. 获取专属反馈码
4. 填写反馈问卷（5分钟）
5. 坐等3元到账💕

体验链接：https://your-app.railway.app/campaign
问卷地址：https://wj.qq.com/s2/your-questionnaire/

⚠️ 注意事项：
• 需要认真体验并提供真实反馈
• 恶意刷取会被拉黑
• 名额有限，先到先得

已经有200+小伙伴参与并成功收款！
快来一起薅羊毛吧～

#副业 #零花钱 #AI工具 #体验官 #真实收入 #薅羊毛
EOF

# 第7步: 创建运营手册
echo "📖 创建运营手册..."
cat > marketing-assets/operation-manual.md << 'EOF'
# 凤凰计划运营手册

## 每日运营流程

### 上午任务 (30分钟)
1. 查看小红书笔记数据
   - 点赞数、收藏数、评论数
   - 私信回复
   - 新增关注者

2. 导出问卷新数据
   - 登录腾讯问卷后台
   - 导出Excel格式数据
   - 运行数据处理脚本

### 下午任务 (60分钟)
3. 处理支付申请
   - 人工审核反馈质量
   - 批量生成支付列表
   - 使用支付宝逐一转账

4. 数据记录更新
   - 更新总指挥Excel表
   - 截图支付凭证
   - 统计当日数据

### 晚上任务 (30分钟)
5. 用户沟通
   - 回复私信咨询
   - 处理申诉问题
   - 群内互动维护

## 支付流程标准

### 支付前检查
- [ ] 反馈码有效性验证
- [ ] 支付宝账号格式正确
- [ ] 反馈内容质量评分≥3分
- [ ] 无重复申请记录

### 支付操作
- 转账金额：3.00元
- 转账备注：AI工具反馈奖励-{反馈码后4位}
- 截图保存：以反馈码命名

### 支付后处理
- [ ] 更新Excel记录状态
- [ ] 上传支付截图
- [ ] 发送确认消息给用户

## 数据监控指标

### 每日统计
- 新增问卷数量
- 有效反馈数量  
- 支付金额总计
- 小红书互动数据

### 质量控制
- 反馈平均质量分
- 用户满意度评分
- 投诉/申诉数量
- 恶意刷取识别

## 应急处理预案

### 支付宝风控
- 分散支付时间
- 降低单日支付频次
- 准备备用账号

### 恶意刷取
- IP地址监控
- 设备指纹识别
- 人工审核加强

### 用户投诉
- 标准回复话术
- 升级处理流程
- 补偿机制启动
EOF

echo "✅ 营销功能设置完成！"
echo ""
echo "📋 接下来需要手动完成："
echo "1. 设置腾讯问卷链接"
echo "2. 配置支付宝账号"
echo "3. 准备营销素材图片"
echo "4. 发布小红书营销内容"
echo ""
echo "🚀 预计2-3天即可开始营销活动！"