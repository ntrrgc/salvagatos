var _ = require('lodash');
var Cat = require('./cat');

function Car(x, y, variable, maxValue) {
  this.x = x;
  this.y = y;
  this.variable = variable;
  this.maxValue = maxValue;
  this.history = [];
  this.width = 400;
  this.height = 30;
}

_.assign(Car.prototype, {
  update: function () {
    if (this.history.length == this.width) {
      this.history.shift();
    }
    this.history.push(this.variable());
  },

  draw: function (ctx) {
    ctx.strokeStyle = 'red';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.beginPath();
    var value = this.history[0];
    ctx.moveTo(this.x + i, this.y + (1 - (value / this.maxValue)) * this.height);
    for (var i = 1; i < this.history.length; i++) {
      var value = this.history[i];
      ctx.lineTo(this.x + i, this.y + (1 - (value / this.maxValue)) * this.height);
    }
    ctx.stroke();
  },
});

module.exports = Car;