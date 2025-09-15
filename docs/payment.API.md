# Payment Routing API Documentation

## Overview

The Payment Routing API is a lightweight backend service that simulates routing payment requests to different payment processors (Stripe, PayPal) based on fraud risk assessment. The API uses machine learning and rule-based fraud detection to determine the appropriate payment processor and generates human-readable explanations for each decision.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, no authentication is required. In production, implement proper API key or JWT authentication.

## Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per IP address
- **Headers**: Rate limit information is included in response headers

## Endpoints

### 1. Process Payment

**POST** `/charge`

Process a payment request with fraud detection and routing.

#### Request Body

```json
{
  "amount": 1000,
  "currency": "USD",
  "source": "tok_test",
  "email": "donor@example.com"
}
```

#### Request Parameters

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `amount` | number | Yes | Payment amount in cents | Positive number, max 1,000,000 |
| `currency` | string | Yes | Currency code | 3-letter code (USD, EUR, GBP, CAD, AUD, JPY) |
| `source` | string | Yes | Payment source token | 1-100 characters |
| `email` | string | Yes | Customer email | Valid email format, max 255 characters |

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_abc123",
    "provider": "stripe",
    "status": "success",
    "riskScore": 0.32,
    "explanation": "This payment was routed to Stripe due to a low risk score based on normal transaction patterns.",
    "timestamp": "2023-12-01T10:30:00.000Z"
  },
  "message": "Payment processed successfully",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

**Blocked Payment (200 OK)**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_xyz789",
    "provider": "blocked",
    "status": "blocked",
    "riskScore": 0.85,
    "explanation": "This payment was blocked due to a high risk score based on suspicious email domain and large amount.",
    "timestamp": "2023-12-01T10:30:00.000Z"
  },
  "message": "Payment processed successfully",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

**Validation Error (400 Bad Request)**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid payment request data",
  "timestamp": "2023-12-01T10:30:00.000Z",
  "details": {
    "validationErrors": [
      {
        "field": "amount",
        "message": "Amount must be a positive number",
        "value": -100
      }
    ]
  }
}
```

### 2. Get Transactions

**GET** `/transactions`

Retrieve transaction history with optional filtering and pagination.

#### Query Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `email` | string | No | Filter by email address | - |
| `status` | string | No | Filter by status (success, failed, blocked) | - |
| `provider` | string | No | Filter by provider (stripe, paypal, blocked) | - |
| `startDate` | string | No | Filter by start date (ISO 8601) | - |
| `endDate` | string | No | Filter by end date (ISO 8601) | - |
| `page` | number | No | Page number for pagination | 1 |
| `limit` | number | No | Number of items per page (1-100) | 10 |
| `sortBy` | string | No | Sort field (timestamp, amount, riskScore, email) | timestamp |
| `sortOrder` | string | No | Sort order (asc, desc) | desc |

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abc123",
        "amount": 1000,
        "currency": "USD",
        "email": "donor@example.com",
        "source": "tok_test",
        "provider": "stripe",
        "status": "success",
        "riskScore": 0.32,
        "explanation": "This payment was routed to Stripe due to a low risk score...",
        "timestamp": "2023-12-01T10:30:00.000Z",
        "metadata": {
          "triggeredRules": ["high_value_currency"],
          "isHighRisk": false
        }
      }
    ],
    "stats": {
      "total": 150,
      "byStatus": {
        "success": 120,
        "blocked": 25,
        "failed": 5
      },
      "byProvider": {
        "stripe": 80,
        "paypal": 40,
        "blocked": 25
      },
      "totalAmount": 150000,
      "averageAmount": 1000
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15
    }
  },
  "message": "Transactions retrieved successfully",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### 3. Get Transaction by ID

**GET** `/transactions/:id`

Retrieve a specific transaction by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Transaction ID |

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": {
    "id": "txn_abc123",
    "amount": 1000,
    "currency": "USD",
    "email": "donor@example.com",
    "source": "tok_test",
    "provider": "stripe",
    "status": "success",
    "riskScore": 0.32,
    "explanation": "This payment was routed to Stripe due to a low risk score...",
    "timestamp": "2023-12-01T10:30:00.000Z",
    "metadata": {
      "triggeredRules": ["high_value_currency"],
      "isHighRisk": false
    }
  },
  "message": "Transaction retrieved successfully",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

**Not Found (404 Not Found)**
```json
{
  "success": false,
  "error": "Transaction not found",
  "message": "Transaction not found",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### 4. Get Transaction Statistics

**GET** `/transactions/stats`

Retrieve aggregated transaction statistics.

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "success": 120,
      "blocked": 25,
      "failed": 5
    },
    "byProvider": {
      "stripe": 80,
      "paypal": 40,
      "blocked": 25
    },
    "totalAmount": 150000,
    "averageAmount": 1000
  },
  "message": "Transaction statistics retrieved successfully",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### 5. Health Check

