var _ = require('lodash');
var getTimestamp = require('./get-timestamp');
var Keyboard = require('./keyboard');

var lastFrameTime = getTimestamp();

var tryDrawObjectsBound = null;
var tryUpdateObjectsBound = null;
var updateObjectsInterval = null;

function tryDrawObjects(game) {
  try {
    if (!game.crashed) {
      var startTime = +new Date();
      //requestAnimationFrame(tryDrawObjectsBound);

      if (this.profile) {
        var thisFrameTime = getTimestamp();
        if (thisFrameTime - lastFrameTime > 17) {
          console.log('lag: %d', thisFrameTime - lastFrameTime);
        }
        lastFrameTime = thisFrameTime;
      }

      Keyboard.update();

      game.update();
      game.draw(game.ctx);
      this.frameCount++;

      var endTime = +new Date();
      setTimeout(tryDrawObjectsBound, Math.max(0, 16 - (endTime - startTime)));
    }
  } catch (error) {
    game.crashed = true;
    game.handleCrash(error);
  }
}

function tryUpdateObjects(game) {
  try {
    if (!game.crashed) {
      game.update();
    } else {
      clearInterval(updateObjectsInterval);
    }
  } catch (error) {
    game.crashed = true;
    game.handleCrash(error);
  }
}

_.assign(exports, {

  frameCount: 0,

  setUp: function (game) {
    window.scheduler = this;
    this.crashed = false;

    tryDrawObjectsBound = tryDrawObjects.bind(this, game);
    tryUpdateObjectsBound = tryUpdateObjects.bind(this, game);

    tryDrawObjectsBound();
    //updateObjectsInterval = setInterval(tryUpdateObjectsBound, 17);
  }

});