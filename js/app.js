if (!window.requestAnimationFrame) {
  alert('Navegador patatoso: no soporta requestAnimationFrame.');
}

var phrases = [
    'Puede contener trazas de Hylak diciendo meh.',
    'Desarrollado en el lenguaje de programación favorito de codestation.'
];

var _ = require('lodash');
var KeyCodes = require('./key-codes');
var Game = require('./game');
var Car = require('./car');
var Cat = require('./cat');
var CatSpawner = require('./cat-spawner');
var Road = require('./road')

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

    ctx.restore();
  },
});

game.load();

module.exports = game;