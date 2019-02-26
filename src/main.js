import {GenericFunction, around_qualifier} from '../src/genfuns';

function zipWith(fn, ...args) {
    const minLen = Math.min(...args.map(x => x.length));
    const res = [];

    for (let x = 0; x < minLen; x++) {
        res.push(fn(...args.map(a => a[x])));
    }

    return res;
}

const gf = GenericFunction(
    "foobar", ["a", "b"]
).before(
    [Object, Array], function (a,b) {console.log('in before', this.next_method_p);} 
).primary(
    [Object, Array], function (a,b) {
        console.info('next_result: ', this.call_next_method(), this.next_method_p);
        return [a,...b];
    } 
).primary(
    [Object, Object], function (thing, single) {
        console.log("hello from previous method", this.next_method_p);
        return [thing, single];
    }
).after(
    [Number, Array], function (a,b) {console.log(`in after for ${a}`, this.next_method_p);} 
).fn;

function groupGFMessages(gf) {
    return gf.method([around_qualifier], [Object,Object], function(a,b) {
        console.groupCollapsed(gf.name);
        try {
            return this.call_next_method();
        } finally {
            console.groupEnd();
        }
    })
}

groupGFMessages(gf.gf);

console.log(gf(2,["asdf"]));

const gf2 = GenericFunction(
    "another", ["a"]
).primary(
    [Object], function (a) { return {value: a}; }
).method(
    [around_qualifier], [Number], function(thing) {
        console.log('before next method in number around');
        const val = this.call_next_method();
        console.log('after next method in number around', val);
        return {was_num: true, ...val};
    }
).method(
    [around_qualifier], [Object], function(thing) {
        console.log('before next method in generic around');
        const val = this.call_next_method();
        console.log('after next method in generic around', val);
        return {was_obj: true, ...val};
    }
);

function MyStore() {
    this.name = 'foo';
    this.address = '1234 asdfadfd'
}

class NameField extends HTMLElement {constructor() {
    super()
    const style = document.createElement('style');
    this.appendChild(style);
}}
customElements.define('the-name', NameField);

class AddressField extends HTMLElement {
    constructor() { super() }
}
customElements.define('the-address', AddressField);

const renderFn = defgeneric(
    "dorender", ["component", "el"]
).primary(
    [MyStore, NameField], function (comp, heading) {
        console.log('heading el', this.next_method_p);
        heading.textContent = comp.name;
    }
).primary(
    [MyStore, AddressField], function (comp, el) {
        console.log('address el', this.next_method_p);
        el.textContent = comp.address;
    }
).primary(
    [MyStore, HTMLElement], function (comp, el) {
        console.log('HtmlElement el ', el, this.next_method_p);
        renderFn.fn(comp, el.querySelector('the-name'));
        renderFn.fn(comp, el.querySelector('the-address'));
    }
).before(
    [Object, HTMLElement], function (_, el) {
        console.log('has next? ', this.next_method_p)
    }
);

renderFn.fn(new MyStore(), document.querySelector('section'));
