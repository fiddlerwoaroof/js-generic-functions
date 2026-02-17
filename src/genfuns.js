function SubTypeError(name) {
  const cls = function () {
    const instance = Error(...arguments);
    Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    Object.defineProperty(instance, "name", {
      value: name,
      writable: false,
    });
    return instance;
  };
  cls.prototype = Object.create(Error);
  return cls;
}

export const NoNextMethodError = SubTypeError("NoNextMethodError");
export const NoApplicableMethodError = SubTypeError("NoApplicableMethodError");
export const NoPrimaryMethodError = SubTypeError("NoPrimaryMethodError");

const NO_NEXT_METHOD_CTX = Object.freeze({
  call_next_method() {
    throw new NoNextMethodError("no next method");
  },
  next_method_p: false,
});

export class UnhandledObjType extends Error {
  /**
   * @param {string} objType
   */
  constructor(objType, ...params) {
    super(...params);
    this.objType = objType;
  }

  toString() {
    return `[${this.name}: unhandled objType: ${this.objType}]`;
  }
}

export const before_qualifier = Symbol.for("before");
export const after_qualifier = Symbol.for("after");
export const around_qualifier = Symbol.for("around");

/**
 * The base prototype for a method.
 */
const Method = {
  lambda_list: [],
  qualifiers: [],
  specializers: [],
  body: () => {},
  generic_function: null,
};

/** @lends GenericFunction.prototype */
let genfun_prototype = {
  name: "(placeholder)",
  lambda_list: [],
  methods: [],
  method(qualifiers, specializers, body) {
    ensure_method(this, this.lambda_list, qualifiers, specializers, body);
    return this;
  },
  /**
   *  Add a primary method to the generic function. In the context of
   *  the body, `this` has the available functions `call_next_method`
   *  and the property `next_method_p` which allow delegating to other
   *  implementations of the generic function. Only one of these will
   *  be executed, unless `call_next_method` is called.
   *
   *  @param {Specializer[]} specializers the specializers controlling
   *                                      dispatch to this method
   *  @param {Function} body the implementation of the method
   *  @returns GenericFunction
   */
  primary(specializers, body) {
    return this.method([], specializers, body);
  },
  /**
   *  Add a before method to the generic function. Every before method
   *  is runs before the primary method and no before method can
   *  influence the return value of the generic function.
   *
   *  @param {Specializer[]} specializers the specializers controlling dispatch to this method
   *  @param {Function} body the implementation of the method
   *  @returns GenericFunction
   */
  before(specializers, body) {
    return this.method([before_qualifier], specializers, body);
  },
  /**
   *  Add a after method to the generic function. Every after method
   *  is runs after the primary method and no after method can
   *  influence the return value of the generic function.
   *
   *  @param {Specializer[]} specializers the specializers controlling dispatch to this method
   *  @param {Function} body the implementation of the method
   *  @returns GenericFunction
   */
  after(specializers, body) {
    return this.method([after_qualifier], specializers, body);
  },
  /**
   *  Add a around method to the generic function. In the context of
   *  the body, `this` has the available functions `call_next_method`
   *  and the property `next_method_p` which allow delegating to other
   *  implementations of the generic function. A generic function with
   *  only around methods cannot be called.  However, an around method
   *  can skip the invocation of the primary method by not calling
   *  `call_next_method` in its body.  An around method can also
   *  modify the results of the primary method and/or the arguments to
   *  the primary method. Note that changing the arguments to the
   *  primary method in a way that violates the specializers is
   *  unsupported and may have surprising consequences.
   *
   *  @param {Specializer[]} specializers the specializers controlling dispatch to this method
   *  @param {Function} body the implementation of the method
   *  @returns GenericFunction
   */
  around(specializers, body) {
    return this.method([around_qualifier], specializers, body);
  },
  get fn() {
    if (this._cachedFn !== null) return this._cachedFn;
    const gf = this;
    const lambda = function (...args) {
      return apply_generic_function(gf, args);
    };
    this._cachedFn = Object.defineProperties(lambda, {
      name: { value: gf.name },
      lambda_list: { value: gf.lambda_list },
      gf: { value: gf },
    });
    return this._cachedFn;
  },
  clearDispatchCache() {
    this._dispatchCache = null;
    this._keyExtractors = undefined;
  },
};

