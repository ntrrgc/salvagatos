var _ = require('lodash');
var Cat = require('./cat');
var valueToRatio = require('./value-to-ratio');

function Car(x, y, variable, minValue, maxValue) {
  this.x = x;
  this.y = y;
  this.variable = variable;
  this.minValue = minValue;
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
    var self = this;
    function y(value) {
      return self.y + self.height * (1 - valueToRatio(value, self.minValue, self.maxValue));
    }
    ctx.save();
    ctx.translate(0.5, 0.5);

    // Background
    ctx.fillStyle = '#EEEEEE';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // X axis
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(this.x, y(0));
    ctx.lineTo(this.x + this.width, y(0));
    ctx.stroke();
    ctx.closePath();

    // Line
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    var value = this.history[0];
    ctx.moveTo(this.x + i, y(value));
    for (var i = 1; i < this.history.length; i++) {
      value = this.history[i];
      ctx.lineTo(this.x + i, y(value));
    }
    ctx.stroke();

    ctx.restore();
  },
});

module.exports = Car;