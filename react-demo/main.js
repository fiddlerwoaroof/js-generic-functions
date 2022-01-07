import React from "react";
import ReactDOM from "react-dom";
import "../src/genfun_formatter";
import { Receipt } from "./render";
import * as m from "./Model";

import * as gf from "../src/genfuns";

const Editable = gf
  .defgeneric("Editable", "props")
  .around([Object], function (_) {
    return (
      <div style={{ display: "inline-block" }}>{this.call_next_method()} </div>
    );
  })
  .primary([gf.Shape("label", "htmlFor")], ({ label, htmlFor }) => (
    <label {...{ htmlFor }}>{label}</label>
  ))
  .primary(
    [gf.Shape("label", "htmlFor", "value")],
    function ({ value, onChange }) {
      return (
        <>
          {this.call_next_method()}
          {onChange ? null : <span> {value}</span>}
        </>
      );
    }
  )
  .primary(
    [gf.Shape("label", "htmlFor", "value", "onChange")],
    function ({ value, htmlFor, onChange }) {
      return (
        <>
          {this.call_next_method()}
          <input
            type="text"
            value={value}
            id={htmlFor}
            name={htmlFor}
            onChange={onChange}
          ></input>
        </>
      );
    }
  ).fn;

class Field extends React.Component {
  constructor(props) {
    super();
    this.state = { editing: false, val: props.value };
  }
  click() {
    this.setState(() => ({
      editing: !this.state.editing,
      val: this.state.val,
    }));
  }
  onChange(e) {
    const val = e.target.value;
    this.setState(() => ({ editing: true, val }));
  }
  render() {
    const editingProps = {};
    if (this.state.editing) {
      editingProps.onChange = this.onChange.bind(this);
    }
    return (
      <div>
        <Editable {...this.props} {...editingProps} value={this.state.val} />
        <button onClick={this.click.bind(this)}>Toggle</button>
      </div>
    );
  }
}

ReactDOM.render(
  <div>
    <Field label="the field" htmlFor="the-field" value="foo" />
    <Editable label="bazquuxes" htmlFor="bazquux" value="foo" display />
    <Editable label="bazquuxes" htmlFor="bazquux" value="foo" editable />
    <Receipt
      items={[
        new m.AlcoholicBeverage(11),
        new m.AlcoholicBeverage(12),
        new m.AlcoholicBeverage(13),
        new m.NormalFood(11),
        new m.NonFood(11),
        new m.AlcoholicBeverage(10),
      ]}
    />
  </div>,
  document.querySelector("main"),
  () => {
    console.log("rendered");
  }
);
