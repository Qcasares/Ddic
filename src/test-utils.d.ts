import '@testing-library/jest-dom';
import type { RenderResult } from '@testing-library/react';
import type { MatcherFunction } from 'expect';

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any> {
      (...args: Y): T;
      mock: {
        calls: Y[];
        instances: T[];
        contexts: any[];
        results: { type: 'return' | 'throw'; value: any }[];
        lastCall: Y;
      };
      mockClear(): void;
      mockReset(): void;
      mockRestore(): void;
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockImplementationOnce(fn: (...args: Y) => T): Mock<T, Y>;
      mockName(name: string): Mock<T, Y>;
      mockReturnThis(): Mock<T, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockReturnValueOnce(value: T): Mock<T, Y>;
      mockResolvedValue(value: T): Mock<T, Y>;
      mockResolvedValueOnce(value: T): Mock<T, Y>;
      mockRejectedValue(value: any): Mock<T, Y>;
      mockRejectedValueOnce(value: any): Mock<T, Y>;
    }

    type SpyInstance = Mock;

    interface AsymmetricMatcher {
      $$typeof: symbol;
      sample?: string | RegExp | object | Array<any> | number;
    }

    type Any = AsymmetricMatcher & {
      new (sample: any): any;
      (...args: any[]): any;
    };

    interface Expect {
      (actual: any): jest.Matchers<void, any>;
      any(expectedObject: any): AsymmetricMatcher;
      anything(): AsymmetricMatcher;
      arrayContaining(sample: Array<any>): AsymmetricMatcher;
      objectContaining(sample: object): AsymmetricMatcher;
      stringContaining(expected: string): AsymmetricMatcher;
      stringMatching(expected: string | RegExp): AsymmetricMatcher;
    }

    interface Matchers<R, T = {}> {
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenCalledTimes(times: number): R;
      toHaveBeenLastCalledWith(...args: any[]): R;
      toHaveBeenNthCalledWith(n: number, ...args: any[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(times: number): R;
      toHaveReturnedWith(value: any): R;
      toHaveLastReturnedWith(value: any): R;
      toHaveNthReturnedWith(n: number, value: any): R;
      toHaveLength(length: number): R;
      toHaveProperty(key: string, value?: any): R;
      toBeInstanceOf(class_: any): R;
      toBeDefined(): R;
      toBeFalsy(): R;
      toBeNull(): R;
      toBeTruthy(): R;
      toBeUndefined(): R;
      toBeNaN(): R;
      toBeGreaterThan(number: number): R;
      toBeGreaterThanOrEqual(number: number): R;
      toBeLessThan(number: number): R;
      toBeLessThanOrEqual(number: number): R;
      toEqual(value: any): R;
      toMatch(value: string | RegExp): R;
      toMatchObject(value: Record<string, any>): R;
      toContain(value: any): R;
      toContainEqual(value: any): R;
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveStyle(css: Record<string, any>): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toBeChecked(): R;
      toBe(value: any): R;
      toThrow(error?: string | Error | RegExp): R;
    }
  }

  // Add Jest globals
  const jest: {
    fn: <T = any, Y extends any[] = any>() => jest.Mock<T, Y>;
    spyOn: (object: any, method: string) => jest.SpyInstance;
    mock: (moduleName: string, factory?: () => any) => typeof jest;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
    any: jest.Any;
    requireActual: <T = unknown>(moduleName: string) => T;
    requireMock: <T = unknown>(moduleName: string) => T;
    isolateModules: (fn: () => void) => void;
    mocked: <T>(item: T, deep?: boolean) => jest.Mocked<T>;
    setTimeout: (timeout: number) => void;
  };

  function describe(name: string, fn: () => void): void;
  function describe(name: string, fn: () => void): void;
  function test(name: string, fn: () => void | Promise<void>, timeout?: number): void;
  function it(name: string, fn: () => void | Promise<void>, timeout?: number): void;
  const expect: jest.Expect;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  function beforeAll(fn: () => void | Promise<void>): void;
  function afterAll(fn: () => void | Promise<void>): void;
  function act(callback: () => void | Promise<void>): Promise<void>;

  interface Window {
    ResizeObserver: typeof ResizeObserver;
    IntersectionObserver: typeof IntersectionObserver;
    matchMedia: (query: string) => {
      matches: boolean;
      media: string;
      onchange: null;
      addListener: jest.Mock;
      removeListener: jest.Mock;
      addEventListener: jest.Mock;
      removeEventListener: jest.Mock;
      dispatchEvent: jest.Mock;
    };
  }
}

// Add module augmentation for jest.mock
declare module 'jest' {
  interface JestStatic {
    mock(moduleName: string, factory?: () => unknown, options?: { virtual?: boolean }): typeof jest;
  }
}