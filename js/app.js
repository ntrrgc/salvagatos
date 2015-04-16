if (!window.requestAnimationFrame) {
  alert('Navegador patatoso: no soporta requestAnimationFrame.');
}


var _ = require('lodash');
var KeyCodes = require('./key-codes');
var Game = require('./game');
var Car = require('./car');
var Cat = require('./cat');
var CatSpawner = require('./cat-spawner');
var Road = require('./road');
var Plot = require('./plot');

var canvas = document.getElementById('game');

var game = new Game(canvas, {
  spritePath: 'build/sprites',
  profile: false,
  boundKeys: [
  ],
  
  startup: function () {
    this.addGameNode('car', new Car());
    this.addGameNode('road', new Road(this.car));
    this.addGameNode('catSpawner', new CatSpawner());

    var car = this.car;
    this.addGameNode('plotSpeed', new Plot(0, 10, function () {
      return car.speed;
    }, 0, 10));

    this.addGameNode('plotAccel', new Plot(0, 50, function () {
      return car.accel;
    }, -0.1, 0.05));

    this.addGameNode('plotCat', new Plot(0, 90, function () {
      return car.cat;
    }, 0, 1));
  },

  draw: function (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    this.road.draw(ctx);

    for (var i = 0; i < this.gameNodes.length; i++) {
      var node = this.gameNodes[i];
      if (node instanceof Cat) {
        node.draw(ctx);
      }
    }
    this.car.draw(ctx);

    this.plotSpeed.draw(ctx);
    this.plotAccel.draw(ctx);
    this.plotCat.draw(ctx);

    ctx.restore();
  },
});

game.load();

module.exports = game;