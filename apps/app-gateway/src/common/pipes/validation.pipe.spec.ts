import { ValidationPipe } from './validation.pipe';

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  describe('transform', () => {
    it('should transform value', () => {
      const result = pipe.transform({ data: 'test' }, { type: 'body' });

      expect(result).toEqual({ data: 'test' });
    });
  });
});
