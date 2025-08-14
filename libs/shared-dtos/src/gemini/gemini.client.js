"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GeminiClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const common_1 = require("@nestjs/common");
const gemini_errors_1 = require("../errors/gemini-errors");
let GeminiClient = GeminiClient_1 = class GeminiClient {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GeminiClient_1.name);
        this.rateLimit = {
            requestsPerMinute: 60,
            requestsThisMinute: 0,
            lastResetTime: Date.now(),
        };
        if (!config.apiKey || config.apiKey === 'your_gemini_api_key_here') {
            throw new gemini_errors_1.GeminiConfigurationError('GEMINI_API_KEY environment variable is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(config.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: config.model || 'gemini-1.5-flash',
            generationConfig: {
                temperature: config.temperature || 0.3,
                topK: config.topK || 40,
                topP: config.topP || 0.95,
                maxOutputTokens: config.maxOutputTokens || 8192,
            },
            safetySettings: [
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });
    }
    checkRateLimit() {
        const now = Date.now();
        const timeSinceReset = now - this.rateLimit.lastResetTime;
        // Reset counter every minute
        if (timeSinceReset >= 60000) {
            this.rateLimit.requestsThisMinute = 0;
            this.rateLimit.lastResetTime = now;
        }
        if (this.rateLimit.requestsThisMinute >= this.rateLimit.requestsPerMinute) {
            const waitTime = 60000 - timeSinceReset;
            throw new gemini_errors_1.GeminiRateLimitError(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`, Math.ceil(waitTime / 1000));
        }
        this.rateLimit.requestsThisMinute++;
    }
    async generateText(prompt, retries = 3) {
        this.checkRateLimit();
        const startTime = Date.now();
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                this.logger.debug(`Generating text (attempt ${attempt}/${retries})`);
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                if (!response.text()) {
                    throw new gemini_errors_1.GeminiApiError('Empty response from Gemini API');
                }
                const processingTimeMs = Date.now() - startTime;
                const text = response.text();
                return {
                    data: text,
                    processingTimeMs,
                    confidence: 0.85, // Default confidence score
                };
            }
            catch (error) {
                this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === retries) {
                    this.logger.error(`All ${retries} attempts failed for Gemini request`);
                    // Convert generic errors to specific Gemini errors
                    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
                        throw new gemini_errors_1.GeminiRateLimitError(error.message);
                    }
                    if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
                        throw new gemini_errors_1.GeminiTimeoutError(error.message);
                    }
                    if (error.message?.includes('invalid') || error.message?.includes('validation')) {
                        throw new gemini_errors_1.GeminiValidationError(error.message);
                    }
                    throw new gemini_errors_1.GeminiApiError(error.message || 'Unknown Gemini API error', error.status, error);
                }
                // Exponential backoff
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async generateStructuredResponse(prompt, schema, retries = 3) {
        const structuredPrompt = `${prompt}

Please respond with a valid JSON object that matches this schema:
${schema}

Important guidelines:
- Return ONLY valid JSON, no additional text or formatting
- Ensure all required fields are present
- Use null for missing information, never omit fields
- For arrays, return empty arrays [] if no items found
- For dates, use ISO 8601 format (YYYY-MM-DD)`;
        const response = await this.generateText(structuredPrompt, retries);
        try {
            // Clean the response to extract JSON
            let jsonText = response.data.trim();
            // Remove potential markdown formatting
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '');
            }
            const parsedData = JSON.parse(jsonText);
            return {
                data: parsedData,
                processingTimeMs: response.processingTimeMs,
                confidence: response.confidence,
            };
        }
        catch (parseError) {
            this.logger.error('Failed to parse JSON response from Gemini', {
                error: parseError.message,
                response: response.data,
            });
            throw new gemini_errors_1.GeminiParsingError(`Invalid JSON response from Gemini: ${parseError.message}`, response.data);
        }
    }
    async generateWithVision(prompt, imageData, mimeType, retries = 3) {
        this.checkRateLimit();
        const startTime = Date.now();
        const visionModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                this.logger.debug(`Generating vision response (attempt ${attempt}/${retries})`);
                const imagePart = {
                    inlineData: {
                        data: Buffer.isBuffer(imageData) ? imageData.toString('base64') : imageData,
                        mimeType,
                    },
                };
                const result = await visionModel.generateContent([prompt, imagePart]);
                const response = await result.response;
                if (!response.text()) {
                    throw new gemini_errors_1.GeminiApiError('Empty response from Gemini Vision API');
                }
                const processingTimeMs = Date.now() - startTime;
                return {
                    data: response.text(),
                    processingTimeMs,
                    confidence: 0.8, // Slightly lower confidence for vision tasks
                };
            }
            catch (error) {
                this.logger.warn(`Vision attempt ${attempt} failed: ${error.message}`);
                if (attempt === retries) {
                    this.logger.error(`All ${retries} vision attempts failed`);
                    throw error;
                }
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async generateStructuredVisionResponse(prompt, imageData, mimeType, schema, retries = 3) {
        const structuredPrompt = `${prompt}

Please respond with a valid JSON object that matches this schema:
${schema}

Important guidelines:
- Return ONLY valid JSON, no additional text or formatting
- Ensure all required fields are present
- Use null for missing information, never omit fields
- For arrays, return empty arrays [] if no items found
- For dates, use ISO 8601 format (YYYY-MM-DD)`;
        const response = await this.generateWithVision(structuredPrompt, imageData, mimeType, retries);
        try {
            let jsonText = response.data.trim();
            // Remove potential markdown formatting
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '');
            }
            const parsedData = JSON.parse(jsonText);
            return {
                data: parsedData,
                processingTimeMs: response.processingTimeMs,
                confidence: response.confidence,
            };
        }
        catch (parseError) {
            this.logger.error('Failed to parse JSON response from Gemini Vision', {
                error: parseError.message,
                response: response.data,
            });
            throw new gemini_errors_1.GeminiParsingError(`Invalid JSON response from Gemini Vision: ${parseError.message}`, response.data);
        }
    }
    async healthCheck() {
        try {
            const response = await this.generateText('Respond with "OK" to confirm API connectivity.', 1);
            return response.data.toLowerCase().includes('ok');
        }
        catch {
            return false;
        }
    }
};
exports.GeminiClient = GeminiClient;
exports.GeminiClient = GeminiClient = GeminiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], GeminiClient);
