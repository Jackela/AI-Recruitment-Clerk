import { ProductionSecurityValidator } from './production-security-validator';

describe('ProductionSecurityValidator', () => {
  let validator: ProductionSecurityValidator;

  beforeEach(() => {
    validator = new ProductionSecurityValidator();
  });

  describe('validate', () => {
    it('should validate production security', () => {
      const result = validator.validate();

      expect(result).toHaveProperty('valid');
    });
  });
});
