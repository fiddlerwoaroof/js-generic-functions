import * as uut from "./genfuns";
import { fail } from "assert";

describe("matches_specializer", () => {
  test("works in expected cases", () => {
    function AThing() {}
    const an_instance = new AThing();

    expect(uut.matches_specializer(an_instance, AThing)).toBeTruthy();
    expect(uut.matches_specializer(an_instance, String)).toBeFalsy();
    expect(uut.matches_specializer(an_instance, Object)).toBeTruthy();

    expect(uut.matches_specializer([], Array)).toBeTruthy();
    expect(uut.matches_specializer([], Object)).toBeTruthy();
    expect(uut.matches_specializer([], Number)).toBeFalsy();

    function Foo() {}
    Foo.prototype = Object.create(null);
    const inst = new Foo();
    expect(uut.matches_specializer(inst, Foo)).toBeTruthy();
    expect(uut.matches_specializer(inst, Object)).toBeFalsy();

    expect(uut.matches_specializer({ a: 1 }, uut.Shape("a"))).toBeTruthy();
    expect(
      uut.matches_specializer({ a: 1, b: 2 }, uut.Shape("a"))
    ).toBeTruthy();
    expect(uut.matches_specializer({ b: 2 }, uut.Shape("a"))).toBeFalsy();

    expect(
      uut.matches_specializer({ a: 1, b: 2, c: 3 }, uut.Shape("a", "b", "c"))
    ).toBeTruthy();
    expect(
      uut.matches_specializer(
        { a: 1, b: 2, c: 3, d: 4 },
        uut.Shape("a", "b", "c")
      )
    ).toBeTruthy();
    expect(
      uut.matches_specializer({ a: 1, c: 3 }, uut.Shape("a", "b", "c"))
    ).toBeFalsy();
    expect(
      uut.matches_specializer({ c: 3 }, uut.Shape("a", "b", "c"))
    ).toBeFalsy();
    expect(
      uut.matches_specializer({ d: 3 }, uut.Shape("a", "b", "c"))
    ).toBeFalsy();
  });

  describe("primitives", () => {
    test("null behavior", () => {
      expect(uut.matches_specializer(null, null)).toBeTruthy();
      expect(uut.matches_specializer(null, Number)).toBeFalsy();
      expect(uut.matches_specializer(null, String)).toBeFalsy();
      expect(uut.matches_specializer(null, Object)).toBeTruthy();
    });

    test("undefined (the value) behavior", () => {
      expect(uut.matches_specializer(undefined, undefined)).toBeTruthy();
      expect(uut.matches_specializer(undefined, Number)).toBeFalsy();
      expect(uut.matches_specializer(undefined, String)).toBeFalsy();
      expect(uut.matches_specializer(undefined, Object)).toBeTruthy();
    });

    test.each([true, false])("booleans -> %s", bool => {
      expect(bool).not.toBe(Object(bool));
      expect(uut.matches_specializer(new Boolean(bool), Boolean)).toBeTruthy();
      expect(uut.matches_specializer(bool, Boolean)).toBeTruthy();
      expect(uut.matches_specializer(bool, Object)).toBeTruthy();
    });

    test("works for numbers", () => {
      expect(1).not.toBe(Object(1));
      expect(uut.matches_specializer(new Number(1), Number)).toBeTruthy();
      expect(uut.matches_specializer(new Number(1), Object)).toBeTruthy();
      expect(uut.matches_specializer(new Number(1), String)).toBeFalsy();

      expect(uut.matches_specializer(1, Number)).toBeTruthy();
      expect(uut.matches_specializer(1, Object)).toBeTruthy();
      expect(uut.matches_specializer(1, String)).toBeFalsy();
    });

    test("handles strings", () => {
      expect("asdf").not.toBe(Object("asdf"));

      expect(
        uut.matches_specializer(new String("foobar"), String)
      ).toBeTruthy();
      expect(
        uut.matches_specializer(new String("foobar"), Object)
      ).toBeTruthy();

      expect(uut.matches_specializer("1", String)).toBeTruthy();
      expect(uut.matches_specializer("1", Object)).toBeTruthy();
      expect(uut.matches_specializer("1", Number)).toBeFalsy();
    });

    test("handles symbols", () => {
      const symbolPrim = Symbol("primitive");
      const boxedSymbol = Object(symbolPrim);
      expect(symbolPrim).not.toBe(boxedSymbol);

      expect(uut.matches_specializer(boxedSymbol, Symbol)).toBeTruthy();
      expect(uut.matches_specializer(boxedSymbol, Object)).toBeTruthy();

      expect(uut.matches_specializer(symbolPrim, Symbol)).toBeTruthy();
      expect(uut.matches_specializer(symbolPrim, Object)).toBeTruthy();
    });

    test("handles BigInt", () => {
      expect(BigInt(4)).not.toBe(Object(BigInt(4)));

      expect(uut.matches_specializer(Object(BigInt(4)), BigInt)).toBeTruthy();
      expect(uut.matches_specializer(Object(BigInt(4)), Object)).toBeTruthy();

      expect(uut.matches_specializer(BigInt(4), BigInt)).toBeTruthy();
      expect(uut.matches_specializer(BigInt(4), Object)).toBeTruthy();
    });
  });

  test("works with custom specializers", () => {
    const AEql = makeCustomSpecializer();
    expect(uut.matches_specializer("foo", new AEql("foo"))).toBeTruthy();
  });
});

