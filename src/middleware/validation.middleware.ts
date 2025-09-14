import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { PaymentRequest } from '../types/payment';
import { ErrorResponse } from '../types/api';

export const paymentRequestSchema = Joi.object({
  amount: Joi.number().positive().max(1000000).required().messages({
    'number.positive': 'Amount must be a positive number',
    'number.max': 'Amount cannot exceed 1,000,000',
    'any.required': 'Amount is required',
  }),
  currency: Joi.string()
    .length(3)
    .uppercase()
    .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY')
    .required()
    .messages({
      'string.length': 'Currency must be a 3-letter code',
      'any.only': 'Currency must be one of: USD, EUR, GBP, CAD, AUD, JPY',
      'any.required': 'Currency is required',
    }),
  source: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Source cannot be empty',
    'string.max': 'Source cannot exceed 100 characters',
    'any.required': 'Source is required',
  }),
  email: Joi.string().email().max(255).required().messages({
    'string.email': 'Email must be a valid email address',
    'string.max': 'Email cannot exceed 255 characters',
    'any.required': 'Email is required',
  }),
});

export const transactionQuerySchema = Joi.object({
  email: Joi.string().email().optional(),
  status: Joi.string().valid('success', 'failed', 'blocked').optional(),
  provider: Joi.string().valid('stripe', 'paypal', 'blocked').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  sortBy: Joi.string().valid('timestamp', 'amount', 'riskScore', 'email').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional(),
});

export const validatePaymentRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = paymentRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: 'Invalid payment request data',
      timestamp: new Date(),
      details: {
        validationErrors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      },
    };

    res.status(400).json(errorResponse);
    return;
  }

  req.body = value as PaymentRequest;
  next();
};

export const validateTransactionQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = transactionQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: 'Invalid query parameters',
      timestamp: new Date(),
      details: {
        validationErrors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      },
    };

    res.status(400).json(errorResponse);
    return;
  }

  req.query = value;
  next();
};

export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid Content-Type',
        message: 'Content-Type must be application/json',
        timestamp: new Date(),
      };

      res.status(400).json(errorResponse);
      return;
    }
  }

  next();
};