/**
 * @class
 * @param {string} name
 * @param {string[]} lambda_list
 * @property {Method[]} methods
 */
function GenericFunction(name, lambda_list) {
  if (!(this instanceof GenericFunction)) {
    return new GenericFunction(...arguments);
  }

  this.name = name;
  this.lambda_list = lambda_list;
  this.methods = [];
  this._dispatchCache = null;
  this._keyExtractors = undefined;
  this._cachedFn = null;
}
GenericFunction.prototype = Object.create(genfun_prototype);

/**
 * The main entrypoint to the library. Code like this constructs a new
 * generic function named `foo`:
 *
 * ```js
 * const foo = defgeneric('foo', 'arg1', 'arg2', 'arg3');
 * ```
 *
 * To add methods to the generic function, you grab the generic
 * function reference and call the relevant methods (arrow functions
 * may be used, unless you want access to `call_next_method`):
 *
 * ```js
 * foo.primary([String, Object, Object], (arg1, arg2, arg3) => { ... });
 * foo.around([String, Object, Object], function (arg1, arg2, arg3) {
 *   if (arg1 !== 'a') {
 *     return this.call_next_method();
 *   }
 * });
 * ```
 *
 * Note that these names mostly exist for introspection
 * purposes. These were used in custom formatters, but Chrome removed
 * that functionality.
 *
 */
export function defgeneric(name, ...argument_names) {
  return GenericFunction(name, argument_names);
}

// let method_prototype = {
//     lambda_list: [],
//     qualifiers: [],
//     specializrs: [],
//     body() { throw new Error('Unimplemented'); },
//     environment: {},
//     generic_function: {},
// };

/**
 * @class
 * @extends Method
 * @param {string[]} lambda_list
 * @param {Symbol[]} qualifiers
 * @param {Specializer | Object} specializers
 * @param {Function} body
 */
export function StandardMethod(lambda_list, qualifiers, specializers, body) {
  if (!(this instanceof StandardMethod)) {
    return new StandardMethod(...arguments);
  }

  this.lambda_list = lambda_list;
  this.qualifiers = qualifiers;
  this.specializers = specializers;
  this.body = body;
  this.generic_function = null;
}
StandardMethod.prototype = Object.create(Method);

function ensure_method(gf /*, lambda_list, qualifiers, specializers, body*/) {
  let new_method = StandardMethod(...[].slice.call(arguments, 1));
  add_method(gf, new_method);
  return new_method;
}

function add_method(gf, method) {
  method.generic_function = gf;
  gf.methods.push(method);
  gf._dispatchCache = null;
  gf._keyExtractors = undefined;
  return method;
}

// function classes_of(args) {
//     return args.map(Object.getPrototypeOf);
// }

const required_portion = x => x;

function classBasedKey(obj) {
  if (obj === null) return null;
  if (obj === undefined) return undefined;
  const t = typeof obj;
  if (t === "number") return Number;
  if (t === "string") return String;
  if (t === "boolean") return Boolean;
  if (t === "symbol") return Symbol;
  if (t === "bigint") return BigInt;
  return obj.constructor;
}

