import { TestContext } from "node:test";
import expectProxy from "./expect.js";

type CompatTestContextHookFn = (
  t: ExpectTestContext,
  done: (result?: any) => void,
) => void;

type HookOptions = NonNullable<Parameters<TestContext["before"]>[1]>;
type CompatHook = (fn?: CompatTestContextHookFn, options?: HookOptions) => void;

const HOOKS = ["before", "beforeEach", "after", "afterEach"] as const;
const PASSTHROUGH_PROPS = [
  "signal",
  "name",
  "filePath",
  "fullName",
  "mock",
  "diagnostic",
  "runOnly",
] as const;

export default class ExpectTestContext {
  #baseContext: TestContext;

  declare before: CompatHook;
  declare beforeEach: CompatHook;
  declare after: CompatHook;
  declare afterEach: CompatHook;

  declare signal: TestContext["signal"];
  declare name: TestContext["name"];
  declare filePath: TestContext["filePath"];
  declare fullName: TestContext["fullName"];
  declare mock: TestContext["mock"];
  declare diagnostic: TestContext["diagnostic"];
  declare runOnly: TestContext["runOnly"];

  constructor(baseContext: TestContext) {
    this.#baseContext = baseContext;
    for (const hook of HOOKS) {
      Object.defineProperty(this, hook, {
        value: this.#getHookDefinition(hook),
        enumerable: true,
        writable: false,
      });
    }

    for (const prop of PASSTHROUGH_PROPS) {
      Object.defineProperty(this, prop, {
        get: () => {
          const value = this.#baseContext[prop];
          if (typeof value === "function") {
            return value.bind(this.#baseContext);
          } else {
            return value;
          }
        },
      });
    }
  }

  #getHookDefinition(hook: (typeof HOOKS)[number]) {
    return (fn?: CompatTestContextHookFn, options?: HookOptions) => {
      this.#baseContext[hook](
        // prettier-ignore
        fn
            ? (t, done) => fn(new ExpectTestContext(t), done)
            : undefined,
        options,
      );
    };
  }

  get expect() {
    return expectProxy;
  }

  // We're replacing the native test plan functionality because it requires
  // using the assert instance on the original TestContext, and we're exposing our
  // extended `expect` instead.
  plan(count: number) {
    expectProxy.assertions(count);
  }
}
