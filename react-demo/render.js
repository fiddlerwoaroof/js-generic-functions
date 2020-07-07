import React from "react";
import * as gf from "../src/genfuns";
import * as m from "./Model";

class Summary {
  constructor(wrapper = "span") {
    this.wrapper = wrapper;
  }
}
class Detail {}

const total_receipt = items =>
  items.reduce((acc, item) => acc + item.subtotal, 0);
const subtotal = items => items.reduce((acc, item) => acc + item.price, 0);
const total_tax = items => items.reduce((acc, item) => acc + item.tax, 0);

const display_money = amount => amount.toFixed(2);

const ItemLabel = ({ desc, amount, wrapper, ...restProps }) =>
  React.createElement(wrapper, restProps, [
    <span className="desc" key="0">
      {" "}
      {desc}:{" "}
    </span>,
    <span className="price" key="1">
      {display_money(amount)}
    </span>,
  ]);

export const Items = gf
  .defgeneric("Items", "animaltorender")
  .primary([gf.Shape("items", "view")], ({ items, view }) => Items(items, view))
  .primary([Array, Summary], (items, view) => (
    <>
      <ItemLabel
        desc="Subtotal"
        amount={subtotal(items)}
        wrapper={view.wrapper}
      />
      <ItemLabel desc="Tax" amount={total_tax(items)} wrapper={view.wrapper} />
      <ItemLabel
        desc="Total"
        amount={total_receipt(items)}
        wrapper={view.wrapper}
      />
    </>
  ))
  .primary([Array, Detail], items => (
    <ul>
      {items.map(
        (a, idx) => (
          <Item item={a} key={idx} />
        ),
        items
      )}
      <Items items={items} view={new Summary("li")} />
    </ul>
  )).fn;

export const Item = gf
  .defgeneric("Item", "itemtorender")
  .primary([gf.Shape("item")], ({ item }) => Item(item))
  .around([m.Item], function (_) {
    const [desc, price] = this.call_next_method();
    return <ItemLabel desc={desc} amount={price} wrapper="li" />;
  })
  .primary([m.NonFood], item => ["Non-food Item", item.price])
  .primary([m.NormalFood], item => ["Food", item.price])
  .primary([m.AlcoholicBeverage], item => ["Alcohol", item.price]).fn;

export const Receipt = ({ items }) => (
  <div>
    <h1>
      <Items {...{ items }} view={new Summary()} />
    </h1>
    <Items {...{ items }} view={new Detail()} />
  </div>
);
