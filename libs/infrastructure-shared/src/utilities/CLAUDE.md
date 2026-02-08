# Infrastructure Shared - Validation Utilities

This directory contains centralized validation utilities for the AI Recruitment Clerk application.

## Overview

The validation utilities provide:
- **EmailValidator**: RFC 5321 compliant email validation with domain restrictions
- **PhoneValidator**: Multi-format phone number validation (CN, US, International)
- **IdValidator**: ID format validation (UUID, MongoDB ObjectId, numeric, alphanumeric)
- **SchemaValidator**: Object schema validation with nested support
- **Validator**: Generic validation helpers for common scenarios

## Usage

### Email Validation

```typescript
import { EmailValidator } from '@ai-recruitment-clerk/infrastructure-shared';

// Basic email validation
const result = EmailValidator.validate('user@example.com');
if (!result.isValid) {
  console.error(result.errors); // ['Email format is invalid']
}

// With domain restrictions
const restrictedResult = EmailValidator.validate('user@tempmail.com', {
  allowedDomains: ['gmail.com', 'outlook.com'],
  blockedDomains: ['tempmail.com', 'throwaway.com']
});

// With warnings for temporary emails
const withWarnings = EmailValidator.validate('user@tempmail.com', {
  includeWarnings: true
});
console.log(withWarnings.warnings); // ['Email appears to be a temporary email address']

// Normalize email for storage
const normalized = EmailValidator.normalize('  User@Example.COM  '); // 'user@example.com'

// Extract domain
const domain = EmailValidator.extractDomain('user@example.com'); // 'example.com'
```

### Phone Validation

```typescript
import { PhoneValidator } from '@ai-recruitment-clerk/infrastructure-shared';

// Validate Chinese mobile number
const cnResult = PhoneValidator.validate('13812345678', {
  allowedFormats: ['CN']
});

// Validate international phone
const intlResult = PhoneValidator.validate('+1234567890', {
  allowedFormats: ['INTL'],
  allowInternational: true
});

// Format phone numbers
const formatted = PhoneValidator.format('13812345678', 'CN'); // '138 1234 5678'
const usFormatted = PhoneValidator.format('1234567890', 'US'); // '(123) 456-7890'

// Extract country code
const countryCode = PhoneValidator.extractCountryCode('+1234567890'); // '1'
```

### ID Validation

```typescript
import { IdValidator } from '@ai-recruitment-clerk/infrastructure-shared';

// Validate UUID v4
const uuidResult = IdValidator.validate('550e8400-e29b-41d4-a716-446655440000', {
  format: 'UUID'
});

// Validate MongoDB ObjectId
const mongoResult = IdValidator.validate('507f1f77bcf86cd799439011', {
  format: 'MONGO_ID'
});

// Validate with custom pattern
const customResult = IdValidator.validate('USER_123', {
  format: 'CUSTOM',
  customPattern: /^[A-Z]+_\d+$/
});

// Quick type checks
if (IdValidator.isUUID(someId)) {
  // Handle UUID
}
if (IdValidator.isMongoId(someId)) {
  // Handle MongoDB ObjectId
}
```

### Schema Validation

```typescript
import { SchemaValidator } from '@ai-recruitment-clerk/infrastructure-shared';

// Define a schema
const userSchema: SchemaDefinition = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 100
    },
    age: {
      type: 'number',
      required: true,
      minimum: 18,
      maximum: 100
    },
    role: {
      type: 'string',
      required: true,
      allowedValues: ['admin', 'user', 'guest']
    },
    address: {
      type: 'object',
      properties: {
        street: { type: 'string', required: true },
        city: { type: 'string', required: true }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      minLength: 1,
      maxLength: 5
    }
  }
};

// Validate data
const result = SchemaValidator.validate({
  email: 'user@example.com',
  age: 25,
  role: 'user',
  address: { street: '123 Main St', city: 'Boston' },
  tags: ['developer', 'typescript']
}, userSchema);

if (!result.isValid) {
  console.error(result.errors);
}

// Create a reusable validator
const validateUser = SchemaValidator.validatorFor(userSchema);
const validationResult = validateUser(userData);
```

