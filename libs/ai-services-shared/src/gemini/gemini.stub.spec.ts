import { GeminiClient } from '../gemini/gemini.stub';

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient();
  });

  describe('healthCheck', () => {
    it('should return ok status', async () => {
      const result = await client.healthCheck();

      expect(result).toEqual({ status: 'ok' });
    });

    it('should always return success for test mode', async () => {
      const result = await client.healthCheck();

      expect(result.status).toBe('ok');
      expect(typeof result.status).toBe('string');
    });
  });

  describe('generateStructuredResponse', () => {
    it('should return empty data object', async () => {
      const prompt = 'Test prompt';
      const schema = { type: 'object' };

      const result = await client.generateStructuredResponse(prompt, schema);

      expect(result).toHaveProperty('data');
      expect(typeof result.data).toBe('object');
    });

    it('should handle different prompt types', async () => {
      const prompts = [
        'Simple prompt',
        'Complex prompt with special characters: !@#$%',
        'Multi\nline\nprompt',
        '',
      ];

      for (const prompt of prompts) {
        const result = await client.generateStructuredResponse(prompt, {});
        expect(result).toHaveProperty('data');
      }
    });

    it('should handle different schema types', async () => {
      const schemas = [
        { type: 'object' },
        { type: 'array' },
        { type: 'string' },
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      ];

      for (const schema of schemas) {
        const result = await client.generateStructuredResponse('test', schema);
        expect(result).toHaveProperty('data');
      }
    });

    it('should ignore prompt content in stub mode', async () => {
      const result1 = await client.generateStructuredResponse('prompt 1', {});
      const result2 = await client.generateStructuredResponse('prompt 2', {});

      expect(result1).toEqual(result2);
    });

    it('should return generic typed response', async () => {
      interface TestResponse {
        name: string;
        value: number;
      }

      const result = await client.generateStructuredResponse<TestResponse>(
        'test',
        {},
      );

      expect(result.data).toBeDefined();
    });
  });

  describe('generateStructuredVisionResponse', () => {
    it('should return empty data object', async () => {
      const prompt = 'Analyze this image';
      const buffer = Buffer.from('fake-image-data');
      const mime = 'image/jpeg';
      const schema = { type: 'object' };

      const result = await client.generateStructuredVisionResponse(
        prompt,
        buffer,
        mime,
        schema,
      );

      expect(result).toHaveProperty('data');
      expect(typeof result.data).toBe('object');
    });

    it('should handle different image formats', async () => {
      const imageFormats = [
        { mime: 'image/jpeg', data: 'jpeg-data' },
        { mime: 'image/png', data: 'png-data' },
        { mime: 'image/webp', data: 'webp-data' },
      ];

      for (const format of imageFormats) {
        const buffer = Buffer.from(format.data);
        const result = await client.generateStructuredVisionResponse(
          'test',
          buffer,
          format.mime,
          {},
        );
        expect(result).toHaveProperty('data');
      }
    });

    it('should handle different buffer sizes', async () => {
      const buffers = [
        Buffer.from(''),
        Buffer.from('small'),
        Buffer.alloc(1024 * 1024), // 1MB
      ];

      for (const buffer of buffers) {
        const result = await client.generateStructuredVisionResponse(
          'test',
          buffer,
          'image/jpeg',
          {},
        );
        expect(result).toHaveProperty('data');
      }
    });

    it('should ignore buffer content in stub mode', async () => {
      const buffer1 = Buffer.from('content1');
      const buffer2 = Buffer.from('content2');

      const result1 = await client.generateStructuredVisionResponse(
        'test',
        buffer1,
        'image/jpeg',
        {},
      );
      const result2 = await client.generateStructuredVisionResponse(
        'test',
        buffer2,
        'image/jpeg',
        {},
      );

      expect(result1).toEqual(result2);
    });

    it('should return generic typed response', async () => {
      interface VisionResponse {
        objects: string[];
        confidence: number;
      }

      const buffer = Buffer.from('test-image');
      const result =
        await client.generateStructuredVisionResponse<VisionResponse>(
          'test',
          buffer,
          'image/jpeg',
          {},
        );

      expect(result.data).toBeDefined();
    });
  });

  describe('stub behavior', () => {
    it('should not make actual API calls', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await client.healthCheck();
      await client.generateStructuredResponse('test', {});
      await client.generateStructuredVisionResponse(
        'test',
        Buffer.from('test'),
        'image/jpeg',
        {},
      );

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return consistent responses', async () => {
      const results = await Promise.all([
        client.healthCheck(),
        client.healthCheck(),
        client.healthCheck(),
      ]);

      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    it('should be instant (no delays)', async () => {
      const start = Date.now();
      await client.healthCheck();
      await client.generateStructuredResponse('test', {});
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('error handling', () => {
    it('should not throw errors for valid inputs', async () => {
      await expect(client.healthCheck()).resolves.not.toThrow();
      await expect(
        client.generateStructuredResponse('test', {}),
      ).resolves.not.toThrow();
      await expect(
        client.generateStructuredVisionResponse(
          'test',
          Buffer.from('test'),
          'image/jpeg',
          {},
        ),
      ).resolves.not.toThrow();
    });

    it('should handle undefined schema gracefully', async () => {
      const result = await client.generateStructuredResponse(
        'test',
        undefined as unknown as Record<string, unknown>,
      );

      expect(result).toHaveProperty('data');
    });
  });
});
