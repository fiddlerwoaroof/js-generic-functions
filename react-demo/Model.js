export class Item {
  constructor(price) {
    this.price = price;
  }
  get tax() {
    throw "not implemented";
  }
  get subtotal() {
    return this.price + this.tax;
  }
}

export class AlcoholicBeverage extends Item {
  get tax() {
    return this.price * 0.25;
  }
}

export class NormalFood extends Item {
  get tax() {
    return 0;
  }
}

export class NonFood extends Item {
  get tax() {
    return this.price * 0.0825;
  }
}
