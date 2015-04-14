var _ = require('lodash');
var Cat = require('./cat');

function CatSpawner() {
  this.tickCount = 0;
  this.catInterval = 500;
}

_.assign(CatSpawner.prototype, {

  update: function () {
    this.tickCount++;

    if (this.tickCount >= this.catInterval) {
      this.spawnCat();
      this.tickCount = 0;
    }
  },

  spawnCat: function () {
    var game = this.game;
    game.addGameNode(new Cat(game.car));
  },

  draw: function (ctx) {
  },
});

module.exports = CatSpawner;