**GET** `/health`

Check the health status of the API.

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-01T10:30:00.000Z",
    "uptime": 3600.5,
    "memory": {
      "rss": 45678592,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1048576,
      "arrayBuffers": 0
    }
  },
  "message": "Service is healthy",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### 6. Ping

**GET** `/ping`

A simple endpoint to check if the service is alive.

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": {
    "message": "pong"
  },
  "message": "Service is reachable",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

## Error Responses

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Error Response Format

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2023-12-01T10:30:00.000Z",
  "details": {
    "additionalInfo": "Additional error details"
  }
}
```

## Fraud Detection Logic

### Risk Scoring

The API uses a rule-based fraud detection system with the following rules:

1. **Large Amount Rule** (Weight: 0.3)
   - Triggers when amount > $5,000 (configurable)
   - Description: "Transaction amount exceeds large amount threshold"

2. **Suspicious Domain Rule** (Weight: 0.4)
   - Triggers for domains: .ru, .test.com, .example.com (configurable)
   - Description: "Email domain is flagged as suspicious"

3. **Test Domain Rule** (Weight: 0.2)
   - Triggers for domains containing "test" or "example"
   - Description: "Email domain contains test or example keywords"

4. **High Value Currency Rule** (Weight: 0.1)
   - Triggers for USD transactions > $1,000
   - Description: "High value transaction in USD"

5. **Suspicious Email Pattern Rule** (Weight: 0.2)
   - Triggers for emails starting with numbers or containing special patterns
   - Description: "Email address has suspicious patterns"

### Routing Logic

- **Risk Score < 0.2**: Route to Stripe
- **Risk Score 0.2-0.4**: Route to PayPal
- **Risk Score 0.4-0.5**: Route to Stripe
- **Risk Score ≥ 0.5**: Block transaction

### LLM Integration

The API uses OpenAI's GPT-3.5-turbo to generate human-readable explanations for each payment decision. The explanations are cached for 5 minutes to improve performance.

## Examples

### Example 1: Low-Risk Payment

```bash
curl -X POST http://localhost:3000/api/charge \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "source": "tok_test",
    "email": "user@example.com"
  }'
```

### Example 2: High-Risk Payment

```bash
curl -X POST http://localhost:3000/api/charge \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "USD",
    "source": "tok_test",
    "email": "user@test.ru"
  }'
```

### Example 3: Get Transactions with Filtering

```bash
curl "http://localhost:3000/api/transactions?status=success&page=1&limit=10"
```

## Rate Limiting Headers

The API includes rate limiting information in response headers:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Security Considerations

1. **Input Validation**: All inputs are validated using Joi schemas
2. **Rate Limiting**: Prevents abuse and ensures fair usage
3. **CORS**: Configurable cross-origin resource sharing
4. **Helmet**: Security headers for protection against common vulnerabilities
5. **Error Handling**: Sensitive information is not exposed in error messages

## Monitoring and Logging

- All transactions are logged in memory with timestamps
- Health check endpoint for monitoring
- Structured logging with Winston
- Error tracking and reporting
