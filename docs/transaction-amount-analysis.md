 # Transaction Amount Analysis

This document describes the comprehensive transaction amount analysis features implemented in the fraud detection system.

## Overview

The transaction amount analysis module provides sophisticated detection of suspicious transaction patterns based on amount characteristics, user history, and merchant context. This is a critical component of financial fraud prevention.

## Features Implemented

### 1. Round Number Amount Detection
**Rule**: `round_number_amount`
**Weight**: 0.15
**Description**: Detects transactions with suspicious round number amounts

**Triggered for**:
- Exactly $100, $500, $1000, $2000, $5000, $10000, $20000, $50000, $100000

**Why it's suspicious**:
- Round numbers are often used in card testing
- Legitimate transactions typically have more varied amounts
- Fraudsters use round numbers to test card limits

### 2. Gradual Amount Increase Detection
**Rule**: `gradual_amount_increase`
**Weight**: 0.25
**Description**: Detects multiple transactions with gradual amount increases (testing limits)

**Triggered when**:
- 3+ consecutive transactions show increasing amounts
- Current amount is higher than the last transaction
- Pattern suggests systematic limit testing

**Example pattern**: $10 → $20 → $30 → $40 → $50

### 3. Under Reporting Threshold Detection
**Rule**: `under_reporting_threshold`
**Weight**: 0.30
**Description**: Detects amounts just under reporting thresholds

**Triggered when**:
- Amount is within 1% of reporting threshold (e.g., $9,999.99 when threshold is $10,000)
- Suggests intentional avoidance of regulatory reporting

**Jurisdiction-specific thresholds**:
- USD: $10,000
- EUR: €10,000
- GBP: £10,000
- CAD: $10,000
- AUD: $10,000

### 4. Micro-Transaction Followed by Large Amount
**Rule**: `micro_to_large_transaction`
**Weight**: 0.20
**Description**: Detects micro-transactions followed by large amounts

**Triggered when**:
- Previous transaction was under $10 (micro-transaction)
- Current transaction is over $100 (large amount)
- Pattern suggests card validation followed by fraud

### 5. Historical Average Exceedance
**Rule**: `exceeds_historical_average`
**Weight**: 0.35
**Description**: Detects amounts exceeding user's historical average by 3+ standard deviations

**Triggered when**:
- Current amount > (user average + 3 × standard deviation)
- Indicates unusual spending behavior
- May suggest account takeover or stolen card

### 6. First-Time High Value Transaction
**Rule**: `first_time_high_value`
**Weight**: 0.25
**Description**: Detects first-time transactions over $500

**Triggered when**:
- User has no previous transaction history
- Transaction amount exceeds $500
- High risk for new accounts

### 7. Merchant Category Inconsistency
**Rule**: `inconsistent_merchant_category`
**Weight**: 0.20
**Description**: Detects amounts inconsistent with merchant category

**Category-specific ranges**:
- Grocery: $10 - $200
- Gas: $20 - $100
- Restaurant: $5 - $150
- Retail: $10 - $1,000
- Electronics: $50 - $5,000
- Jewelry: $100 - $10,000
- Travel: $100 - $5,000
- Utilities: $20 - $500
- Subscription: $5 - $100
- Digital Goods: $1 - $200

### 8. Maximum Credit Limit Transaction
**Rule**: `maximum_credit_limit`
**Weight**: 0.40
**Description**: Detects transactions at maximum credit card limit

**Triggered when**:
- Amount is within 1% of credit card limit
- Suggests maximum utilization attempt
- High risk for fraud or financial distress

### 9. Odd Cent Patterns
**Rule**: `odd_cent_patterns`
**Weight**: 0.10
**Description**: Detects suspicious cent amount patterns

**Triggered for**:
- .00 (exact dollar amounts)
- .01 (penny amounts)
- .99 (psychological pricing)

**Why it's suspicious**:
- Legitimate transactions have more varied cent amounts
- Fraudsters often use these patterns in testing

### 10. Sequential Amount Testing
**Rule**: `sequential_amount_testing`
**Weight**: 0.30
**Description**: Detects sequential amount testing patterns

**Triggered when**:
- 2+ consecutive transactions differ by ≤ $1
- Pattern suggests systematic testing (e.g., $1.00, $2.00, $3.00, $4.00, $5.00)