function buildKeyExtractors(gf) {
  const methods = gf.methods;
  if (methods.length === 0) return null;

  const maxArgs = Math.max(...methods.map(m => m.specializers.length));
  const extractors = [];

  for (let pos = 0; pos < maxArgs; pos++) {
    const specsAtPos = methods
      .filter(m => pos < m.specializers.length)
      .map(m => m.specializers[pos]);

    const customSpecs = specsAtPos.filter(s => s instanceof Specializer);

    if (customSpecs.length === 0) {
      extractors.push(classBasedKey);
      continue;
    }

    const allEql = customSpecs.every(s => s instanceof Eql);
    if (allEql && customSpecs.length === specsAtPos.length) {
      extractors.push(arg => arg);
      continue;
    }

    const allShape = customSpecs.every(s => s instanceof Shape);
    if (allShape) {
      const hasValueConstraints = customSpecs.some(shape =>
        Array.from(shape.keys).some(k => k instanceof Array)
      );

      if (hasValueConstraints) {
        // Check if ALL keys across ALL Shapes are value-constrained
        const allValueConstrained = customSpecs.every(shape =>
          Array.from(shape.keys).every(k => k instanceof Array)
        );
        if (!allValueConstrained) return null;

        // Collect constrained property names from each Shape — they must all constrain the same property name(s)
        const constrainedProps = customSpecs.map(shape =>
          Array.from(shape.keys)
            .map(k => k[0])
            .sort()
        );
        const refProps = constrainedProps[0];
        const sameProps = constrainedProps.every(
          props =>
            props.length === refProps.length &&
            props.every((p, i) => p === refProps[i])
        );
        if (!sameProps) return null;

        const hasNonSpecializer = specsAtPos.some(
          s => !(s instanceof Specializer)
        );

        if (refProps.length === 1) {
          const prop = refProps[0];
          if (hasNonSpecializer) {
            extractors.push(obj => {
              if (typeof obj !== "object" || obj === null)
                return classBasedKey(obj);
              return obj[prop];
            });
          } else {
            extractors.push(obj => {
              if (typeof obj !== "object" || obj === null) return undefined;
              return obj[prop];
            });
          }
        } else {
          if (hasNonSpecializer) {
            extractors.push(obj => {
              if (typeof obj !== "object" || obj === null)
                return classBasedKey(obj);
              return refProps.map(p => obj[p]).join("\0");
            });
          } else {
            extractors.push(obj => {
              if (typeof obj !== "object" || obj === null) return undefined;
              return refProps.map(p => obj[p]).join("\0");
            });
          }
        }
        continue;
      }

      const hasNonSpecializer = specsAtPos.some(
        s => !(s instanceof Specializer)
      );
      if (hasNonSpecializer) {
        // Mixed: class-based + Shape at same position — use combined key
        extractors.push(obj => {
          if (typeof obj !== "object" || obj === null)
            return classBasedKey(obj);
          return Object.getOwnPropertyNames(obj).sort().join("\0");
        });
        continue;
      }

      extractors.push(obj => {
        if (typeof obj !== "object" || obj === null) return undefined;
        return Object.getOwnPropertyNames(obj).sort().join("\0");
      });
      continue;
    }

    // Check if any custom specializer lacks a cacheKey override
    for (const spec of customSpecs) {
      if (spec.cacheKey === Specializer.prototype.cacheKey) {
        return null;
      }
    }

    // Mixed specializer subtypes at this position — disable caching
    return null;
  }

  return extractors;
}

const EMPTY_CACHE_SENTINEL = Symbol("EMPTY_CACHE_SENTINEL");

function getCachedMethods(gf, args) {
  if (gf._keyExtractors === undefined) {
    gf._keyExtractors = buildKeyExtractors(gf);
  }
  if (gf._keyExtractors === null) return null;
  if (gf._dispatchCache === null) return null;

  let node = gf._dispatchCache;
  for (let i = 0; i < gf._keyExtractors.length; i++) {
    const key = gf._keyExtractors[i](args[i]);
    if (key === undefined) return null;
    node = node.get(key);
    if (node === undefined) return null;
  }
  return node;
}

function storeCachedMethods(gf, args, entry) {
  if (gf._keyExtractors === undefined) {
    gf._keyExtractors = buildKeyExtractors(gf);
  }
  if (gf._keyExtractors === null) return;

  if (gf._dispatchCache === null) {
    gf._dispatchCache = new Map();
  }

  let node = gf._dispatchCache;
  const lastIdx = gf._keyExtractors.length - 1;
  for (let i = 0; i < lastIdx; i++) {
    const key = gf._keyExtractors[i](args[i]);
    if (key === undefined) return;
    let next = node.get(key);
    if (next === undefined) {
      next = new Map();
      node.set(key, next);
    }
    node = next;
  }
  const lastKey = gf._keyExtractors[lastIdx](args[lastIdx]);
  if (lastKey === undefined) return;
  node.set(lastKey, entry);
}

function partitionMethods(applicable_methods) {
  const primaries = applicable_methods.filter(primary_method_p);
  const befores = applicable_methods.filter(before_method_p);
  const arounds = applicable_methods.filter(around_method_p);
  const afters = applicable_methods.filter(after_method_p);
  afters.reverse();
  return { methods: applicable_methods, primaries, befores, arounds, afters };
}

