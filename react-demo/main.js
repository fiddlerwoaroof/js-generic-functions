import React from 'react';
import ReactDOM from 'react-dom';
import * as gf from '../src/genfuns';
import '../src/genfun_formatter';

class Animal { 
  constructor() {
  }

}
class Dog extends Animal { }
class Cat extends Animal { }

const Animals = gf.defgeneric("Animals", "animaltorender")
  .primary([gf.Shape("animals")], ({ animals }) => Animals(animals))
  .primary([Array], animals => (<ul>{
    animals.map((a, idx) => Animals(a, idx), animals)
  }</ul>))
  .around([Animal], function (_, key) {
    return (<li {...{key}}>{this.call_next_method()}</li>);
  })
  .primary([Dog], dog => (<div>Dog</div>))
  .primary([Cat], cat => (<div>Cat</div>))
  .fn;

ReactDOM.render(
  <div>
    <h1>animal zoo</h1>
    <Animals animals={[new Dog(), new Cat(), new Dog(), new Dog()]} />
  </div>,
  document.querySelector('main'),
  () => {
    console.log('rendered');
  }
);