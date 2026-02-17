/**
 * Benchmark suite for js-generic-functions
 *
 * Measures dispatch performance across various scenarios,
 * both with and without JIT warmup.
 *
 * Usage: node bench/benchmark.js
 */

"use strict";

const {
  defgeneric,
  Shape,
  Eql,
  Specializer,
} = require("../dist/genfuns");

// ─── Helpers ────────────────────────────────────────────────

function formatNs(ns) {
  if (ns < 1000) return `${ns.toFixed(0)}ns`;
  if (ns < 1e6) return `${(ns / 1000).toFixed(2)}µs`;
  return `${(ns / 1e6).toFixed(2)}ms`;
}

function formatOps(opsPerSec) {
  if (opsPerSec >= 1e6) return `${(opsPerSec / 1e6).toFixed(2)}M ops/s`;
  if (opsPerSec >= 1e3) return `${(opsPerSec / 1e3).toFixed(2)}K ops/s`;
  return `${opsPerSec.toFixed(0)} ops/s`;
}

/**
 * Run a benchmark function, returning { opsPerSec, nsPerOp, totalMs }.
 * @param {Function} fn - zero-arg function to benchmark
 * @param {number} iterations - number of times to call fn
 */
function bench(fn, iterations) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  const totalNs = Number(end - start);
  const nsPerOp = totalNs / iterations;
  const opsPerSec = 1e9 / nsPerOp;
  return {
    opsPerSec,
    nsPerOp,
    totalMs: totalNs / 1e6,
  };
}

function runBenchmark(name, fn, { warmupIterations = 10000, measuredIterations = 100000 } = {}) {
  // Phase 1: Cold (no JIT warmup for this specific function pattern)
  // We measure a small number of iterations before V8 has had a chance to optimize
  const cold = bench(fn, 100);

  // Phase 2: JIT warmup
  bench(fn, warmupIterations);

  // Phase 3: Hot (after JIT warmup)
  const hot = bench(fn, measuredIterations);

  console.log(`  ${name}`);
  console.log(`    Cold (100 calls):    ${formatNs(cold.nsPerOp)}/op  (${formatOps(cold.opsPerSec)})`);
  console.log(`    Hot  (${measuredIterations} calls): ${formatNs(hot.nsPerOp)}/op  (${formatOps(hot.opsPerSec)})`);
  console.log();

  return { name, cold, hot };
}

// ─── Setup: Class hierarchies ───────────────────────────────

class Animal {}
class Dog extends Animal {}
class Cat extends Animal {}
class Labrador extends Dog {}
class Poodle extends Dog {}
class Siamese extends Cat {}
class Persian extends Cat {}
class GoldenRetriever extends Labrador {}

// ─── Benchmark Scenarios ────────────────────────────────────

const results = [];

console.log("=".repeat(70));
console.log("  js-generic-functions Benchmark Suite");
console.log("=".repeat(70));
console.log();

// 1. Simple single-dispatch, single method
console.log("── 1. Single dispatch, single primary method ──");
{
  const speak = defgeneric("speak", "animal");
  speak.primary([Animal], function (a) { return "..."; });
  const fn = speak.fn;
  const a = new Animal();
  results.push(runBenchmark("Animal -> speak", () => fn(a)));
}

// 2. Single dispatch, multiple methods (subclass resolution)
console.log("── 2. Single dispatch, 3 primary methods (class hierarchy) ──");
{
  const describe = defgeneric("describe", "animal");
  describe
    .primary([Animal], function (a) { return "animal"; })
    .primary([Dog], function (a) { return "dog"; })
    .primary([Cat], function (a) { return "cat"; });
  const fn = describe.fn;
  const dog = new Dog();
  const cat = new Cat();
  const animal = new Animal();
  results.push(runBenchmark("Dog -> describe", () => fn(dog)));
  results.push(runBenchmark("Cat -> describe", () => fn(cat)));
  results.push(runBenchmark("Animal -> describe", () => fn(animal)));
}

// 3. Deep hierarchy dispatch
console.log("── 3. Deep hierarchy (4 levels), 4 methods ──");
{
  const greet = defgeneric("greet", "animal");
  greet
    .primary([Animal], function (a) { return "hi animal"; })
    .primary([Dog], function (a) { return "hi dog"; })
    .primary([Labrador], function (a) { return "hi lab"; })
    .primary([GoldenRetriever], function (a) { return "hi golden"; });
  const fn = greet.fn;
  const golden = new GoldenRetriever();
  const lab = new Labrador();
  results.push(runBenchmark("GoldenRetriever -> greet (deepest)", () => fn(golden)));
  results.push(runBenchmark("Labrador -> greet", () => fn(lab)));
}

// 4. Multiple dispatch (2 arguments)
console.log("── 4. Multiple dispatch (2 args), 4 methods ──");
{
  const interact = defgeneric("interact", "a", "b");
  interact
    .primary([Animal, Animal], function (a, b) { return "animals interact"; })
    .primary([Dog, Cat], function (a, b) { return "dog chases cat"; })
    .primary([Cat, Dog], function (a, b) { return "cat hisses at dog"; })
    .primary([Dog, Dog], function (a, b) { return "dogs play"; });
  const fn = interact.fn;
  const dog = new Dog();
  const cat = new Cat();
  results.push(runBenchmark("Dog,Cat -> interact", () => fn(dog, cat)));
  results.push(runBenchmark("Dog,Dog -> interact", () => fn(dog, dog)));
}

// 5. Before/After/Around methods (method combination)
console.log("── 5. Method combination (before + primary + after) ──");
{
  const process_ = defgeneric("process", "item");
  process_
    .before([Animal], function (a) { /* before */ })
    .primary([Animal], function (a) { return "processed"; })
    .after([Animal], function (a) { /* after */ });
  const fn = process_.fn;
  const a = new Animal();
  results.push(runBenchmark("Animal -> before+primary+after", () => fn(a)));
}

