import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // OpenAI Configuration
  OPENAI_API_KEY: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Fraud Detection Configuration
  FRAUD_THRESHOLD: number;
  LARGE_AMOUNT_THRESHOLD: number;
  SUSPICIOUS_DOMAINS: string[];
  RAPID_FIRE_TRANSACTION_LIMIT_TIME: number;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';

  // CORS
  ALLOWED_ORIGINS?: string[];
}

class EnvironmentConfigManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): EnvironmentConfig {
    return {
      // Server Configuration
      NODE_ENV: this.getEnvVar('NODE_ENV', 'development') as EnvironmentConfig['NODE_ENV'],
      PORT: this.getEnvVarAsNumber('PORT', 3000),

      // OpenAI Configuration
      OPENAI_API_KEY: this.getRequiredEnvVar('OPENAI_API_KEY'),

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: this.getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: this.getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),

      // Fraud Detection Configuration
      FRAUD_THRESHOLD: this.getEnvVarAsNumber('FRAUD_THRESHOLD', 0.5),
      LARGE_AMOUNT_THRESHOLD: this.getEnvVarAsNumber('LARGE_AMOUNT_THRESHOLD', 5000),
      SUSPICIOUS_DOMAINS: this.getEnvVarAsArray('SUSPICIOUS_DOMAINS', [
        '.ru',
        'test.com',
        'example.com',
      ]),
      RAPID_FIRE_TRANSACTION_LIMIT_TIME: this.getEnvVarAsNumber(
        'RAPID_FIRE_TRANSACTION_LIMIT_TIME',
        5000
      ), // Less than 5 seconds since last

      // Logging
      LOG_LEVEL: this.getEnvVar('LOG_LEVEL', 'info') as EnvironmentConfig['LOG_LEVEL'],

      // CORS
      ALLOWED_ORIGINS: this.getEnvVarAsArray('ALLOWED_ORIGINS', []),
    };
  }

  private getEnvVar(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  private getRequiredEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getEnvVarAsNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const parsed = value?.includes('.') ? parseFloat(value) : parseInt(value, 10);

    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
    }

    return parsed;
  }

  private getEnvVarAsArray(key: string, defaultValue: string[]): string[] {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  private validateConfig(): void {
    // Validate NODE_ENV
    if (!['development', 'production', 'test'].includes(this.config.NODE_ENV)) {
      throw new Error(
        `Invalid NODE_ENV: ${this.config.NODE_ENV}. Must be one of: development, production, test`
      );
    }

    // Validate PORT
    if (this.config.PORT < 1 || this.config.PORT > 65535) {
      throw new Error(`Invalid PORT: ${this.config.PORT}. Must be between 1 and 65535`);
    }

    // Validate OPENAI_API_KEY
    if (!this.config.OPENAI_API_KEY || this.config.OPENAI_API_KEY.length < 10) {
      throw new Error('OPENAI_API_KEY must be a valid API key');
    }

    // Validate rate limiting
    if (this.config.RATE_LIMIT_WINDOW_MS < 1000) {
      throw new Error('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
    }

    if (this.config.RATE_LIMIT_MAX_REQUESTS < 1) {
      throw new Error('RATE_LIMIT_MAX_REQUESTS must be at least 1');
    }

    // Validate fraud detection
    if (this.config.FRAUD_THRESHOLD < 0 || this.config.FRAUD_THRESHOLD > 1) {
      throw new Error('FRAUD_THRESHOLD must be between 0 and 1');
    }

    if (this.config.LARGE_AMOUNT_THRESHOLD < 0) {
      throw new Error('LARGE_AMOUNT_THRESHOLD must be a positive number');
    }

    // Validate log level
    if (!['error', 'warn', 'info', 'debug'].includes(this.config.LOG_LEVEL)) {
      throw new Error(
        `Invalid LOG_LEVEL: ${this.config.LOG_LEVEL}. Must be one of: error, warn, info, debug`
      );
    }
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}

// Create singleton instance
const envConfig = new EnvironmentConfigManager();

export default envConfig;
