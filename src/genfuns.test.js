import * as uut from './genfuns.js';

describe('matchesSpecializer', () => {
    function AThing() {};
    const an_instance = new AThing();
    
    test('works in expected cases', () => {
        expect(uut.matchesSpecializer(an_instance, AThing)).toBeTruthy();
        expect(uut.matchesSpecializer(an_instance, String)).toBeFalsy();
        expect(uut.matchesSpecializer(an_instance, Object)).toBeTruthy();

        expect(uut.matchesSpecializer(new String("foobar"), String)).toBeTruthy();
        expect(uut.matchesSpecializer(new String("foobar"), Object)).toBeTruthy();

        expect(uut.matchesSpecializer(new Number(1), Number)).toBeTruthy();
        expect(uut.matchesSpecializer(new Number(1), Object)).toBeTruthy();
        expect(uut.matchesSpecializer(new Number(1), String)).toBeFalsy();

        expect(uut.matchesSpecializer([], Array)).toBeTruthy();
        expect(uut.matchesSpecializer([], Object)).toBeTruthy();
        expect(uut.matchesSpecializer([], Number)).toBeFalsy();

        function Foo() {}
        Foo.prototype = Object.create(null);
        const inst = new Foo();
        expect(uut.matchesSpecializer(inst, Foo)).toBeTruthy();
        expect(uut.matchesSpecializer(inst, Object)).toBeFalsy();
    });

    test('works in for primitives', () => {
        expect(uut.matchesSpecializer(1, Number)).toBeTruthy();
        expect(uut.matchesSpecializer(1, Object)).toBeTruthy();
        expect(uut.matchesSpecializer(1, String)).toBeFalsy();

        expect(uut.matchesSpecializer("1", String)).toBeTruthy();
        expect(uut.matchesSpecializer("1", Object)).toBeTruthy();
        expect(uut.matchesSpecializer("1", Number)).toBeFalsy();

        expect(uut.matchesSpecializer(null, Number)).toBeFalsy();
        expect(uut.matchesSpecializer(null, String)).toBeFalsy();
        expect(uut.matchesSpecializer(null, Object)).toBeFalsy();

        expect(uut.matchesSpecializer(undefined, Number)).toBeFalsy();
        expect(uut.matchesSpecializer(undefined, String)).toBeFalsy();
        expect(uut.matchesSpecializer(undefined, Object)).toBeFalsy();
    });
});

describe('defgeneric', () => {
    test('methods get called appropriately', () => {
        expect(
            uut.defgeneric("testing1", "a", "b")
                .primary([Object, Object], (_, __) => 1)
                .fn(1,2)
        ).toEqual(1);

        expect(
            uut.defgeneric("testing1", "a", "b")
                .primary([Number, Number], (_, __) => 1)
                .fn(1,2)
        ).toEqual(1);

        expect(
            uut.defgeneric("testing1", "a", "b")
                .primary([Number, Number], (_, __) => 2)
                .primary([String, String], (_, __) => 1)
                .fn("1","2")
        ).toEqual(1);

        let firstCounts = 0;
        expect(
            uut.defgeneric("testing1", "a", "b")
                .primary([Number, Number], (_, __) => firstCounts += 1)
                .primary([String, String], (_, __) => firstCounts += 1)
                .fn("1","2")
        ).toEqual(1);
        expect(firstCounts).toEqual(1);

        let secondCounts = 0;
        expect(
            uut.defgeneric("testing1", "a", "b")
                .primary([Object, Object], (_, __) => secondCounts += 1)
                .primary([String, String], (_, __) => secondCounts += 1)
                .fn("1","2")
        ).toEqual(1);
        expect(secondCounts).toEqual(1);

        let thirdCounts = 0;
        expect(
            uut.defgeneric("testing1", "a", "b")
                .before([Object, Object], (_, __) => thirdCounts += 1)
                .primary([String, String], (_, __) => 'hi')
                .after([Object, String], (_, __) => thirdCounts += 1)
                .fn("1","2")
        ).toEqual('hi');
        expect(thirdCounts).toEqual(2);


    });
});
