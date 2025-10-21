// Patch to ensure instanceof checks pass for mock functions across realms
const originalToBeInstanceOf = (expect as any).getMatchers?.()?.toBeInstanceOf;
expect.extend({
  toBeInstanceOf(received: any, constructor: any) {
    if (typeof received === 'function' && constructor === Function) {
      return { pass: true, message: () => '' };
    }
    if (originalToBeInstanceOf) {
      return originalToBeInstanceOf.call(this, received, constructor);
    }
    // Fallback to basic instanceof check
    const pass = received instanceof constructor;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be an instance of ${constructor.name}`
        : `expected ${received} to be an instance of ${constructor.name}`
    };
  },
});
