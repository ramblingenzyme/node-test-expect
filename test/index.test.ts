import { describe, it, expect, mock } from "../dist/index.js";

describe("test suite", () => {
  it("works with the basic case", () => {
    expect(1).toBe(1);
  });

  describe("assertion assertions", () => {
    it("should pass when using t.plan", (t) => {
      t.plan(2);
      t.expect(1).toBe(1);
      expect(1).toBe(1);
    });

    it("should pass when using expect.assertions", (t) => {
      expect.assertions(2);
      t.expect(1).toBe(1);
      expect(1).toBe(1);
    });

    it("should pass when using context expect.hasAssertions", (t) => {
      // Throws an error without any expects
      t.expect.hasAssertions();
      expect(t.expect.extractExpectedAssertionsErrors()).toHaveLength(1);

      // Global expect
      t.expect.hasAssertions();
      expect(1).toBe(1);
      expect(t.expect.extractExpectedAssertionsErrors()).toHaveLength(0);

      // Context expect
      t.expect.hasAssertions();
      t.expect(1).toBe(1);
      expect(t.expect.extractExpectedAssertionsErrors()).toHaveLength(0);
    });

    it("should pass when using global expect.hasAssertions", (t) => {
      // Throws an error without any expects
      expect.hasAssertions();
      expect(t.expect.extractExpectedAssertionsErrors()).toHaveLength(1);

      expect.hasAssertions();
      t.expect(1).toBe(1);
      expect(t.expect.extractExpectedAssertionsErrors()).toHaveLength(0);

      expect.hasAssertions();
      expect(1).toBe(1);
      expect(t.expect.extractExpectedAssertionsErrors()).toHaveLength(0);
    });
  });

  it("should not allow nested tests", async (t) => {
    t.before(() => {
      t.diagnostic("Nested before 1");
    });

    expect(() => {
      it("is defining a nested test!", (t) => {
        expect(1).toBe(1);
      });
    }).toThrow("Nested tests aren't allowed");
  });

  it("should do snapshot testing", () => {
    expect({ a: "test" }).toMatchSnapshot();
  });

  it("should be compatible with native mocking", () => {
    const mockFn = mock.fn();
    mockFn("first call");
    mockFn("second call");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith("first call");
    expect(mockFn).toHaveBeenLastCalledWith("second call");
    expect(mockFn).toHaveBeenNthCalledWith(1, "first call");
    expect(mockFn).toHaveBeenNthCalledWith(2, "second call");

    expect(mockFn).toHaveReturned();
    expect(mockFn).toHaveReturnedTimes(2);
    expect(mockFn).toHaveReturnedWith(undefined);
    expect(mockFn).toHaveLastReturnedWith(undefined);
    expect(mockFn).toHaveNthReturnedWith(1, undefined);
    expect(mockFn).toHaveNthReturnedWith(2, undefined);
  });
});