describe("defgeneric", () => {
  test("methods get called appropriately", () => {
    expect(
      uut
        .defgeneric("testing1", "a", "b")
        .primary([Object, Object], (_, __) => 1)
        .fn(1, 2)
    ).toEqual(1);

    expect(() => {
      uut
        .defgeneric("foobar", "a")
        .primary([String], function (a) {})
        .fn({});
    }).toThrow(uut.NoApplicableMethodError);

    expect(
      uut
        .defgeneric("testing1", "a", "b")
        .primary([Number, Number], (_, __) => 1)
        .fn(1, 2)
    ).toEqual(1);

    expect(
      uut
        .defgeneric("testing1", "a", "b")
        .primary([Number, Number], (_, __) => 2)
        .primary([String, String], (_, __) => 1)
        .fn("1", "2")
    ).toEqual(1);

    let firstCounts = 0;
    expect(
      uut
        .defgeneric("testing1", "a", "b")
        .primary([Number, Number], (_, __) => (firstCounts += 1))
        .primary([String, String], (_, __) => (firstCounts += 1))
        .fn("1", "2")
    ).toEqual(1);
    expect(firstCounts).toEqual(1);

    let secondCounts = 0;
    expect(
      uut
        .defgeneric("testing1", "a", "b")
        .primary([Object, Object], (_, __) => (secondCounts += 1))
        .primary([String, String], (_, __) => (secondCounts += 1))
        .fn("1", "2")
    ).toEqual(1);
    expect(secondCounts).toEqual(1);

    let thirdCounts = 0;
    expect(
      uut
        .defgeneric("testing1", "a", "b")
        .before([Object, Object], (_, __) => (thirdCounts += 1))
        .primary([String, String], (_, __) => "hi")
        .after([Object, String], (_, __) => (thirdCounts += 1))
        .fn("1", "2")
    ).toEqual("hi");
    expect(thirdCounts).toEqual(2);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Object], function (a) {
          return 1;
        })
        .primary([String], function (a) {
          return 2;
        })
        .fn("foobar")
    ).toEqual(2);
  });

  test("works with custom specializers", () => {
    const AEql = makeCustomSpecializer();

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([new AEql("foo")], function (a) {
          return 3;
        })
        .fn("foo")
    ).toEqual(3);

    expect(new AEql("foo").super_of(String)).toBeFalsy();
    expect(new AEql("foo").super_of(Object)).toBeFalsy();

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Object], function (a) {
          return 1;
        })
        .primary([String], function (a) {
          return 2;
        })
        .primary([new AEql("foo")], function (a) {
          return 3;
        })
        .fn("foobar")
    ).toEqual(2);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Object], function (a) {
          return 1;
        })
        .primary([String], function (a) {
          return 2;
        })
        .primary([new AEql("foo")], function (a) {
          return 3;
        })
        .fn("foo")
    ).toEqual(3);
  });

  test("next-method-p works", () => {
    expect.assertions(3);

    uut
      .defgeneric("foobar", "a")
      .primary([Object], function (a) {
        expect(this.next_method_p).toBe(false);
      })
      .fn({});

    uut
      .defgeneric("foobar", "a")
      .primary([Object], function (a) {
        expect(this.next_method_p).toBe(false);
      })
      .primary([String], function (a) {
        expect(this.next_method_p).toBe(true);
      })
      .fn("foobar");

    uut
      .defgeneric("foobar", "a")
      .primary([Object], function (a) {
        expect(this.next_method_p).toBe(false);
      })
      .primary([String], function (a) {
        expect(this.next_method_p).toBe(true);
      })
      .fn(1);
  });

  test("call-next-method works", () => {
    expect(() => {
      uut
        .defgeneric("foobar", "a")
        .primary([Object], function (a) {
          this.call_next_method();
        })
        .primary([String], function (a) {
          return 1;
        })
        .fn({});
    }).toThrow(uut.NoNextMethodError);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Object], function (a) {
          return 1;
        })
        .primary([String], function (a) {
          return this.call_next_method();
        })
        .fn("foobar")
    ).toEqual(1);

    expect(
      uut
        .defgeneric("foobar", "a", "b")
        .primary([String, String], function (a, b) {
          return `1${this.call_next_method()}`;
        })
        .primary([Object, String], function (a, b) {
          return `3${this.call_next_method()}`;
        })
        .primary([String, Object], function (a, b) {
          return `2${this.call_next_method()}`;
        })
        .primary([Object, Object], function (a, b) {
          return `4`;
        })
        .fn("a", "b")
    ).toEqual("1234");

    try {
      uut
        .defgeneric("foobar", "a")
        .primary([Object], function (a) {
          this.call_next_method();
        })
        .fn({});
      fail();
    } catch (err) {
      expect(err).toBeInstanceOf(uut.NoNextMethodError);
    }
  });

  test("bugfix: behavior of null in method", () => {
    const expectedResult = Symbol(4);
    expect(() => {
      uut
        .defgeneric("foobar", "a", "b")
        .primary([Object, Object], () => expectedResult)
        .fn(null, null);
    }).not.toThrow();
    expect(
      uut
        .defgeneric("foobar", "a", "b")
        .primary([Object, Object], () => expectedResult)
        .fn(null, null)
    ).toBe(expectedResult);
  });
});

