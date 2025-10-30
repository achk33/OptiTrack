import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware to validate request and return errors
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return validation errors
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
      })),
    });
  };
};

/**
 * Common validation rules
 */
export const validationRules = {
  // Email validation
  email: () =>
    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Email must not exceed 255 characters'),

  // Password validation
  password: () =>
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,.~`]/)
      .withMessage('Password must contain at least one special character'),

  // Name validation
  name: (fieldName: string = 'name') =>
    body(fieldName)
      .trim()
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isLength({ min: 2, max: 100 })
      .withMessage(`${fieldName} must be between 2 and 100 characters`)
      .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
      .withMessage(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`),

  // ID validation (UUID)
  id: (paramName: string = 'id') =>
    body(paramName)
      .trim()
      .notEmpty()
      .withMessage(`${paramName} is required`)
      .isUUID()
      .withMessage(`${paramName} must be a valid UUID`),

  // Role validation
  role: () =>
    body('role')
      .trim()
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['Admin', 'Technicien', 'Lecteur', 'ADMIN', 'TECHNICIEN', 'VIEWER'])
      .withMessage('Role must be Admin, Technicien, or Lecteur'),

  // String validation with length
  string: (fieldName: string, min: number = 1, max: number = 255) =>
    body(fieldName)
      .trim()
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isLength({ min, max })
      .withMessage(`${fieldName} must be between ${min} and ${max} characters`),

  // Optional string validation
  optionalString: (fieldName: string, max: number = 255) =>
    body(fieldName)
      .optional()
      .trim()
      .isLength({ max })
      .withMessage(`${fieldName} must not exceed ${max} characters`),

  // Number validation
  number: (fieldName: string, min?: number, max?: number) => {
    let chain = body(fieldName)
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isNumeric()
      .withMessage(`${fieldName} must be a number`);

    if (min !== undefined) {
      chain = chain.custom((value) => value >= min)
        .withMessage(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined) {
      chain = chain.custom((value) => value <= max)
        .withMessage(`${fieldName} must not exceed ${max}`);
    }

    return chain;
  },

  // Date validation
  date: (fieldName: string) =>
    body(fieldName)
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isISO8601()
      .withMessage(`${fieldName} must be a valid date`),

  // URL validation
  url: (fieldName: string) =>
    body(fieldName)
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isURL()
      .withMessage(`${fieldName} must be a valid URL`),

  // Boolean validation
  boolean: (fieldName: string) =>
    body(fieldName)
      .isBoolean()
      .withMessage(`${fieldName} must be a boolean`),
};

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .substring(0, 10000); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Escape special characters for SQL (though Prisma handles this)
 */
export function escapeSql(input: string): string {
  return input.replace(/['";\\]/g, '\\$&');
}
