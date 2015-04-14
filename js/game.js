var _ = require('lodash');
var loadSprites = require('./sprites');
var imagePromise = require('./image-promise')
var scheduler = require('./scheduler');
var Keyboard = require('./keyboard');

function Game(canvas, options) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.profile = false;
  this.gameNodes = [];
  window.game = this;

  _.assign(this, options);
  _.defaults(this, {
    profile: false,
    spritePath: 'sprites',
    boundKeys: [],
    handleCrash: function (error) {
      throw error;
    },
  });
}

_.assign(Game.prototype, {

  load: function () {
    var self = this;
    loadSprites(this.spritePath)
        .then(function (drawSpriteFn) {
          window.drawSprite = drawSpriteFn;
        })
        .then(this.earlyStartup.bind(this))
        .done();
  },

  earlyStartup: function () {
    Keyboard.hook(this.boundKeys);
    this.startup();
    scheduler.setUp(this);
  },

  addGameNode: function (name, node) {
    if (!node) {
      node = name;
      name = null;
    }

    this.gameNodes.push(node);
    node.game = this;
    if (name) {
      this[name] = node;
    }
    return node;
  },

  startup: function () {
  },

  update: function () {
    for (var i = 0; i < this.gameNodes.length; i++) {
      var node = this.gameNodes[i];
      node.update();
    }
  },

  draw: function (ctx) {

  },

  reset : function () {
    this.gameNodes.length = 0;
    this.startup();
  }

});

module.exports = Game;