### Generic Validators

```typescript
import { Validator } from '@ai-recruitment-clerk/infrastructure-shared';

// Required field validation
Validator.required(null, 'Username'); // { isValid: false, errors: ['Username is required'] }

// String length validation
Validator.validateLength('abc', 5, 10, 'Password'); // { isValid: false, errors: ['Password must be at least 5 characters'] }

// Numeric range validation
Validator.range(15, 18, 100, 'Age'); // { isValid: false, errors: ['Age must be at least 18'] }

// Pattern validation
Validator.pattern('abc', /^\d+$/, 'Phone'); // { isValid: false, errors: ['Phone format is invalid'] }

// Enum validation
Validator.oneOf('admin', ['user', 'guest'], 'Role'); // { isValid: false, errors: ['Role must be one of: user, guest'] }

// Combine multiple validators
const validateEmail = Validator.combine([
  (v) => Validator.required(v, 'Email'),
  (v) => EmailValidator.validate(v)
]);

const result = validateEmail('user@example.com');
```

### NestJS Controller Example

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import {
  EmailValidator,
  PhoneValidator,
  IdValidator,
  SchemaValidator,
  ValidationError
} from '@ai-recruitment-clerk/infrastructure-shared';

@Controller('users')
export class UsersController {
  private readonly userSchema: SchemaDefinition = {
    type: 'object',
    properties: {
      email: { type: 'string', required: true },
      phone: { type: 'string', required: true },
      name: { type: 'string', required: true, minLength: 2, maxLength: 50 }
    }
  };

  @Post()
  async createUser(@Body() body: unknown) {
    // Validate against schema
    const schemaResult = SchemaValidator.validate(body, this.userSchema);
    if (!schemaResult.isValid) {
      throw new ValidationError('Invalid user data', {
        errors: schemaResult.errors
      });
    }

    // Additional validation
    const typedBody = body as { email: string; phone: string };
    const emailResult = EmailValidator.validate(typedBody.email, {
      allowedDomains: ['gmail.com', 'outlook.com']
    });
    if (!emailResult.isValid) {
      throw new ValidationError('Invalid email', {
        errors: emailResult.errors
      });
    }

    const phoneResult = PhoneValidator.validate(typedBody.phone);
    if (!phoneResult.isValid) {
      throw new ValidationError('Invalid phone', {
        errors: phoneResult.errors
      });
    }

    // Create user...
  }
}
```

## ValidationResult Format

All validators return a `ValidationResult` object:

```typescript
interface ValidationResult {
  readonly isValid: boolean;      // True if validation passed
  readonly errors: string[];      // Array of error messages
  readonly warnings?: string[];   // Optional warnings (non-critical issues)
}
```

## Best Practices

1. **Validate early**: Validate input at service boundaries (controllers, API handlers)
2. **Use schemas**: Define schemas for complex objects to ensure consistency
3. **Provide clear error messages**: Include field names in validation errors
4. **Normalize input**: Use `EmailValidator.normalize()` before storing emails
5. **Combine validators**: Use `Validator.combine()` to create reusable validators
6. **Handle empty values**: Use `allowEmpty: true` for optional fields

## Phone Format Support

| Format | Pattern | Example |
|--------|---------|---------|
| CN | 11 digits, starts with 1, second digit 3-9 | `13812345678` |
| US | (XXX) XXX-XXXX or XXX-XXX-XXXX | `(123) 456-7890` |
| INTL | + followed by 7-15 digits | `+1234567890` |

## ID Format Support

| Format | Description | Pattern |
|--------|-------------|---------|
| UUID | UUID v4 standard | `550e8400-e29b-41d4-a716-446655440000` |
| MONGO_ID | MongoDB ObjectId | `507f1f77bcf86cd799439011` |
| NUMERIC | Numeric string only | `12345` |
| ALPHANUMERIC | Letters, numbers, underscore, hyphen | `user_123-abc` |
| CUSTOM | Custom regex pattern | Defined by `customPattern` |