describe("custom specializers", () => {
  test("Shape works", () => {
    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape("a", "b")], ({ a, b }) => a + b)
        .primary([Object], _ => null)
        .fn({ a: 1, b: 2 })
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape("a", "b")], ({ a, b }) => a + b)
        .primary([Object], _ => null)
        .fn({ a: 1, b: 2, c: 3 })
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape("a", "b")], ({ a, b }) => a + b)
        .primary([Object], _ => null)
        .fn({ a: 1 })
    ).toEqual(null);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape(["a", 1], "b")], ({ a, b }) => a + b)
        .primary([Object], _ => null)
        .fn({ a: 1, b: 3 })
    ).toEqual(4);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape(["a", null], "b")], ({ a, b }) => b)
        .primary([Object], _ => null)
        .fn({ a: null, b: 3 })
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape(["a", undefined], "b")], ({ a, b }) => b)
        .primary([Object], _ => null)
        .fn({ b: 5 })
    ).toEqual(null); //undefined is not a permissible default: treated as if the key is missing

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape(["a", 1], "b")], ({ a, b }) => a + b)
        .primary([Object], _ => null)
        .fn({ a: 2, b: 3 })
    ).toEqual(null);
  });

  test("Shape, prototype precedence", () => {
    expect(
      uut
        .defgeneric("foobar4", "a")
        .primary([uut.Shape("a")], ({ a }) => a)
        .primary([uut.Shape("a", "b")], ({ a, b }) => {
          return a + b;
        })
        .primary([Object], _ => null)
        .fn({ a: 1, b: 3 })
    ).toEqual(4);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape("a", "b")], ({ a, b }) => a + b)
        .primary([uut.Shape("b")], ({ b }) => b)
        .primary([Object], _ => null)
        .fn({ a: 1, b: 2 })
    ).toEqual(3);

    const Foo = function () {};
    Foo.prototype = { a: true, b: null };
    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([uut.Shape("a")], function ({ a }) {
          return `a${this.call_next_method()}`;
        })
        .primary([uut.Shape("a", "b", "c")], function ({ a, b, c }) {
          return `c${this.call_next_method()}`;
        })
        .primary([uut.Shape("a", "b")], function ({ a, b }) {
          return `b${this.call_next_method()}`;
        })
        .primary([Object], _ => "d")
        .fn(Object.assign(new Foo(), { c: 3 }))
    ).toEqual("cbad");
  });
});