function buildPrimaryChain(gf, primaries) {
  if (primaries.length === 1) {
    // Tier 1: single primary, zero per-call allocation
    const body = primaries[0].body;
    return args => body.call(NO_NEXT_METHOD_CTX, ...args);
  }

  // Tier 2: multiple primaries — build recursive closure chain from tail to head
  // Pre-compute tail slices at build time
  const tailSlices = [];
  for (let i = 0; i < primaries.length; i++) {
    tailSlices[i] = primaries.slice(i + 1);
  }

  function buildLevel(idx) {
    const body = primaries[idx].body;
    if (idx === primaries.length - 1) {
      // Leaf: no next method
      return args => body.call(NO_NEXT_METHOD_CTX, ...args);
    }

    const nextLevel = buildLevel(idx + 1);
    const tailSlice = tailSlices[idx];

    return args => {
      const ctx = {
        call_next_method(...cnm_args) {
          if (cnm_args.length > 0) {
            return apply_methods(gf, cnm_args, tailSlice);
          }
          return nextLevel(args);
        },
        next_method_p: true,
      };
      return body.call(ctx, ...args);
    };
  }

  return buildLevel(0);
}

function buildTier3EMF(gf, primaryChain, befores, afters) {
  return args => {
    for (let i = 0; i < befores.length; i++) {
      befores[i].body.call(NO_NEXT_METHOD_CTX, ...args);
    }
    try {
      return primaryChain(args);
    } finally {
      for (let i = 0; i < afters.length; i++) {
        afters[i].body.call(NO_NEXT_METHOD_CTX, ...args);
      }
    }
  };
}

function buildTier4EMF(gf, partitioned) {
  const { primaries, befores, arounds, afters } = partitioned;

  // Pre-build the inner chain (befores + primaries + afters) using existing EMF tiers
  const primaryChain = buildPrimaryChain(gf, primaries);
  let innerFn;
  if (befores.length === 0 && afters.length === 0) {
    innerFn = primaryChain;
  } else {
    innerFn = buildTier3EMF(gf, primaryChain, befores, afters);
  }

  // Build around closure chain from tail to head.
  // Semantics: call_next_method(newArgs) propagates newArgs to remaining
  // arounds, but the primary chain always receives the original entry args
  // (matching WrappedMethod.continuation() capture semantics).
  function buildAroundLevel(idx) {
    const body = arounds[idx].body;

    if (idx === arounds.length - 1) {
      // Last around: call_next_method always invokes innerFn with original args
      return (args, originalArgs) => {
        const ctx = {
          call_next_method() {
            return innerFn(originalArgs);
          },
          next_method_p: true,
        };
        return body.call(ctx, ...args);
      };
    }

    const nextLevel = buildAroundLevel(idx + 1);

    return (args, originalArgs) => {
      const ctx = {
        call_next_method(...cnm_args) {
          if (cnm_args.length > 0) {
            return nextLevel(cnm_args, originalArgs);
          }
          return nextLevel(args, originalArgs);
        },
        next_method_p: true,
      };
      return body.call(ctx, ...args);
    };
  }

  const aroundChain = buildAroundLevel(0);
  return args => aroundChain(args, args);
}

function buildEMF(gf, partitioned) {
  const { primaries, befores, arounds, afters } = partitioned;

  if (primaries.length === 0) {
    return _args => {
      throw new NoPrimaryMethodError(`No primary method for ${gf.name}`);
    };
  }

  if (arounds.length > 0) {
    return buildTier4EMF(gf, partitioned);
  }

  const primaryChain = buildPrimaryChain(gf, primaries);

  if (befores.length === 0 && afters.length === 0) {
    return primaryChain;
  }

  return buildTier3EMF(gf, primaryChain, befores, afters);
}

function apply_generic_function(gf, args) {
  const cached = getCachedMethods(gf, args);
  if (cached !== null) {
    if (cached === EMPTY_CACHE_SENTINEL) {
      throw new NoApplicableMethodError(
        `no applicable methods for gf ${gf.name} with args ${JSON.stringify(
          args
        )}`
      );
    }
    return cached(args);
  }

  let applicable_methods = compute_applicable_methods_using_classes(
    gf,
    required_portion(args)
  );
  if (applicable_methods.length === 0) {
    storeCachedMethods(gf, args, EMPTY_CACHE_SENTINEL);
    throw new NoApplicableMethodError(
      `no applicable methods for gf ${gf.name} with args ${JSON.stringify(
        args
      )}`
    );
  } else {
    const partitioned = partitionMethods(applicable_methods);
    const emf = buildEMF(gf, partitioned);
    storeCachedMethods(gf, args, emf);
    return emf(args);
  }
}

