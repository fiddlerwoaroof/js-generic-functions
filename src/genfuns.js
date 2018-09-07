const before_qualifier = Symbol.for('before');
const after_qualifier = Symbol.for('after');
const around_qualifier = Symbol.for('around');


let genfun_prototype = {
    name: "(placeholder)",
    lambda_list: [],
    methods: [],
    method(qualifiers, specializers, body) {
        ensure_method(this, this.lambda_list, qualifiers, specializers, body)
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
        const lambda = (function() {
            return apply_generic_function(gf, [].slice.call(arguments));
        }).bind(gf);
        return Object.defineProperties(lambda, {
            'name': {value: gf.name},
            'lambda_list': {value: gf.lambda_list},
            'gf': {value: gf},
        });
    }
};

function GenericFunction(name, lambda_list) {
    if (! (this instanceof GenericFunction) ) {
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

let method_prototype = {
    lambda_list: [],
    qualifiers: [],
    specializrs: [],
    body() { throw new Error('Unimplemented'); },
    environment: {},
    generic_function: {},
};

function StandardMethod(
    lambda_list, qualifiers, specializers, body
) {
    if (! (this instanceof StandardMethod) ) {
        return new StandardMethod(...arguments);
    }

    this.lambda_list = lambda_list;
    this.qualifiers = qualifiers;
    this.specializers = specializers;
    this.body = body;
    this.generic_function = null;
}

function ensure_method(gf, lambda_list, qualifiers, specializers, body) {
    let new_method = StandardMethod(...[].slice.call(arguments, 1));
    add_method(gf, new_method);
    return new_method;
}

function add_method(gf, method) {
    method.generic_function = gf;
    gf.methods.push(method);
    return method;
}

function classes_of(args) {
    return args.map(Object.getPrototypeOf);
}

const required_portion = x => x;

function apply_generic_function(gf, args) {
    let applicable_methods =
        compute_applicable_methods_using_classes(gf, required_portion(args));
    if (applicable_methods.length === 0) {
        throw new Error(`no applicable methods for gf ${gf.name} with args ${JSON.stringify(args)}`);
    } else {
        return apply_methods(gf, args, applicable_methods);
    }
}

function method_more_specific_p(m1, m2, required_classes) {
    const m1specializers = m1.specializers;
    const m2specializers = m2.specializers;

    for (let [spec1, spec2] of m1specializers.map((el, idx) => [el, m2specializers[idx]])) {
        if (spec1 !== spec2) {
            return sub_specializer_p(spec1, spec2);
        }
    }
}

function sub_specializer_p(c1, c2) {
    return c1.isPrototypeOf(c2);
}

const idS = Symbol.for('id');
Object.prototype[idS] = function () { return this };

export function matchesSpecializer(obj, specializer) {
    let result = obj === specializer.prototype;
    let objType = typeof obj;

    if (!result && objType === 'object') {
        result = Object.isPrototypeOf.call(specializer.prototype, obj);
    } else if (objType === 'number') {
        result = matchesSpecializer(Number.prototype, specializer) || matchesSpecializer(specializer.prototype, Number);
    } else if (objType === 'string') {
        result = matchesSpecializer(String.prototype, specializer) || matchesSpecializer(specializer.prototype, String);
    }

    return result;
}


function compute_applicable_methods_using_classes(gf, required_classes) {
    const applicable_methods = gf.methods.filter(
        method => method.specializers.every((specializer, idx) => matchesSpecializer(required_classes[idx], specializer))
    );

    applicable_methods.sort((a,b) => {
        if (method_more_specific_p(a,b)) {
            return 1;
        }
        if (method_more_specific_p(b,a)) {
            return -1;
        }
        return 0;
    })

    return applicable_methods;
}


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
            }
        }
        return true;
    }
}

const primary_method_p =
      method => method instanceof WrappedMethod || method.qualifiers.length === 0;
const before_method_p =
      method => !(method instanceof WrappedMethod) && arr_eq(method.qualifiers, [before_qualifier]);
const after_method_p =
      method => !(method instanceof WrappedMethod) && arr_eq(method.qualifiers, [after_qualifier]);
const around_method_p =
      method => !(method instanceof WrappedMethod) && arr_eq(method.qualifiers, [around_qualifier]);

function WrappedMethod(continuation) {
    this.continuation = continuation;
}

function apply_methods(gf, args, applicable_methods) {
    const primaries = applicable_methods.filter(primary_method_p);
    const befores = applicable_methods.filter(before_method_p);
    const arounds = applicable_methods.filter(around_method_p);
    const afters = applicable_methods.filter(after_method_p);
    afters.reverse();

    const main_call = Object.defineProperty(
        function() {
            if (primaries.length === 0) {
                throw new Error(`No primary method for ${gf.name}`);
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
        'name', {value: `main_call_${gf.name}`}, 
    );

    if (arounds.length === 0) {
        return main_call();
    } else {
        const wrapped_main_call = new WrappedMethod(main_call);
        const next_methods = arounds.slice(1).concat([wrapped_main_call]);
        return apply_method(arounds[0], args, next_methods);
    }
}

function apply_method(method, args, next_methods) {
    const method_context = {
        call_next_method(...cnm_args) {
            if (next_methods.length === 0) {
                throw new Error(`no next method for genfun ${method.generic_function.name}`);
            }

            return method instanceof WrappedMethod
                ? method.continuation()
                : apply_methods(method.generic_function, cnm_args.length > 0 ? cnm_args : args, next_methods);
        },
        get next_method_p() {
            return next_methods.length === 0
        }
    };

    return method.body ? method.body.bind(method_context)(...args) : method.continuation();
}
