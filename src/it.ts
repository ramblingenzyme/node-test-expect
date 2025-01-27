import { it as baseIt, TestContext } from "node:test";
import expect, { TEST_CONTEXT_ALS } from "./expect.js";
import ExpectTestContext from "./ExpectTestContext.js";

export type DoneCallback = (result?: any) => void;
type BaseTestFn = (t: TestContext, done?: DoneCallback) => void | Promise<void>;

export type TestFn = (
  t: ExpectTestContext,
  done: DoneCallback,
) => void | Promise<void>;

export type TestOptions = {
  /**
   * If a number is provided, then that many tests would run in parallel.
   * If truthy, it would run (number of cpu cores - 1) tests in parallel.
   * For subtests, it will be `Infinity` tests in parallel.
   * If falsy, it would only run one test at a time.
   * If unspecified, subtests inherit this value from their parent.
   * @default false
   */
  concurrency?: number | boolean | undefined;
  /**
   * If truthy, and the test context is configured to run `only` tests, then this test will be
   * run. Otherwise, the test is skipped.
   * @default false
   */
  only?: boolean | undefined;
  /**
   * Allows aborting an in-progress test.
   * @since v18.8.0
   */
  signal?: AbortSignal | undefined;
  /**
   * If truthy, the test is skipped. If a string is provided, that string is displayed in the
   * test results as the reason for skipping the test.
   * @default false
   */
  skip?: boolean | string | undefined;
  /**
   * A number of milliseconds the test will fail after. If unspecified, subtests inherit this
   * value from their parent.
   * @default Infinity
   * @since v18.7.0
   */
  timeout?: number | undefined;
  /**
   * If truthy, the test marked as `TODO`. If a string is provided, that string is displayed in
   * the test results as the reason why the test is `TODO`.
   * @default false
   */
  todo?: boolean | string | undefined;
  /**
   * The number of assertions and subtests expected to be run in the test.
   * If the number of assertions run in the test does not match the number
   * specified in the plan, the test will fail.
   * @default undefined
   * @since v22.2.0
   */
  plan?: number | undefined;
};

type ItArgs = [
  string | undefined,
  options: TestOptions | undefined,
  fn: TestFn | undefined,
];

const resolveArgs = (name: any, options: any, fn: any): ItArgs => {
  // Adapted from https://github.com/nodejs/node/blob/869ea331f3a8215229290e2e6038956874c382a6/lib/internal/test_runner/test.js#L717
  if (typeof name === "function") {
    return [undefined, undefined, name];
  } else if (name !== null && typeof name === "object") {
    return [undefined, name, options];
  } else if (typeof options === "function") {
    return [name, undefined, options];
  } else {
    return [name, options, fn];
  }
};

const setupAssertionHook = (t: TestContext) => {
  t.after(() => {
    const assertionError = expect.extractExpectedAssertionsErrors().at(0);
    if (assertionError) {
      throw assertionError.error;
    }
  });
};

const getTestFn = (fn?: TestFn) => {
  if (!fn) {
    return fn;
  } else {
    // This proxy makes a TestFn callable like a BaseTestFn, while preserving the `.length` of the original function.
    // which Node uses internally to optimize not creating & passing the `done` callback when the function doesn't expect it.
    // https://github.com/nodejs/node/blob/afe4bc668d4d400c98c50bbb9369a395bc70fc82/lib/internal/test_runner/test.js#L916
    return new Proxy(fn, {
      apply(target, thisArg, [t, done]: Parameters<BaseTestFn>) {
        setupAssertionHook(t);

        return TEST_CONTEXT_ALS.run(t, () =>
          Reflect.apply(target, thisArg, [new ExpectTestContext(t), done]),
        );
      },
    }) as unknown as BaseTestFn;
  }
};

class ParentError extends Error {
  /**
   * @param message Error message
   * @param fromFn A function to exclude from the stack trace. Should be the function creating the ParentError.
   */
  constructor(message: string, fromFn: Function) {
    super(message);

    Error.captureStackTrace(this, fromFn);
  }
}

function it(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
// @ts-expect-error TODO: Futzing with the implementation args until all overloads are happy
function it(name?: string, fn?: TestFn): Promise<void>;
function it(options?: TestOptions, fn?: TestFn): Promise<void>;
function it(fn?: TestFn): Promise<void>;
function it(
  ...args: [
    string | TestOptions | TestFn | undefined,
    TestOptions | TestFn | undefined,
    TestFn | undefined,
  ]
) {
  if (TEST_CONTEXT_ALS.getStore()) {
    throw new ParentError(
      "Nested tests aren't allowed. Use `describe` for nesting.",
      it,
    );
  }

  const [name, options, fn] = resolveArgs(...args);
  return baseIt(name, options, getTestFn(fn));
}

["skip", "todo", "only"].forEach((keyword) => {
  it[keyword] = (...args: [any, any, any]) => {
    const [name, options = {}, fn] = resolveArgs(...args);
    options[keyword] = true;

    return baseIt(name, options, getTestFn(fn));
  };
});

export default it;
