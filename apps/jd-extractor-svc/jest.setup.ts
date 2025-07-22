// Patch to ensure instanceof checks pass for mock functions across realms
const original = (expect as any).toBeInstanceOf;
expect.extend({
  toBeInstanceOf(received: any, constructor: any) {
    if (typeof received === 'function' && constructor === Function) {
      return { pass: true, message: () => '' };
    }
    return (original as any).call(this, received, constructor);
  },
});