function method_more_specific_p(m1, m2 /*, required_classes*/) {
  const m1specializers = m1.specializers;
  const m2specializers = m2.specializers;

  let result = null;
  for (let [spec1, spec2] of m1specializers.map((el, idx) => [
    el,
    m2specializers[idx],
  ])) {
    if (spec1 !== spec2) {
      result = sub_specializer_p(spec1, spec2);
      break;
    }
  }

  return result;
}

export function sub_specializer_p(c1, c2) {
  let result = false;
  if (c1 instanceof Specializer) {
    result = c1.super_of(c2);
  } else if (c2 instanceof Specializer) {
    result = !c2.super_of(c1);
  } else if (c1.prototype !== undefined && c2.prototype !== undefined) {
    result = Object.isPrototypeOf.call(c1.prototype, c2.prototype);
  }
  return result;
}

const idS = Symbol.for("id");
Object.prototype[idS] = function () {
  return this;
};

export function Specializer() {}
Specializer.prototype = {
  matches(_obj) {
    return false;
  },
  super_of(_obj) {
    return false;
  },
  cacheKey(_obj) {
    return undefined;
  },
};

function isSuperset(superset, subset) {
  return (
    superset.size > subset.size &&
    Array.from(subset).every(superset.has.bind(superset))
  );
}

const matchShape = defgeneric("matchShape", "shape", "value")
  .primary([Array], ([name, dflt], v) => dflt !== undefined && v[name] === dflt)
  .primary([String], (name, v) => v[name] !== undefined).fn;

export const extractKey = defgeneric("extractKey", "key")
  .primary([Array], ([name, _]) => name)
  .primary([String], name => name).fn;

export function Shape(...keys) {
  if (!(this instanceof Shape)) {
    return new Shape(...keys);
  }
  this.keys = new Set(keys);
}
Shape.prototype = Object.assign(new Specializer(), {
  matches(obj) {
    return Array.from(this.keys).every(key => matchShape(key, obj));
  },
  super_of(spec) {
    // this is the super of spec
    //     if this.keys is a subset of spec.keys
    // and if this.keys != spec.keys

    if (!(spec instanceof Shape)) {
      const specKeys = spec && new Set(Object.getOwnPropertyNames(spec));
      return !!specKeys && isSuperset(specKeys, this.keys);
    } else {
      return isSuperset(spec.keys, this.keys);
    }
  },
  cacheKey(obj) {
    if (typeof obj !== "object" || obj === null) {
      return undefined;
    }
    for (const key of this.keys) {
      if (key instanceof Array) {
        return undefined;
      }
    }
    return Object.getOwnPropertyNames(obj).sort().join("\0");
  },
});

export function Eql(val) {
  if (!(this instanceof Eql)) {
    return new Eql(val);
  }
  this.val = val;
}
Eql.prototype = Object.assign(new Specializer(), {
  toString() {
    return `AEql(${this.val})`;
  },
  matches(other) {
    return this.val === other;
  },
  super_of() {
    return false;
  },
  cacheKey(obj) {
    return obj;
  },
});

// function trace(fun) {
//     return function (...args) {
//         console.log(fun, `args are: thsds`, this, 'others', args);
//         const result = fun.apply(this, args);
//         console.log(`result`, result);
//         return result;
//     }
// }

export function matches_specializer(obj, specializer) {
  let objType = typeof obj;
  let specializer_proto = specializer && specializer.prototype;
  let result = obj === specializer_proto;

  if (specializer instanceof Specializer) {
    result = specializer.matches(obj);
  } else if (obj === null && (obj === specializer || specializer === Object)) {
    result = true;
  } else if (specializer && specializer.prototype !== undefined) {
    if (objType === "object") {
      if (!result) {
        result = Object.isPrototypeOf.call(specializer_proto, obj);
      }
    } else if (objType === "number") {
      result = matches_specializer(Number.prototype, specializer);
    } else if (objType === "boolean") {
      result = matches_specializer(Boolean.prototype, specializer);
    } else if (objType === "string") {
      result = matches_specializer(String.prototype, specializer);
    } else if (objType === "symbol") {
      result = matches_specializer(Symbol.prototype, specializer);
    } else if (objType === "undefined") {
      result = specializer === Object || obj === specializer;
    } else if (objType === "bigint") {
      result = matches_specializer(BigInt.prototype, specializer);
    } else {
      throw new UnhandledObjType(objType);
    }
  }

  return result;
}

