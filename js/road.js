var _ = require('lodash');

function Road(car) {
  this.car = car;
}

_.assign(Road.prototype, {
  update: function () {
  },

  draw: function (ctx) {
    var top = 60;
    var left = 50;
    var width = 300;
    var height = 800;

    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'lightgray';

    ctx.fillRect(left, top, width, height);
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + height);
    ctx.moveTo(left + width, top);
    ctx.lineTo(left + width, top + height);
    ctx.stroke();
    ctx.closePath();

    // Draw lines
    ctx.fillStyle = 'white'
    var ll = 300; // length of line + space
    var l = 100; // length of line
    var offset = this.car.pos % ll;

    var pos = -ll + offset;
    while (pos < 900) {
      ctx.fillRect(190, pos, 20, l);
      pos += ll;
    }
  },
});

module.exports = Road;