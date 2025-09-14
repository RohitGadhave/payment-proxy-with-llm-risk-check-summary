# Payment Routing API

A production-grade backend API that simulates routing payment requests to different payment processors (Stripe, PayPal) based on fraud risk assessment. The API uses machine learning and rule-based fraud detection to determine the appropriate payment processor and generates human-readable explanations for each decision.

## 🚀 Features

- **Fraud Detection**: Rule-based fraud scoring with configurable thresholds
- **Payment Routing**: Intelligent routing to Stripe, PayPal, or blocking based on risk
- **LLM Integration**: OpenAI GPT-3.5-turbo for generating human-readable explanations
- **Transaction Logging**: In-memory transaction storage with comprehensive querying
- **API Documentation**: Complete OpenAPI-style documentation
- **Comprehensive Testing**: 80%+ test coverage with unit and integration tests
- **Docker Support**: Containerized deployment with Docker and Docker Compose
- **Production Ready**: Rate limiting, security headers, error handling, and monitoring

## 📋 Requirements

- Node.js 22+ 
- npm or yarn
- OpenAI API key
- Docker (optional, for containerized deployment)

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd payment-routing-api
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Fraud Detection Configuration
FRAUD_THRESHOLD=0.5
LARGE_AMOUNT_THRESHOLD=5000
SUSPICIOUS_DOMAINS=.ru,.test.com,.example.com

# Logging
LOG_LEVEL=info
```

### 3. Development

```bash
# Start development server with hot reload
npm run dev

# Build the application
npm run build

# Start production server
npm start
```

### 4. Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### 5. Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Using Docker directly

```bash
# Build the image
docker build -t payment-routing-api .

# Run the container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your_api_key_here \
  payment-routing-api
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/charge` | Process a payment with fraud detection |
| GET | `/transactions` | Get transaction history with filtering |
| GET | `/transactions/:id` | Get specific transaction by ID |
| GET | `/transactions/stats` | Get transaction statistics |
| GET | `/health` | Health check endpoint |

### Example Usage

#### Process a Payment

```bash
curl -X POST http://localhost:3000/api/charge \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "USD",
    "source": "tok_test",
    "email": "donor@example.com"
  }'
```

#### Get Transactions

```bash
curl "http://localhost:3000/api/transactions?status=success&page=1&limit=10"
```

For complete API documentation, see [docs/API.md](docs/API.md).

## 🧠 Fraud Detection Logic

### Risk Scoring System

The API uses a weighted rule-based system to calculate fraud risk scores (0-1):

1. **Large Amount Rule** (Weight: 0.3)
   - Triggers when amount > $5,000 (configurable)
   - Flags high-value transactions as potentially risky

2. **Suspicious Domain Rule** (Weight: 0.4)
   - Triggers for domains: .ru, .test.com, .example.com
   - Flags known suspicious or test domains

3. **Test Domain Rule** (Weight: 0.2)
   - Triggers for domains containing "test" or "example"
   - Identifies test/development transactions

4. **High Value Currency Rule** (Weight: 0.1)
   - Triggers for USD transactions > $1,000
   - Flags high-value USD transactions

5. **Suspicious Email Pattern Rule** (Weight: 0.2)
   - Triggers for emails starting with numbers or containing special patterns
   - Identifies potentially fake email addresses

### Routing Logic

- **Risk Score < 0.2**: Route to Stripe (lowest risk)
- **Risk Score 0.2-0.4**: Route to PayPal (moderate risk)
- **Risk Score 0.4-0.5**: Route to Stripe (higher risk, but acceptable)
- **Risk Score ≥ 0.5**: Block transaction (high risk)

### LLM Integration

The API uses OpenAI's GPT-3.5-turbo to generate human-readable explanations for each payment decision. The explanations are:

- **Cached for 5 minutes** to improve performance
- **Contextual** based on the specific risk factors
- **Professional** and suitable for customer communication
- **Fallback** to rule-based explanations if LLM fails

## 🏗️ Architecture

### Project Structure

```
src/
├── types/           # TypeScript interfaces and types
├── services/        # Business logic services
│   ├── fraud-detector.ts
│   ├── llm-service.ts
│   ├── payment-processor.ts
│   └── transaction-logger.ts
├── controllers/     # API controllers
├── middleware/      # Express middleware
├── routes/          # API routes
├── utils/           # Utility functions
├── app.ts           # Express app configuration
└── index.ts         # Application entry point

