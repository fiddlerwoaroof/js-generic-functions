export function NoNextMethodError() {}
NoNextMethodError.prototype = Object.create(Error);

export function NoApplicableMethodError() {}
NoApplicableMethodError.prototype = Object.create(Error);

export function NoPrimaryMethodError() {}
NoPrimaryMethodError.prototype = Object.create(NoApplicableMethodError);

const before_qualifier = Symbol.for("before");
const after_qualifier = Symbol.for("after");
const around_qualifier = Symbol.for("around");

const Method = {
  lambda_list: [],
  qualifiers: [],
  specializers: [],
  body: () => {},
  generic_function: null,
};

let genfun_prototype = {
  name: "(placeholder)",
  lambda_list: [],
  methods: [],
  method(qualifiers, specializers, body) {
    ensure_method(this, this.lambda_list, qualifiers, specializers, body);
    return this;
  },
  primary(specializers, body) {
    return this.method([], specializers, body);
  },
  before(specializers, body) {
    return this.method([before_qualifier], specializers, body);
  },
  after(specializers, body) {
    return this.method([after_qualifier], specializers, body);
  },
  around(specializers, body) {
    return this.method([around_qualifier], specializers, body);
  },
  get fn() {
    const gf = this;
    const lambda = function () {
      return apply_generic_function(gf, [].slice.call(arguments));
    }.bind(gf);
    return Object.defineProperties(lambda, {
      name: { value: gf.name },
      lambda_list: { value: gf.lambda_list },
      gf: { value: gf },
    });
  },
};

/**
 * @class
 * @extends genfun_prototype
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
}

GenericFunction.prototype = Object.create(genfun_prototype);

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
  return method;
}

// function classes_of(args) {
//     return args.map(Object.getPrototypeOf);
// }

const required_portion = x => x;

function apply_generic_function(gf, args) {
  let applicable_methods = compute_applicable_methods_using_classes(
    gf,
    required_portion(args)
  );
  if (applicable_methods.length === 0) {
    throw new NoApplicableMethodError(
      `no applicable methods for gf ${gf.name} with args ${JSON.stringify(
        args
      )}`
    );
  } else {
    return apply_methods(gf, args, applicable_methods);
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

  if (obj === null && obj === specializer) {
    result = true;
  } else if (specializer && specializer.prototype !== undefined) {
    if (!result && objType === "object") {
      result = Object.isPrototypeOf.call(specializer_proto, obj);
    } else if (objType === "number") {
      result =
        matches_specializer(Number.prototype, specializer) ||
        matches_specializer(specializer_proto, Number);
    } else if (objType === "string") {
      result =
        matches_specializer(String.prototype, specializer) ||
        matches_specializer(specializer_proto, String);
    }
  } else if (specializer instanceof Specializer) {
    result = specializer.matches(obj);
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
    ? method.body.bind(method_context)(...args)
    : method.continuation();
}
