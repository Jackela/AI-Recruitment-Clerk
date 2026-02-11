# Configuration Library - Environment Validator

Type-safe environment variable validation with clear error messages.

## Purpose

Prevents silent failures by validating required environment variables on startup. Provides clear error messages listing missing variables and type-safe access functions.

## Usage

### 1. Quick Start (Recommended)

```typescript
import { validateEnv } from '@ai-recruitment-clerk/configuration';

// In your main.ts or bootstrap file
const env = validateEnv('appGateway');

// Type-safe access
const port = env.getNumber('PORT', 3000);
const mongoUrl = env.getString('MONGODB_URL'); // Required, throws if missing
const enableDebug = env.getBoolean('ENABLE_DEBUG', false);
const corsOrigins = env.getArray('CORS_ORIGIN', ['http://localhost:4200']);
```

### 2. Custom Validation Schema

```typescript
import { EnvValidator, createSchema } from '@ai-recruitment-clerk/configuration';

const validator = new EnvValidator(createSchema('my-service', [
  {
    name: 'API_KEY',
    required: true,
    description: 'External service API key',
  },
  {
    name: 'TIMEOUT_MS',
    required: false,
    defaultValue: '5000',
    validator: (v) => !isNaN(Number(v)) && Number(v) > 0,
    errorMessage: 'TIMEOUT_MS must be a positive number',
  },
]));

validator.validate(); // Throws EnvValidationError if validation fails
const env = validator.env;
```

### 3. Service-Specific Validators

```typescript
import { createValidator } from '@ai-recruitment-clerk/configuration';

// Available services: appGateway, resumeParser, jdExtractor, scoringEngine, reportGenerator, frontend
const validator = createValidator('appGateway');
validator.validate();
validator.printSummary(); // Print environment summary for debugging
```

## Required Environment Variables by Service

### app-gateway
- `MONGODB_URL` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `JWT_AUDIENCE` - JWT audience (default: ai-recruitment-clerk)
- `JWT_ISSUER` - JWT issuer (default: ai-recruitment-clerk-auth)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:4200)
- `CORS_ORIGIN` - CORS origins (default: http://localhost:4200)

### resume-parser-svc
- `NATS_URL` - NATS broker URL (default: nats://localhost:4222)
- `GEMINI_API_KEY` - Google Gemini API key for resume parsing

### jd-extractor-svc
- `NATS_URL` - NATS broker URL (default: nats://localhost:4222)
- `GEMINI_API_KEY` - Google Gemini API key for JD extraction

### scoring-engine-svc
- `NATS_URL` - NATS broker URL (default: nats://localhost:4222)

### report-generator-svc
- `NATS_URL` - NATS broker URL (default: nats://localhost:4222)

### ai-recruitment-frontend
- `API_BASE_URL` - Backend API base URL

## Type-Safe Access Methods

| Method | Description | Example |
|--------|-------------|---------|
| `getString(key, required)` | Get string value | `env.getString('API_KEY')` |
| `getNumber(key, default?)` | Get number value | `env.getNumber('PORT', 3000)` |
| `getBoolean(key, default?)` | Get boolean value | `env.getBoolean('DEBUG', false)` |
| `getArray(key, default?)` | Get comma-separated array | `env.getArray('CORS_ORIGINS')` |
| `getUrl(key)` | Get URL object | `env.getUrl('API_URL')` |
| `isSet(key)` | Check if variable is set | `env.isSet('OPTIONAL_VAR')` |

## Error Handling

```typescript
import { EnvValidationError, validateEnv } from '@ai-recruitment-clerk/configuration';

try {
  const env = validateEnv('appGateway');
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error('Missing variables:', error.missingVars);
    console.error('Invalid variables:', error.invalidVars);
    // Error message automatically includes helpful information
  }
}
```

## Best Practices

1. **Validate early**: Call `validateEnv()` at the start of `main.ts` before any other initialization
2. **Use typed access**: Always use `env.getString()`, `env.getNumber()` etc. instead of `process.env` directly
3. **Document required vars**: Add `description` to config objects for clarity
4. **Sensitive values**: The validator automatically masks SECRET, PASSWORD, KEY, TOKEN values in summaries
5. **Optional vars**: Set `required: false` or provide a `defaultValue` for non-critical variables

## Adding New Environment Variables

1. Add to the appropriate service schema in `env-validator.util.ts`
2. Update the CLAUDE.md documentation above
3. Add the variable to `.env.example` in the project root
