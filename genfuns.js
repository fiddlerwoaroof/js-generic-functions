let genfun_prototype = {
    name: "(placeholder)",
    lambda_list: [],
    methods: [],
};

function GenericFunction(name, lambda_list, methods) {
    if (! (this instanceof GenericFunction) ) {
        return new GenericFunction(name, lambda_list, methods);
    }

    this.name = name;
    this.lambda_list = lambda_list;
    this.methods = methods;
}

GenericFunction.prototype = Object.assign(
    Object.create(genfun_prototype), {
    }
);

let method_prototype = {
    lambda_list: [],
    qualifiers: [],
    specializrs: [],
    body() { throw new Error('Unimplemented'); },
    environment: {},
    generic_function: {},
};

function StandardMethod(
    lambda_list, qualifiers, specializers, body, environment, generic_function
) {
    if (! (this instanceof StandardMethod) ) {
        return new StandardMethod(...arguments);
    }

    this.lambda_list = lambda_list;
    this.qualifiers = qualifiers;
    this.specializers = specializers;
    this.body = body;
    this.environment = environment;
    this.generic_function = generic_function;
}

function ensure_method(gf, ...rest) {
    let new_method = StandardMethod(...rest);
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
        throw new Error(`no applicable methods for gf ${gf.name} with args ${args}`);
    } else {
        return apply_methods(gf, args, applicable_methods);
    }
}

function method_more_specific_p(m1, m2, required_classes) {
    const m1specializers = m1.specializers;
    const m2specializers = m2.specializers;

    for ([spec1, spec2] of m1specializers.map((el, idx) => [el, m2specializers[idx]])) {
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

function compute_applicable_methods_using_classes(gf, required_classes) {
    const applicable_methods = gf.methods.filter(
        method =>
            method.specializers.every((specializer,idx) => (console.info(specializer),
                                                            specializer.prototype.isPrototypeOf(required_classes[idx])
                                                            || specializer.prototype.isPrototypeOf(required_classes[idx][idS]())))
    );

    applicable_methods.sort((a,b) => {
        if (method_more_specific_p(a,b)) {
            return -1;
        }
        if (method_more_specific_p(b,a)) {
            return 1;
        }
        return 0;
    })

    return applicable_methods;
}

const before_qualifier = Symbol.for('before');
const after_qualifier = Symbol.for('after');

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

const primary_method_p = method => method.qualifiers.length === 0;
const before_method_p = method => arr_eq(method.qualifiers, [before_qualifier]);
const after_method_p = method => arr_eq(method.qualifiers, [after_qualifier]);

function apply_methods(gf, args, applicable_methods) {
    const primaries = applicable_methods.filter(primary_method_p);
    const befores = applicable_methods.filter(before_method_p);
    const afters = applicable_methods.filter(after_method_p);
    afters.reverse();

    if (primaries.length === 0) {
        throw new Error(`No primary method for ${gf.name}`);
    }

    for (let before of befores) {
        apply_method(before, args, []);
    }

    const result = apply_method(primaries[0], args, primaries.slice(1));

    for (let after of afters) {
        apply_method(after, args, []);
    }

    return result;
}

function apply_method(method, args, next_methods) {
    return Function('call_next_method', 'next_method_p', `return ${method.body.toString()}`)(
        (...cnm_args) => {
            if (next_methods.length === 0) {
                throw new Error(`no next method for genfun ${method.generic_function.name}`);
            }

            return apply_methods(method.generic_function, cnm_args.length > 0 ? cnm_args : args, next_methods);
        },
        () => next_methods.length === 0
    )(...args);
}

const gf = GenericFunction("foobar", ["a", "b"], []);
ensure_method(
    gf,
    [], [], [Object, Array], (thing, arr) => [thing, ...arr], null
);
ensure_method(
    gf,
    [], [], [Object, Object], (thing, single) => [thing, single], null
);

console.info(apply_generic_function(gf, [["asdf"],2]));