describe("Eql", () => {
  test("basic stuff works", () => {
    expect(uut.matches_specializer("foo", uut.Eql("foo"))).toBeTruthy();

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([new uut.Eql("foo")], function (a) {
          return 3;
        })
        .fn("foo")
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([new uut.Eql(5)], function (a) {
          return 3;
        })
        .fn(5)
    ).toEqual(3);
  });
  test("inheritance works", () => {
    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Symbol], function () {
          return 2;
        })
        .primary([uut.Eql(Symbol.iterator)], function () {
          return 3;
        })
        .fn(Symbol.iterator)
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Boolean], function (a) {
          return 2;
        })
        .primary([new uut.Eql(false)], function (a) {
          return 3;
        })
        .fn(false)
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Boolean], function (a) {
          return 2;
        })
        .primary([new uut.Eql(true)], function (a) {
          return 3;
        })
        .fn(true)
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([String], function (a) {
          return 2;
        })
        .primary([new uut.Eql("5")], function (a) {
          return 3;
        })
        .fn("5")
    ).toEqual(3);

    expect(
      uut
        .defgeneric("foobar", "a")
        .primary([Number], function (a) {
          return 2;
        })
        .primary([new uut.Eql(5)], function (a) {
          return 3;
        })
        .fn(5)
    ).toEqual(3);
  });
});

describe("Shape", () => {
  test("super_of", () => {
    expect(uut.Shape().super_of(uut.Shape("a", "b", "c"))).toBeTruthy();
    expect(uut.Shape("a").super_of(uut.Shape("a", "b"))).toBeTruthy();
    expect(uut.Shape("a", "b").super_of(uut.Shape("a", "b", "c"))).toBeTruthy();
    expect(uut.Shape("a", "b").super_of(uut.Shape("a", "b", 3))).toBeTruthy();
    expect(uut.Shape("a", "b").super_of(uut.Shape("a", "b"))).toBeFalsy();
    expect(uut.Shape("a", "b").super_of(uut.Shape("a"))).toBeFalsy();
  });
});