test/
├── services/        # Service unit tests
├── controllers/     # Controller tests
├── middleware/      # Middleware tests
├── integration/     # Integration tests
└── setup.ts         # Test setup configuration
```

### Key Components

1. **FraudDetectionService**: Implements rule-based fraud detection
2. **OpenAIService**: Handles LLM integration with caching
3. **PaymentRoutingService**: Orchestrates payment processing
4. **InMemoryTransactionLogger**: Manages transaction storage
5. **PaymentController**: Handles HTTP requests and responses

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment | development | No |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |
| `FRAUD_THRESHOLD` | Fraud blocking threshold | 0.5 | No |
| `LARGE_AMOUNT_THRESHOLD` | Large amount threshold | 5000 | No |
| `SUSPICIOUS_DOMAINS` | Comma-separated suspicious domains | .ru,.test.com,.example.com | No |
| `LOG_LEVEL` | Logging level | info | No |

### Fraud Rules Configuration

Fraud rules can be configured at runtime through the `FraudDetectionService`:

```typescript
const fraudDetector = new FraudDetectionService({
  threshold: 0.6,
  largeAmountThreshold: 10000,
  suspiciousDomains: ['.ru', '.suspicious.com'],
  rules: [
    // Custom rules can be added here
  ]
});
```

## 🧪 Testing

### Test Coverage

The project maintains 80%+ test coverage across:

- **Unit Tests**: Individual service and function testing
- **Integration Tests**: API endpoint testing
- **Mocking**: External service mocking (OpenAI, etc.)

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- fraud-detector.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Structure

- **Services**: Test business logic and algorithms
- **Controllers**: Test HTTP request/response handling
- **Middleware**: Test validation and error handling
- **Integration**: Test complete API workflows

## 🚀 Production Deployment

### Security Considerations

1. **Rate Limiting**: Prevents abuse and ensures fair usage
2. **Input Validation**: Comprehensive validation using Joi schemas
3. **CORS**: Configurable cross-origin resource sharing
4. **Helmet**: Security headers for protection against common vulnerabilities
5. **Error Handling**: Sensitive information is not exposed in error messages

### Monitoring and Logging

- **Health Check**: `/api/monitor/health` endpoint for monitoring
- **Structured Logging**: Winston-based logging with configurable levels
- **Transaction Logging**: All transactions logged with metadata
- **Error Tracking**: Comprehensive error handling and reporting

### Performance Optimization

- **LLM Caching**: 5-minute cache for OpenAI responses
- **In-Memory Storage**: Fast transaction retrieval
- **Connection Pooling**: Efficient database connections (when implemented)
- **Rate Limiting**: Prevents system overload

## 🔄 Assumptions and Trade-offs

### Assumptions

1. **Payment Processing**: Simulated payment processing (no real payment gateway integration)
2. **In-Memory Storage**: Transactions stored in memory (not persistent across restarts)
3. **Single Instance**: Designed for single-instance deployment
4. **OpenAI Dependency**: Requires OpenAI API key for explanations
5. **Rule-Based Detection**: Uses rule-based rather than ML-based fraud detection

### Trade-offs

1. **Performance vs. Persistence**: In-memory storage for speed vs. data persistence
2. **Simplicity vs. Scalability**: Single-instance design vs. horizontal scaling
3. **Cost vs. Quality**: OpenAI API costs vs. explanation quality
4. **Speed vs. Accuracy**: Rule-based detection vs. complex ML models
5. **Development vs. Production**: Simulated services vs. real payment gateways

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Run linting and formatting
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions, issues, or contributions:

1. Check the [API Documentation](docs/API.md)
2. Review existing [Issues](../../issues)
3. Create a new issue with detailed information
4. Contact the development team

## 🔮 Future Enhancements

- [ ] Database persistence for transactions
- [ ] Redis caching for better performance
- [ ] Real payment gateway integration
- [ ] Machine learning-based fraud detection
- [ ] Multi-tenant support
- [ ] Advanced analytics and reporting
- [ ] Webhook support for real-time notifications
- [ ] Admin dashboard for configuration management
