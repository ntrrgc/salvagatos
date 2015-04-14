var _ = require('lodash');

function Road(car) {
  this.car = car;
}

_.assign(Road.prototype, {
  update: function () {
    //this.offset = this.car.pos + 600;
  },

  draw: function (ctx) {
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'lightgray';

    ctx.fillRect(50, -30, 300, 840);
    ctx.strokeRect(50, -30, 300, 840);
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