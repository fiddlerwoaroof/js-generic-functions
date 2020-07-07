import * as m from "./Model";
import * as r from "./render";

describe("Model", () => {
  test("base behavior", () => {
    const Foo = class extends m.Item {
      get tax() {
        return 1;
      }
    };

    expect(new Foo(1).subtotal).toEqual(2);
    expect(new Foo(2).subtotal).toEqual(3);
  });

  test("taxes", () => {
    expect(Math.floor(new m.NonFood(1).tax * 10000)).toEqual(825);
    expect(Math.floor(new m.AlcoholicBeverage(1).tax * 100)).toEqual(25);
    expect(Math.floor(new m.NormalFood(1).tax)).toEqual(0);
  });
});
