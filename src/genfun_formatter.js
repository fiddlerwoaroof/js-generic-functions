/* eslint-disable */

window.devtoolsFormatters = [
    {
        header(obj, config) {
            if (config && config.genfunFormatter) {
                return ["div", {}, config.key];
            } else if (!(obj.gf || obj instanceof GenericFunction)) {
                return null;
            } else if (obj.gf) {
                const args = obj.gf.lambda_list.join(', ');
                const method_count = obj.gf.methods.length
                return [
                    'div', {},
                    `GenericFunction lambda: ${obj.gf.name}(${args}) `
                    + `[${method_count} methods]`
                ];
            } else {
                const args = obj.lambda_list.join(', ');
                const method_count = obj.methods.length
                return [
                    'div', {},
                    `#<GenericFunction: ${obj.name}(${args}) [${method_count} methods]>`
                ];
            }
        },
        hasBody(obj) {return obj instanceof GenericFunction || obj instanceof StandardMethod;},
        body(obj, config) {
            if (! (obj instanceof GenericFunction || obj instanceof StandardMethod) ) {
                return null;
            } else if ( obj instanceof StandardMethod ) {
                return ["div", {style: 'margin-left: 2em'}].concat(
                    Object.keys(obj).map(
                        key => {
                            if (obj[key] instanceof String) {
                                return ["div", {}, `${key}: ${obj[key]},`];
                            } else {
                                return ["div", {}, `${key}: `, ["object", {object: obj[key]}], ','];
                            }
                        }
                    )
                );
            }

            const children = obj.methods.map(
                (method,idx) => {
                    const child = [
                        "object", {
                            object: method,
                            config: {
                                genfunFormatter: true,
                                key: `#<StandardMethod ${method.qualifiers.map(x => ':'+x.toString().slice(7,-1)).join(' ')} (${method.specializers.map(x => x.name.toString())})>`,
                            },
                        },
                    ];
                    return ["div", {style: `margin-left: 2em;`},
                            child]
                }
            );
            return ["div", {}].concat(children);
        }
    }
];