// 6. Around method with call_next_method
console.log("── 6. Around method with call_next_method ──");
{
  const transform = defgeneric("transform", "item");
  transform
    .around([Animal], function (a) { return this.call_next_method(a); })
    .primary([Animal], function (a) { return "transformed"; });
  const fn = transform.fn;
  const a = new Animal();
  results.push(runBenchmark("Animal -> around+primary (CNM)", () => fn(a)));
}

// 7. call_next_method chain (primary -> primary)
console.log("── 7. call_next_method chain (3 primaries) ──");
{
  const chain = defgeneric("chain", "animal");
  chain
    .primary([Animal], function (a) { return "base"; })
    .primary([Dog], function (a) { return "dog+" + this.call_next_method(a); })
    .primary([Labrador], function (a) { return "lab+" + this.call_next_method(a); });
  const fn = chain.fn;
  const lab = new Labrador();
  results.push(runBenchmark("Labrador -> 3-deep CNM chain", () => fn(lab)));
}

// 8. Shape specializer
console.log("── 8. Shape specializer dispatch ──");
{
  const render = defgeneric("render", "obj");
  render
    .primary([Object], function (o) { return "generic"; })
    .primary([Shape("name")], function (o) { return "has name"; })
    .primary([Shape("name", "age")], function (o) { return "has name+age"; });
  const fn = render.fn;
  const obj = { name: "Alice", age: 30 };
  results.push(runBenchmark("{name,age} -> Shape dispatch", () => fn(obj)));
}

// 9. Eql specializer
console.log("── 9. Eql specializer dispatch ──");
{
  const handle = defgeneric("handle", "code");
  handle
    .primary([Number], function (c) { return "number"; })
    .primary([Eql(200)], function (c) { return "ok"; })
    .primary([Eql(404)], function (c) { return "not found"; })
    .primary([Eql(500)], function (c) { return "error"; });
  const fn = handle.fn;
  results.push(runBenchmark("200 -> Eql dispatch", () => fn(200)));
  results.push(runBenchmark("404 -> Eql dispatch", () => fn(404)));
  results.push(runBenchmark("42 -> fallback to Number", () => fn(42)));
}

// 10. Primitive type dispatch
console.log("── 10. Primitive type dispatch ──");
{
  const toStr = defgeneric("toStr", "val");
  toStr
    .primary([Object], function (v) { return "obj"; })
    .primary([Number], function (v) { return "num"; })
    .primary([String], function (v) { return "str"; })
    .primary([Boolean], function (v) { return "bool"; });
  const fn = toStr.fn;
  results.push(runBenchmark("number -> toStr", () => fn(42)));
  results.push(runBenchmark("string -> toStr", () => fn("hello")));
  results.push(runBenchmark("boolean -> toStr", () => fn(true)));
  results.push(runBenchmark("object -> toStr", () => fn({})));
}

// 11. Many methods (scaling test)
console.log("── 11. Scaling: 8 methods on single generic ──");
{
  const classify = defgeneric("classify", "animal");
  classify
    .primary([Animal], function (a) { return "animal"; })
    .primary([Dog], function (a) { return "dog"; })
    .primary([Cat], function (a) { return "cat"; })
    .primary([Labrador], function (a) { return "labrador"; })
    .primary([Poodle], function (a) { return "poodle"; })
    .primary([Siamese], function (a) { return "siamese"; })
    .primary([Persian], function (a) { return "persian"; })
    .primary([GoldenRetriever], function (a) { return "golden"; });
  const fn = classify.fn;
  const golden = new GoldenRetriever();
  const persian = new Persian();
  const animal = new Animal();
  results.push(runBenchmark("GoldenRetriever (8 methods)", () => fn(golden)));
  results.push(runBenchmark("Persian (8 methods)", () => fn(persian)));
  results.push(runBenchmark("Animal (8 methods)", () => fn(animal)));
}

// 12. Dispatch overhead vs plain function call
console.log("── 12. Baseline: plain function call (for comparison) ──");
{
  function plainSpeak(a) { return "..."; }
  const a = new Animal();
  results.push(runBenchmark("Plain function call", () => plainSpeak(a)));
}

// 13. Repeated same-type calls (cache-friendly scenario)
console.log("── 13. Repeated same-type calls (monomorphic) ──");
{
  const mono = defgeneric("mono", "x");
  mono.primary([Dog], function (x) { return 1; });
  const fn = mono.fn;
  const dog = new Dog();
  results.push(runBenchmark("Dog -> mono (single method, repeated)", () => fn(dog), {
    warmupIterations: 50000,
    measuredIterations: 500000,
  }));
}

// ─── Summary ────────────────────────────────────────────────

console.log("=".repeat(70));
console.log("  Summary (hot path, after JIT warmup)");
console.log("=".repeat(70));
console.log();

const maxNameLen = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  const name = r.name.padEnd(maxNameLen);
  console.log(`  ${name}  ${formatNs(r.hot.nsPerOp).padStart(10)}/op  ${formatOps(r.hot.opsPerSec).padStart(14)}`);
}

// Find the plain function baseline for comparison
const baseline = results.find(r => r.name === "Plain function call");
if (baseline) {
  console.log();
  console.log("  Dispatch overhead vs plain function call:");
  for (const r of results) {
    if (r === baseline) continue;
    const overhead = r.hot.nsPerOp / baseline.hot.nsPerOp;
    console.log(`    ${r.name.padEnd(maxNameLen)}  ${overhead.toFixed(1)}x`);
  }
}

console.log();