/**
 * @param {GenericFunction} gf
 */
function compute_applicable_methods_using_classes(gf, required_classes) {
  const applicable_methods = gf.methods.filter(method =>
    method.specializers.every((specializer, idx) =>
      matches_specializer(required_classes[idx], specializer)
    )
  );

  applicable_methods.sort((a, b) => {
    let result = 0;
    if (method_more_specific_p(a, b)) {
      result = 1;
    }
    if (method_more_specific_p(b, a)) {
      result = -1;
    }

    return result;
  });

  return applicable_methods;
}

/**
 * @param {any[]} a1
 * @param {any[]} a2
 */
function arr_eq(a1, a2) {
  if (a1.length !== a2.length) {
    return false;
  } else {
    for (let x = 0; x < a1.length; x++) {
      if (a1[x] instanceof Array && a2[x] instanceof Array) {
        if (!arr_eq(a1[x], a2[x])) {
          return false;
        }
      } else if (a1[x] !== a2[x]) {
        return false;
      } else if (
        Object.hasOwnProperty.call(a1[x], "equals") &&
        !a1[x].equals(a2[x])
      ) {
        return false;
      } else if (
        Object.hasOwnProperty.call(a2[x], "equals") &&
        !a2[x].equals(a1[x])
      ) {
        return false;
      }
    }
    return true;
  }
}

// function set_eq(a1, a2) {
//     if (a1.length !== a2.length) {
//         return false;
//     } else {
//         let result = true;
//         for (let elem of a1) {
//             result = result && a2.has(elem);
//             if (!result) break;
//         }
//         return result;
//     }
// }

const primary_method_p = method =>
  method instanceof WrappedMethod || method.qualifiers.length === 0;
const before_method_p = method =>
  !(method instanceof WrappedMethod) &&
  arr_eq(method.qualifiers, [before_qualifier]);
const after_method_p = method =>
  !(method instanceof WrappedMethod) &&
  arr_eq(method.qualifiers, [after_qualifier]);
const around_method_p = method =>
  !(method instanceof WrappedMethod) &&
  arr_eq(method.qualifiers, [around_qualifier]);

function WrappedMethod(continuation) {
  this.continuation = continuation;
}

/**
 * @param {GenericFunction} gf
 * @param {any[]} args
 * @param {Method[]} applicable_methods
 */
function apply_methods(gf, args, applicable_methods) {
  const primaries = applicable_methods.filter(primary_method_p);
  const befores = applicable_methods.filter(before_method_p);
  const arounds = applicable_methods.filter(around_method_p);
  const afters = applicable_methods.filter(after_method_p);
  afters.reverse();

  const main_call = Object.defineProperty(
    function () {
      if (primaries.length === 0) {
        throw new NoPrimaryMethodError(`No primary method for ${gf.name}`);
      }

      for (let before of befores) {
        apply_method(before, args, []);
      }

      try {
        return apply_method(primaries[0], args, primaries.slice(1));
      } finally {
        for (let after of afters) {
          apply_method(after, args, []);
        }
      }
    },
    "name",
    { value: `main_call_${gf.name}` }
  );

  if (arounds.length === 0) {
    return main_call();
  } else {
    const wrapped_main_call = new WrappedMethod(main_call);
    const next_methods = arounds.slice(1).concat([wrapped_main_call]);
    return apply_method(arounds[0], args, next_methods);
  }
}

/**
 * @param {Method} method
 * @param {any[]} args
 * @param {Method[]} next_methods
 */
function apply_method(method, args, next_methods) {
  const method_context = {
    call_next_method(...cnm_args) {
      if (next_methods.length === 0) {
        throw new NoNextMethodError(
          `no next method for genfun ${method.generic_function.name}`
        );
      }

      return method instanceof WrappedMethod
        ? method.continuation()
        : apply_methods(
            method.generic_function,
            cnm_args.length > 0 ? cnm_args : args,
            next_methods
          );
    },

    get next_method_p() {
      return next_methods.length !== 0;
    },
  };

  return method.body
    ? method.body.call(method_context, ...args)
    : method.continuation();
}
