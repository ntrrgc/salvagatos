var _ = require('lodash');

function Cat(car) {
  this.x = 0;
  this.y = car.pos + 250 + 350 * Math.random();
  this.speed = 1 + Math.random() * 2;
}

_.assign(Cat.prototype, {
  update: function () {
    this.x += this.speed;

    if (this.x > 800) {
      var i = this.game.gameNodes.indexOf(this);
      this.game.gameNodes.splice(i, 1)
    }
  },

  draw: function (ctx) {
    ctx.beginPath();
    drawSprite(ctx, 'cat', this.x + 50, 600 - (this.y - this.game.car.pos));
    ctx.closePath();
  },
});

module.exports = Cat;