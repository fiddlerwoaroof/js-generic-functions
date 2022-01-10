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