## Data Requirements

To enable transaction amount analysis, the following data must be provided:

```typescript
interface TransactionAmountData {
  amount: number;                    // Current transaction amount
  currency: string;                  // Transaction currency
  previousAmounts: number[];         // User's transaction history
  userAverageAmount: number;         // User's average transaction amount
  userStandardDeviation: number;     // Standard deviation of user amounts
  merchantCategory: string;          // Merchant category code
  isFirstTimeTransaction: boolean;   // Whether this is user's first transaction
  creditCardLimit?: number;          // Credit card limit (if available)
  reportingThreshold: number;        // Regulatory reporting threshold
}
```

## Risk Scoring

The system uses weighted scoring where each rule contributes to the total risk score:

- **Low Risk**: 0.0 - 0.2
- **Medium Risk**: 0.2 - 0.4
- **High Risk**: 0.4 - 0.6
- **Critical Risk**: 0.6 - 1.0

Multiple rules can trigger simultaneously, and their weights are accumulated to determine the final risk score.

## Configuration

Transaction amount analysis can be configured through the fraud detection service:

```typescript
const fraudDetector = new FraudDetectionService();

// Update configuration
fraudDetector.updateConfig({
  threshold: 0.5,  // Risk threshold for blocking
  largeAmountThreshold: 5000,  // Large amount threshold
  suspiciousDomains: ['.ru', '.test.com'],  // Suspicious domains
});
```

## Integration Example

```typescript
import { FraudDetectionService } from './services/fraud-detector.service';
import { FraudAnalysisData } from './types/fraud';

const fraudDetector = new FraudDetectionService();

const fraudData: FraudAnalysisData = {
  amount: 1000,
  currency: 'USD',
  email: 'user@example.com',
  domain: 'example.com',
  timestamp: new Date(),
  transactionAmount: {
    amount: 1000,
    currency: 'USD',
    previousAmounts: [50, 75, 100, 150],
    userAverageAmount: 93.75,
    userStandardDeviation: 40.31,
    merchantCategory: 'retail',
    isFirstTimeTransaction: false,
    creditCardLimit: 5000,
    reportingThreshold: 10000,
  },
};

const result = await fraudDetector.analyzeRisk(fraudData);
console.log('Risk Score:', result.riskScore);
console.log('Triggered Rules:', result.triggeredRules);
console.log('Is High Risk:', result.isHighRisk);
```

## Testing

Comprehensive test coverage is provided in `test/services/transaction-amount-analysis.test.ts`:

- Round number detection tests
- Gradual increase pattern tests
- Reporting threshold tests
- Micro-transaction tests
- Historical average tests
- First-time transaction tests
- Merchant category tests
- Credit limit tests
- Cent pattern tests
- Sequential testing tests
- Combined risk scoring tests

Run tests with:
```bash
npm test test/services/transaction-amount-analysis.test.ts
```

## Security Considerations

1. **Data Privacy**: Transaction history should be encrypted and access-controlled
2. **Performance**: Large transaction histories should be efficiently processed
3. **False Positives**: Rules should be tuned based on business requirements
4. **Compliance**: Ensure compliance with financial regulations (PCI DSS, etc.)
5. **Monitoring**: Implement alerting for high-risk transactions

## Future Enhancements

1. **Machine Learning Integration**: Use ML models for pattern recognition
2. **Real-time Learning**: Adapt thresholds based on transaction patterns
3. **External Data Sources**: Integrate with credit bureaus and fraud databases
4. **Advanced Analytics**: Implement time-series analysis for trend detection
5. **Custom Rules**: Allow business users to define custom amount rules

## Monitoring and Alerting

The system provides detailed logging and monitoring capabilities:

- Risk score distribution
- Rule trigger frequency
- False positive rates
- Performance metrics
- Alert generation for high-risk transactions

## Best Practices

1. **Regular Review**: Periodically review and adjust rule weights
2. **A/B Testing**: Test different configurations in controlled environments
3. **User Feedback**: Incorporate user feedback to reduce false positives
4. **Documentation**: Maintain clear documentation of rule logic
5. **Audit Trail**: Keep detailed logs of all fraud detection decisions