describe("dispatch cache", () => {
  test("repeated same-type calls return correct results", () => {
    const gf = uut.defgeneric("cached1", "a");
    gf.primary([Number], a => "number");
    gf.primary([String], a => "string");
    const fn = gf.fn;

    expect(fn(1)).toEqual("number");
    expect(fn(2)).toEqual("number");
    expect(fn("a")).toEqual("string");
    expect(fn("b")).toEqual("string");
    // These should hit the cache
    expect(fn(3)).toEqual("number");
    expect(fn("c")).toEqual("string");
  });

  test("cache invalidation on method addition", () => {
    const gf = uut.defgeneric("cached2", "a");
    gf.primary([Object], a => "object");
    const fn = gf.fn;

    expect(fn(1)).toEqual("object");

    gf.primary([Number], a => "number");
    expect(fn(1)).toEqual("number");
  });

  test("clearDispatchCache works", () => {
    const gf = uut.defgeneric("cached3", "a");
    gf.primary([Number], a => "number");
    const fn = gf.fn;

    expect(fn(1)).toEqual("number");
    gf.clearDispatchCache();
    expect(fn(1)).toEqual("number");
  });

  test("Eql specializer caching", () => {
    const gf = uut.defgeneric("cached4", "a");
    gf.primary([uut.Eql(42)], a => "forty-two");
    gf.primary([uut.Eql(99)], a => "ninety-nine");
    const fn = gf.fn;

    expect(fn(42)).toEqual("forty-two");
    expect(fn(99)).toEqual("ninety-nine");
    expect(fn(42)).toEqual("forty-two");
  });

  test("Shape specializer caching (no value constraints)", () => {
    const gf = uut.defgeneric("cached5", "a");
    gf.primary([uut.Shape("x", "y")], ({ x, y }) => `${x}:${y}`);
    gf.primary([uut.Shape("x")], ({ x }) => x);
    gf.primary([Object], _ => "other");
    const fn = gf.fn;

    expect(fn({ x: "Alice", y: 30 })).toEqual("Alice:30");
    expect(fn({ x: "Bob" })).toEqual("Bob");
    expect(fn(42)).toEqual("other");
    // cache hits
    expect(fn({ x: "Carol", y: 25 })).toEqual("Carol:25");
    expect(fn({ x: "Dave" })).toEqual("Dave");
  });

  test("value-constrained Shape degrades gracefully", () => {
    const gf = uut.defgeneric("cached6", "a");
    gf.primary([uut.Shape(["a", 1], "b")], ({ a, b }) => a + b);
    gf.primary([Object], _ => null);
    const fn = gf.fn;

    expect(fn({ a: 1, b: 3 })).toEqual(4);
    expect(fn({ a: 2, b: 3 })).toEqual(null);
  });

  test("custom Specializer without cacheKey override degrades gracefully", () => {
    function NoCacheSpec(val) {
      this.val = val;
    }
    NoCacheSpec.prototype = Object.assign(new uut.Specializer(), {
      matches(other) {
        return this.val === other;
      },
      super_of() {
        return false;
      },
    });

    const gf = uut.defgeneric("cached7", "a");
    gf.primary([new NoCacheSpec("x")], a => "matched");
    gf.primary([Object], a => "fallback");
    const fn = gf.fn;

    expect(fn("x")).toEqual("matched");
    expect(fn("y")).toEqual("fallback");
    expect(fn("x")).toEqual("matched");
  });

  test("EMF Tier 1: single primary, cache hit", () => {
    const gf = uut.defgeneric("emf_t1", "a");
    gf.primary([Number], a => a * 2);
    const fn = gf.fn;

    expect(fn(5)).toEqual(10);
    // Second call hits cache (EMF)
    expect(fn(7)).toEqual(14);
    // call_next_method should throw on leaf
    const gf2 = uut.defgeneric("emf_t1b", "a");
    gf2.primary([Number], function (a) {
      return this.call_next_method();
    });
    const fn2 = gf2.fn;
    // First call (cache miss) throws
    expect(() => fn2(1)).toThrow(uut.NoNextMethodError);
    // Second call (cache hit) also throws
    expect(() => fn2(2)).toThrow(uut.NoNextMethodError);
  });

  test("EMF Tier 2: multi-primary chain with call_next_method", () => {
    const gf = uut.defgeneric("emf_t2", "a", "b");
    gf.primary([String, String], function (a, b) {
      return `1${this.call_next_method()}`;
    });
    gf.primary([String, Object], function (a, b) {
      return `2${this.call_next_method()}`;
    });
    gf.primary([Object, String], function (a, b) {
      return `3${this.call_next_method()}`;
    });
    gf.primary([Object, Object], function (a, b) {
      return `4`;
    });
    const fn = gf.fn;

    // First call (cache miss)
    expect(fn("a", "b")).toEqual("1234");
    // Second call (cache hit — EMF)
    expect(fn("c", "d")).toEqual("1234");
  });

  test("EMF Tier 2: call_next_method with args", () => {
    const gf = uut.defgeneric("emf_t2_args", "a");
    gf.primary([Object], function (a) {
      return `base:${a}`;
    });
    gf.primary([String], function (a) {
      return this.call_next_method("override");
    });
    const fn = gf.fn;

    expect(fn("hello")).toEqual("base:override");
    // Cache hit
    expect(fn("world")).toEqual("base:override");
  });

  test("EMF Tier 3: befores + afters + primary", () => {
    const log = [];
    const gf = uut.defgeneric("emf_t3", "a");
    gf.before([Object], a => log.push("before"));
    gf.primary([Object], a => {
      log.push("primary");
      return "result";
    });
    gf.after([Object], a => log.push("after"));
    const fn = gf.fn;

    expect(fn(1)).toEqual("result");
    expect(log).toEqual(["before", "primary", "after"]);

    log.length = 0;
    // Cache hit
    expect(fn(2)).toEqual("result");
    expect(log).toEqual(["before", "primary", "after"]);
  });

  test("EMF Tier 4: around with call_next_method", () => {
    const log = [];
    const gf = uut.defgeneric("emf_t4", "a");
    gf.around([Object], function (a) {
      log.push("around");
      return this.call_next_method(a);
    });
    gf.primary([Object], a => {
      log.push("primary");
      return "done";
    });
    const fn = gf.fn;

    expect(fn(1)).toEqual("done");
    expect(log).toEqual(["around", "primary"]);

    log.length = 0;
    // Cache hit
    expect(fn(2)).toEqual("done");
    expect(log).toEqual(["around", "primary"]);
  });

  test("EMF Tier 4: multiple arounds chain correctly", () => {
    const log = [];
    const gf = uut.defgeneric("emf_t4_multi", "a");
    gf.around([Object], function (a) {
      log.push(`outer:${a}`);
      return this.call_next_method(a);
    });
    gf.around([Number], function (a) {
      log.push(`inner:${a}`);
      return this.call_next_method(a);
    });
    gf.primary([Number], a => {
      log.push(`primary:${a}`);
      return a * 2;
    });
    const fn = gf.fn;

    expect(fn(5)).toEqual(10);
    expect(log).toEqual(["inner:5", "outer:5", "primary:5"]);

    log.length = 0;
    expect(fn(7)).toEqual(14);
    expect(log).toEqual(["inner:7", "outer:7", "primary:7"]);
  });

  test("EMF Tier 4: around with befores and afters", () => {
    const log = [];
    const gf = uut.defgeneric("emf_t4_combo", "a");
    gf.before([Object], a => log.push("before"));
    gf.around([Object], function (a) {
      log.push("around");
      return this.call_next_method(a);
    });
    gf.primary([Object], a => {
      log.push("primary");
      return "ok";
    });
    gf.after([Object], a => log.push("after"));
    const fn = gf.fn;

    expect(fn(1)).toEqual("ok");
    expect(log).toEqual(["around", "before", "primary", "after"]);

    log.length = 0;
    expect(fn(2)).toEqual("ok");
    expect(log).toEqual(["around", "before", "primary", "after"]);
  });

  test("EMF reentrancy: recursive GF calls", () => {
    const gf = uut.defgeneric("emf_reentrant", "a");
    gf.primary([Number], function (a) {
      if (a <= 0) return 0;
      return a + gf.fn(a - 1);
    });
    gf.primary([String], function (a) {
      return a.length;
    });
    const fn = gf.fn;

    // Recursive numeric calls
    expect(fn(3)).toEqual(6); // 3 + 2 + 1 + 0
    expect(fn(3)).toEqual(6); // cache hit path

    // Different type still works
    expect(fn("hello")).toEqual(5);
  });

  test("value-constrained Shape caching", () => {
    const gf = uut.defgeneric("vc_shape", "token");
    gf.primary([uut.Shape(["type", "heading"])], t => "heading");
    gf.primary([uut.Shape(["type", "paragraph"])], t => "paragraph");
    gf.primary([Object], t => "other");
    const fn = gf.fn;

    expect(fn({ type: "heading" })).toEqual("heading");
    expect(fn({ type: "paragraph" })).toEqual("paragraph");
    expect(fn({ type: "code" })).toEqual("other");
    // Cache hits
    expect(fn({ type: "heading" })).toEqual("heading");
    expect(fn({ type: "paragraph" })).toEqual("paragraph");
    expect(fn({ type: "code" })).toEqual("other");
  });

  test("value-constrained Shape with non-object args", () => {
    const gf = uut.defgeneric("vc_shape_mixed", "token");
    gf.primary([uut.Shape(["type", "heading"])], t => "heading");
    gf.primary([Object], t => "other");
    const fn = gf.fn;

    expect(fn({ type: "heading" })).toEqual("heading");
    expect(fn(42)).toEqual("other");
    // Cache hits
    expect(fn({ type: "heading" })).toEqual("heading");
    expect(fn(42)).toEqual("other");
  });

  test("mixed structural + value-constrained Shape degrades gracefully", () => {
    const gf = uut.defgeneric("mixed_shape", "a");
    gf.primary(
      [uut.Shape(["type", "heading"], "content")],
      ({ content }) => content
    );
    gf.primary([Object], _ => null);
    const fn = gf.fn;

    // Mixed keys (value-constrained + structural) — should still work correctly
    expect(fn({ type: "heading", content: "Hello" })).toEqual("Hello");
    expect(fn({ type: "paragraph", content: "World" })).toEqual(null);
    // Repeated calls still correct
    expect(fn({ type: "heading", content: "Again" })).toEqual("Again");
  });

  test(".fn getter returns same reference", () => {
    const gf = uut.defgeneric("cached8", "a");
    gf.primary([Object], a => a);
    expect(gf.fn).toBe(gf.fn);
  });

  test("before/after/around methods work with cached partitioned data", () => {
    const log = [];
    const gf = uut.defgeneric("cached9", "a");
    gf.before([Object], a => log.push("before"));
    gf.primary([Object], a => {
      log.push("primary");
      return "result";
    });
    gf.after([Object], a => log.push("after"));
    gf.around([Object], function (a) {
      log.push("around-start");
      const r = this.call_next_method(a);
      log.push("around-end");
      return r;
    });
    const fn = gf.fn;

    // First call (cache miss)
    expect(fn(1)).toEqual("result");
    expect(log).toEqual([
      "around-start",
      "before",
      "primary",
      "after",
      "around-end",
    ]);

    log.length = 0;

    // Second call (cache hit)
    expect(fn(2)).toEqual("result");
    expect(log).toEqual([
      "around-start",
      "before",
      "primary",
      "after",
      "around-end",
    ]);
  });
});

function makeCustomSpecializer() {
  function AEql(val) {
    this.val = val;
  }
  AEql.prototype = Object.assign(new uut.Specializer(), {
    toString() {
      return `AEql(${this.val})`;
    },
    matches(other) {
      return this.val === other;
    },
    super_of(other) {
      return other === String ? false : other !== Object;
    },
  });
  return AEql;
}
