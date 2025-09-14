import OpenAI from 'openai';
import { envConfig } from '../config';
import { FraudAnalysisData, FraudAnalysisResult } from '../types/fraud';

export interface LLMService {
  generateExplanation(
    data: FraudAnalysisData,
    result: FraudAnalysisResult,
    provider: string,
    status: string
  ): Promise<string>;
}
const config = envConfig.getConfig();
export class OpenAIService implements LLMService {
  private client: OpenAI;
  private cache: Map<string, string> = new Map();

  constructor() {
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  async generateExplanation(
    data: FraudAnalysisData,
    result: FraudAnalysisResult,
    provider: string,
    status: string
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(data, result, provider, status);

    // Check cache first
    const cachedExplanation = this.cache.get(cacheKey);
    if (cachedExplanation) {
      return cachedExplanation;
    }

    try {
      const explanation = await this.callOpenAI(data, result, provider, status);

      // Cache the result
      this.cache.set(cacheKey, explanation);

      // Clean up old cache entries periodically
      this.cleanupCache();

      return explanation;
    } catch (error) {
      console.error('Error generating LLM explanation:', error);
      return this.generateFallbackExplanation(data, result, provider, status);
    }
  }

  private async callOpenAI(
    data: FraudAnalysisData,
    result: FraudAnalysisResult,
    provider: string,
    status: string
  ): Promise<string> {
    const prompt = this.buildPrompt(data, result, provider, status);

    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a fraud detection expert. Generate clear, concise explanations for payment routing decisions. Be professional and informative.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      this.generateFallbackExplanation(data, result, provider, status)
    );
  }

  private buildPrompt(
    data: FraudAnalysisData,
    result: FraudAnalysisResult,
    provider: string,
    status: string
  ): string {
    const triggeredRulesText =
      result.triggeredRules.length > 0
        ? `Triggered rules: ${result.triggeredRules.join(', ')}`
        : 'No specific risk factors detected';

    return `
Payment Transaction Analysis:
- Amount: ${data.currency} ${data.amount}
- Email: ${data.email}
- Domain: ${data.domain}
- Risk Score: ${result.riskScore.toFixed(2)}
- ${triggeredRulesText}
- Provider: ${provider}
- Status: ${status}

Generate a natural language explanation for this payment routing decision. Explain why the payment was ${status === 'blocked' ? 'blocked' : 'processed'} and routed to ${provider}. Keep it under 100 words and make it human-readable.
    `.trim();
  }

  private generateFallbackExplanation(
    _data: FraudAnalysisData,
    result: FraudAnalysisResult,
    provider: string,
    status: string
  ): string {
    const riskLevel = result.riskScore < 0.3 ? 'low' : result.riskScore < 0.7 ? 'moderate' : 'high';

    if (status === 'blocked') {
      return `This payment was blocked due to a ${riskLevel} risk score (${result.riskScore.toFixed(2)}) based on ${result.triggeredRules.join(', ')}.`;
    }

    return `This payment was routed to ${provider} due to a ${riskLevel} risk score (${result.riskScore.toFixed(2)}) based on ${result.triggeredRules.join(', ')}.`;
  }

  private generateCacheKey(
    data: FraudAnalysisData,
    result: FraudAnalysisResult,
    provider: string,
    status: string
  ): string {
    return `${data.amount}-${data.currency}-${data.domain}-${result.riskScore.toFixed(2)}-${provider}-${status}`;
  }

  private cleanupCache(): void {
    // Simple cache cleanup - in production, you might want a more sophisticated approach
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      const toDelete = entries.slice(0, 20); // Remove oldest 20 entries
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
