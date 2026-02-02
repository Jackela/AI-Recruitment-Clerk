import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Mock window.matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver for responsive tests
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(_callback: ResizeObserverCallback) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public unobserve(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public disconnect(): void {}
};

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
  public root: Element | null = null;
  public rootMargin = '0px';
  public thresholds: ReadonlyArray<number> = [];

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(_callback: IntersectionObserverCallback) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public unobserve(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public disconnect(): void {}
  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock window.showDirectoryPicker for file system access
Object.defineProperty(window, 'showDirectoryPicker', {
  writable: true,
  value: jest
    .fn()
    .mockRejectedValue(
      new DOMException('Not implemented', 'NotSupportedError'),
    ),
});

// Mock window.alert for legacy alert dialogs
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Global Jest/Jasmine compatibility bridge
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = jest.Mock<any, any>;

interface JasmineAndMethods {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returnValue: (value: unknown) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returnValues: (...values: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callFake: (fn: (...args: unknown[]) => unknown) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callThrough: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stub: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throwError: (error: unknown) => any;
}

interface JasmineSpy extends MockFn {
  and: JasmineAndMethods;
}

interface _JasmineInterface {
  createSpyObj: (
    name: string,
    methods: string[],
    props?: Record<string, unknown>,
  ) => Record<string, JasmineSpy>;
  createSpy: (name?: string) => JasmineSpy;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).jasmine = {
  createSpyObj: (
    _name: string,
    methods: string[],
    props?: Record<string, unknown>,
  ) => {
    const spy: Record<string, JasmineSpy> = {};
    methods.forEach((method) => {
      const jestSpy = jest.fn();
      // Add Jasmine-style chaining methods
      const spyWithMethods = jestSpy as unknown as JasmineSpy;
      spyWithMethods.and = {
        returnValue: (value: unknown) => jestSpy.mockReturnValue(value),
        returnValues: (...values: unknown[]) => {
          values.forEach((value) => jestSpy.mockReturnValueOnce(value));
          return jestSpy;
        },
        callFake: (fn: (...args: unknown[]) => unknown) =>
          jestSpy.mockImplementation(fn),
        callThrough: () => jestSpy.mockImplementation(),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        stub: () => jestSpy.mockImplementation(() => {}),
        throwError: (error: Error | unknown) =>
          jestSpy.mockImplementation(() => {
            throw error;
          }),
      };
      spy[method] = spyWithMethods;
    });
    if (props) {
      Object.assign(spy, props);
    }
    return spy;
  },
  createSpy: (_name?: string) => {
    const jestSpy = jest.fn();
    const spyWithMethods = jestSpy as unknown as JasmineSpy;
    spyWithMethods.and = {
      returnValue: (value: unknown) => jestSpy.mockReturnValue(value),
      returnValues: (...values: unknown[]) => {
        values.forEach((value) => jestSpy.mockReturnValueOnce(value));
        return jestSpy;
      },
      callFake: (fn: (...args: unknown[]) => unknown) =>
        jestSpy.mockImplementation(fn),
      callThrough: () => jestSpy.mockImplementation(),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      stub: () => jestSpy.mockImplementation(() => {}),
      throwError: (error: Error | unknown) =>
        jestSpy.mockImplementation(() => {
          throw error;
        }),
    };
    return spyWithMethods;
  },
};

// Global spyOn function for Jasmine compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).spyOn = (object: object, method: string): JasmineSpy => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jestSpy = jest.spyOn(object as any, method as any);
  const spyWithMethods = jestSpy as unknown as JasmineSpy;
  spyWithMethods.and = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    returnValue: (value: unknown) => jestSpy.mockReturnValue(value as any),
    returnValues: (...values: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values.forEach((value) => jestSpy.mockReturnValueOnce(value as any));
      return jestSpy;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callFake: (fn: (...args: any[]) => any) =>
      jestSpy.mockImplementation(fn),
    callThrough: () => jestSpy.mockImplementation(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    stub: () => jestSpy.mockImplementation(() => {}),
    throwError: (error: unknown) =>
      jestSpy.mockImplementation(() => {
        throw error;
      }),
  };
  return spyWithMethods;
};
