import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

const createMotionComponent = (tag: string) =>
  React.forwardRef<HTMLElement, Record<string, unknown>>(function MotionComponent(props, ref) {
    const {
      animate: _animate,
      exit: _exit,
      initial: _initial,
      layout: _layout,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...rest
    } = props;

    const nextProps = { ...rest } as Record<string, unknown>;
    const style = nextProps.style as Record<string, unknown> | undefined;

    if (style) {
      const sanitizedStyle = Object.fromEntries(
        Object.entries(style)
          .filter(([key]) => key !== 'x' && key !== 'y')
          .map(([key, value]) => {
            if (value && typeof value === 'object' && 'get' in (value as Record<string, unknown>)) {
              return [key, (value as { get: () => unknown }).get()];
            }
            return [key, value];
          }),
      );

      nextProps.style = sanitizedStyle;
    }

    return React.createElement(tag, { ...nextProps, ref });
  });

vi.mock('motion/react', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => createMotionComponent(tag),
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useMotionValue: (initial: number) => {
      let current = initial;
      return {
        get: () => current,
        set: (value: number) => {
          current = value;
        },
      };
    },
    animate: () => ({
      stop: () => undefined,
    }),
  };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const localStorageStore = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStorageStore.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageStore.clear();
  }),
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

afterEach(() => {
  cleanup();
});
