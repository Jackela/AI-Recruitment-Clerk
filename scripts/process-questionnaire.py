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
