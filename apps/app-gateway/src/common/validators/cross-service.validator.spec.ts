import { CrossServiceValidator } from './cross-service.validator';

describe('CrossServiceValidator', () => {
  let validator: CrossServiceValidator;

  beforeEach(() => {
    validator = new CrossServiceValidator({} as any);
  });

  describe('validate', () => {
    it('should validate cross-service call', async () => {
      const result = await validator.validate('service', 'endpoint', {});

      expect(result).toHaveProperty('valid');
    });
  });
});
