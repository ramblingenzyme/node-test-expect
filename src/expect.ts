import { expect } from "expect";
import { Mock, TestContext } from "node:test";

import { AsyncLocalStorage } from "node:async_hooks";
import { AssertionError } from "node:assert";

export const TEST_CONTEXT_ALS = new AsyncLocalStorage<TestContext>();

type AssertSnapshotOptions = NonNullable<
  Parameters<TestContext["assert"]["snapshot"]>[1]
>;

function isNodeMock(received: any) {
  return (
    typeof received === "function" &&
    "calls" in (received.mock || {}) &&
    typeof received.mock.callCount === "function"
  );
}

const toJestCompatibleMock = (mockFn: Mock<Function>): any => {
  // Internally this creates a copy, so lets only copy it once.
  const calls = mockFn.mock.calls;

  return {
    _isMockFunction: true,
    calls: calls.map((c) => c.arguments),
    results: calls.map((c) => ({
      type: c.error ? "throw" : "return",
      value: c.error || c.result,
    })),
    contexts: calls.map((c) => c.this),
    lastCall: calls.at(-1),
  };
};

expect.extend({
  toMatchSnapshot(received, options) {
    const testContext = TEST_CONTEXT_ALS.getStore();
    if (!testContext) {
      return {
        message: () =>
          "Could not access the Node test runner's TestContext for this test. Ensure you're using the test definition functions.",
        pass: false,
      };
    }

    try {
      testContext.assert.snapshot(received, options);
      return {
        pass: true,
        message: () =>
          new AssertionError({
            operator: "strictEqual",
            actual: received,
            expected: "<unknown>",
            stackStartFn: testContext.assert.strictEqual,
          }).message,
      };
    } catch (e: any) {
      return {
        pass: false,
        message: e?.message || e,
      };
    }
  },
});

const expectProxy = new Proxy(expect, {
  apply(target, thisArg, [actual]) {
    if (isNodeMock(actual)) {
      return target.call(thisArg, toJestCompatibleMock(actual));
    } else {
      return target.call(thisArg, actual);
    }
  },
});

export default expectProxy;

declare module "expect" {
  interface CompatMatchers<R extends void | Promise<void>> extends Matchers<R> {
    toMatchSnapshot(options?: AssertSnapshotOptions): R;
  }
}
