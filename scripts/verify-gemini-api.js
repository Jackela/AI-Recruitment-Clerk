#!/usr/bin/env node

/**
 * Gemini API密钥验证脚本
 * 验证API密钥配置和连接性
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function verifyGeminiAPI() {
  console.log('🔍 验证Gemini API配置...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  // 检查密钥是否配置
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY环境变量未设置');
    return false;
  }
  
  if (apiKey === 'your_actual_gemini_api_key_here') {
    console.error('❌ GEMINI_API_KEY仍使用占位符，需要配置真实密钥');
    console.log('📖 请参考 GEMINI_API_CONFIGURATION.md 获取配置指南');
    return false;
  }

  // 验证密钥格式
  if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
    console.error('❌ GEMINI_API_KEY格式不正确');
    console.log('💡 有效的Gemini API密钥应以"AIza"开头且长度>=30字符');
    return false;
  }

  console.log('✅ API密钥格式验证通过');
  console.log(`🔑 使用密钥: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    console.log('🌐 测试API连接...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const startTime = Date.now();
    const result = await model.generateContent("Hello, this is a test message.");
    const response = await result.response;
    const text = response.text();
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Gemini API连接成功');
    console.log(`⚡ 响应时间: ${responseTime}ms`);
    console.log(`📝 测试响应: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    
    return true;
  } catch (error) {
    console.error('❌ Gemini API连接失败:');
    console.error(`   错误类型: ${error.name}`);
    console.error(`   错误信息: ${error.message}`);
    
    // 提供具体的错误指导
    if (error.message.includes('API key not valid')) {
      console.log('💡 建议: API密钥无效，请检查密钥是否正确复制');
    } else if (error.message.includes('quota')) {
      console.log('💡 建议: API配额已用完，请检查Google AI Studio配额');
    } else if (error.message.includes('permission')) {
      console.log('💡 建议: API密钥权限不足，请检查密钥权限设置');
    }
    
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 加载环境变量
  require('dotenv').config({ path: '.env.development' });
  
  verifyGeminiAPI().then(success => {
    if (success) {
      console.log('\n🎉 Gemini API配置验证成功！');
      console.log('✅ 系统可以正常使用AI功能');
    } else {
      console.log('\n❌ Gemini API配置验证失败');
      console.log('⚠️  AI相关功能将使用降级模式');
      console.log('📖 请参考 GEMINI_API_CONFIGURATION.md 进行配置');
    }
    
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 验证过程出现异常:', error);
    process.exit(1);
  });
}

module.exports = verifyGeminiAPI;