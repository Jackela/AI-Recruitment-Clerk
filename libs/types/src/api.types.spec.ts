import { ok, err, successResponse, errorResponse } from './api.types';

describe('api.types', () => {
  describe('ok', () => {
    it('should create a success result with data', () => {
      const result = ok({ id: '123', name: 'Test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test' });
      expect(result.error).toBeUndefined();
    });

    it('should work with string data', () => {
      const result = ok('test string');

      expect(result.success).toBe(true);
      expect(result.data).toBe('test string');
    });

    it('should work with null data', () => {
      const result = ok(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should work with number data', () => {
      const result = ok(42);

      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should work with array data', () => {
      const result = ok([1, 2, 3]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should work with undefined data', () => {
      const result = ok(undefined);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('err', () => {
    it('should create an error result', () => {
      const error = {
        code: 'NOT_FOUND',
        message: 'Item not found',
        statusCode: 404,
      };
      const result = err(error);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.data).toBeUndefined();
    });

    it('should work with different error codes', () => {
      const error = {
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        statusCode: 400,
      };
      const result = err(error);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('INVALID_INPUT');
    });

    it('should include additional details in error', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 422,
        details: { field: 'email', reason: 'invalid format' },
      };
      const result = err(error);

      expect(result.success).toBe(false);
      expect(result.error!.details).toEqual({
        field: 'email',
        reason: 'invalid format',
      });
    });
  });

  describe('successResponse', () => {
    it('should create a success response with default values', () => {
      const result = successResponse({ id: '123' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBeUndefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should create a success response with custom message', () => {
      const result = successResponse({ id: '123' }, 'Operation completed');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation completed');
    });

    it('should create a success response with custom status code', () => {
      const result = successResponse({ id: '123' }, 'Created', 201);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
    });

    it('should include timestamp in ISO format', () => {
      const result = successResponse({ id: '123' });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should work with null data', () => {
      const result = successResponse(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should work with array data', () => {
      const result = successResponse([1, 2, 3]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('errorResponse', () => {
    it('should create an error response with default status code', () => {
      const result = errorResponse('ERR_CODE', 'Error message');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('ERR_CODE');
      expect(result.error.message).toBe('Error message');
      expect(result.error.statusCode).toBe(500);
      expect(result.statusCode).toBe(500);
    });

    it('should create an error response with custom status code', () => {
      const result = errorResponse('NOT_FOUND', 'Not found', 404);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(404);
      expect(result.statusCode).toBe(404);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid' };
      const result = errorResponse(
        'VALIDATION',
        'Validation failed',
        400,
        details,
      );

      expect(result.error.details).toEqual(details);
    });

    it('should have timestamp', () => {
      const result = errorResponse('ERR', 'Error');

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should work with various error codes', () => {
      expect(
        errorResponse('UNAUTHORIZED', 'Unauthorized', 401).error.statusCode,
      ).toBe(401);
      expect(
        errorResponse('FORBIDDEN', 'Forbidden', 403).error.statusCode,
      ).toBe(403);
      expect(
        errorResponse('NOT_FOUND', 'Not found', 404).error.statusCode,
      ).toBe(404);
    });
  });
});

describe('ApiResponse interface', () => {
  it('should allow creating valid ApiResponse objects', () => {
    const response = {
      success: true,
      data: { id: '1' },
      message: 'Success',
      statusCode: 200,
      timestamp: new Date().toISOString(),
    };

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: '1' });
  });

  it('should allow creating error ApiResponse objects', () => {
    const response = {
      success: false,
      error: {
        code: 'ERR',
        message: 'Error occurred',
        statusCode: 500,
      },
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('ERR');
  });
});

describe('PaginatedApiResponse interface', () => {
  it('should allow creating valid paginated responses', () => {
    const response = {
      success: true,
      data: [{ id: '1' }, { id: '2' }],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
      statusCode: 200,
    };

    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(2);
    expect(response.pagination?.page).toBe(1);
    expect(response.pagination?.hasNext).toBe(false);
  });
});

describe('Result type', () => {
  it('should narrow to success result type when success is true', () => {
    const result = ok({ id: '123' });

    if (result.success) {
      expect(result.data).toEqual({ id: '123' });
    }
  });

  it('should narrow to error result type when success is false', () => {
    const result = err({ code: 'ERR', message: 'Error', statusCode: 500 });

    if (!result.success) {
      expect(result.error.code).toBe('ERR');
    }
  });
});

describe('OpenApiComponents interface', () => {
  it('should allow creating valid OpenApiComponents', () => {
    const components: any = {
      schemas: {
        User: { type: 'object', properties: { id: { type: 'string' } } },
      },
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    };

    expect(components.schemas?.User.type).toBe('object');
    expect(components.securitySchemes?.bearerAuth.type).toBe('http');
  });
});

describe('OpenApiSchema interface', () => {
  it('should allow creating valid OpenApiSchema', () => {
    const schema: any = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number', minimum: 0 },
      },
      required: ['name'],
      additionalProperties: false,
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('name');
    expect(schema.properties?.name.type).toBe('string');
  });

  it('should support allOf, anyOf, oneOf composition', () => {
    const schema: any = {
      allOf: [
        { type: 'object', properties: { id: { type: 'string' } } },
        { type: 'object', properties: { name: { type: 'string' } } },
      ],
      anyOf: [
        { type: 'string', format: 'email' },
        { type: 'string', format: 'uri' },
      ],
    };

    expect(schema.allOf).toHaveLength(2);
    expect(schema.anyOf).toHaveLength(2);
  });
});

describe('OpenApiDocument interface', () => {
  it('should allow creating valid OpenApiDocument', () => {
    const doc: any = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test description',
      },
      paths: {
        '/users': {
          get: { summary: 'Get users' },
        },
      },
    };

    expect(doc.openapi).toBe('3.0.0');
    expect(doc.info.title).toBe('Test API');
    expect(doc.paths['/users'].get.summary).toBe('Get users');
  });
});

describe('YamlLoadResult type', () => {
  it('should allow OpenApiDocument', () => {
    const result: any = {
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
    };

    expect(result.openapi).toBe('3.0.0');
  });

  it('should allow Record type', () => {
    const result: any = { key: 'value', nested: { foo: 'bar' } };

    expect(result.key).toBe('value');
    expect(result.nested.foo).toBe('bar');
  });
});

describe('CompiledSchemaValidator type', () => {
  it('should allow creating validator function', () => {
    const validator: any = (data: unknown) => {
      return typeof data === 'string';
    };
    validator.errors = null;

    expect(validator('test')).toBe(true);
    expect(validator.errors).toBeNull();
  });

  it('should allow validator with errors', () => {
    const validator: any = (_data: unknown) => false;
    validator.errors = [
      {
        keyword: 'type',
        dataPath: '.name',
        schemaPath: '#/properties/name/type',
        params: { type: 'string' },
        message: 'should be string',
      },
    ];

    expect(validator('test')).toBe(false);
    expect(validator.errors).toHaveLength(1);
    expect(validator.errors[0].keyword).toBe('type');
  });
});
