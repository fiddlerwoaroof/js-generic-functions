// [[file:../README.org::*Other sorts of specializers][Other sorts of specializers:3]]
// [[[[file:~/git_repos/git.fiddlerwoaroof.com/js-generic-functions/README.org::imports][imports]]][imports]]
import { defgeneric } from "./genfuns.js";
// imports ends here
// [[[[file:~/git_repos/git.fiddlerwoaroof.com/js-generic-functions/README.org::specializer-import][specializer-import]]][specializer-import]]
import { Shape, Eql } from "./genfuns.js";
// specializer-import ends here

describe("defgeneric", () => {
  test("methods get called appropriately", () => {
    // [[[[file:~/git_repos/git.fiddlerwoaroof.com/js-generic-functions/README.org::basic-definition][basic-definition]]][basic-definition]]
    const example1generic = defgeneric("example1", "a", "b")
      .primary([Number, Object], (n, __) => [1, n])
      .primary([Object, Number], (_, n) => [2, n])
      .primary([Object, Object], (_, __) => [5, null]);
    // basic-definition ends here

    // [[[[file:~/git_repos/git.fiddlerwoaroof.com/js-generic-functions/README.org::call-the-function][call-the-function]]][call-the-function]]
    const example1 = example1generic.fn;
    
    expect(example1(5, {})).toEqual([1, 5]);
    expect(example1({}, 6)).toEqual([2, 6]);
    expect(example1("hello", {})).toEqual([5, null]);
    expect(example1({}, "world")).toEqual([5, null]);
    expect(example1({}, {})).toEqual([5, null]);
    // call-the-function ends here

    // [[[[file:~/git_repos/git.fiddlerwoaroof.com/js-generic-functions/README.org::add-methods][add-methods]]][add-methods]]
    example1generic
      .primary([String, Object], (s, __) => [3, s])
      .primary([Object, String], (_, s) => [4, s]);
    
    expect(example1("hello", {})).toEqual([3, "hello"]);
    expect(example1({}, "world")).toEqual([4, "world"]);
    // add-methods ends here

    
  });
  test ('specializers work as expected', () => {
    // [[[[file:~/git_repos/git.fiddlerwoaroof.com/js-generic-functions/README.org::specializer-examples][specializer-examples]]][specializer-examples]]
    const example2 = defgeneric("example2", "inp")
      .primary([Shape("a", "b")], inp => `a: ${inp.a} b: ${inp.b}`)
      .primary([Shape("a")], inp => `a: ${inp.a} b: <missing>`)
      .primary([Shape(["c", 1])], inp => `c: one`)
      .primary([Shape(["c", 2])], inp => `c: two`)
      .primary([Eql(1)], inp => "one").fn;
    
    expect(example2({ a: 3, q: "whatever" })).toEqual("a: 3 b: <missing>");
    expect(example2({ a: 3, b: 4, q: "whatever" })).toEqual("a: 3 b: 4");
    expect(example2({ c: 1, q: "whatever" })).toEqual("c: one");
    expect(example2({ c: 2, q: "whatever" })).toEqual("c: two");
    expect(example2(1)).toEqual("one");
    // specializer-examples ends here
  })
});
// Other sorts of specializers:3 ends here
