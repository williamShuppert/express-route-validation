# express-route-validation

![npm version](https://img.shields.io/npm/v/express-route-validation)
![coverage](https://img.shields.io/badge/coverage-100%25-44cc11?style=flat)

Express middleware for request and response validation.

- 🔒 Request validation
- ✨ Response validation
- 💪 100% test coverage
- 📦 Zero dependencies (except peer dependencies)
- 🔥 TypeScript support

Ensure your Express routes are always receiving and returning the correct data with this express validation middleware. Seamlessly validate request and response objects, catching any instances where your route is returning unwanted data. Effortlessly handle bad request responses and integrate with popular validation libraries like Zod or Joi.

## Installation

```bash
npm install express-route-validation
```

## Usage

### Configure Validator

```typescript
import { config } from 'express-validator';
import { z } from 'zod';
import Joi from 'joi';

// Configure with Zod validator
config({ 
  // Initial setup of a validator is required
  validator: (data, schema: z.ZodSchema) => schema.safeParse(data),
  badRequestHandler: (err: ZodError, req, res) => res.status(400).json({ errors: err.errors })
});

// Configure with Joi validator
config({
  // Initial setup of a validator is required
  validator: (data, schema: Joi.ObjectSchema) => {
    const result = schema.validate(data);
    return result.error
      ? { success: false, error: result.error }
      : { success: true, data: result.value };
  },
  // Same as default bad request handler
  badRequestHandler: (err, req, res) => res.status(400).json({ message: "Bad Request" })
});
```

### Request Validation

Validate query parameters, body, and headers using schemas (Zod used in example):

```typescript
import express from 'express';
import { validateRequest } from 'express-zod-validation';
import { z } from 'zod';

const app = express();
app.use(express.json());

app.post(
  '/user',
  validateRequest(
    z.object({
      body: z.object({
        name: z.string().min(2),
        age: z.number().min(18),
      }),
      query: z.object({
        adminKey: z.string(),
      }),
      headers: z.object({
        'x-api-key': z.string(),
      }),
    }),
  ),
  validateResponse({
    200: z.object({ success: z.literal(true) })
  }),
  (req, res) => {
    // All validations passed, req has all valid values as above
    res.json({ success: true });
  },
);
```

### Response Validation

Ensure your API responses match the expected schema:

```typescript
import { validateResponse } from 'express-zod-validation';

app.get(
  '/user/:id',
  validateResponse({
    200: z.object({ 
      id: z.number(),
      name: z.string(),
    }),
    404: z.object({ 
      error: z.literal('User not found'),
    }),
  }),
  (req, res) => {
    // res.json({ message: 'this does not match schema' }); // Would throw an error
    // res.status(201).json({ message: 'this has no schema' }) // Would throw an error

    // Response will be validated against the appropriate schema
    if (userExists)
      res.json({ id: 1, name: 'John' });
    else
      res.status(404).json({ error: 'User not found' });
  },
);
```

## Testing

This project maintains 100% test coverage. To run tests:

```bash
npm run test          # Run tests
npm run test:coverage  # Run tests with coverage report
```
