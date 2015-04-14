Promise = require('bluebird')
imagePromise = require('./image-promise');
xhrJsonPromise = require('./xhr-json-promise');

function loadSprites(url) {
  return Promise.all([
      imagePromise(url + '.png'),
      xhrJsonPromise(url + '.json'),
  ]).then(function (things) {
    var image = things[0];
    var cutSheet = things[1].frames;

    return function drawSprite(ctx, name, dx, dy) {
      var spr = cutSheet[name];
      var w = spr.sourceSize.w;
      var h = spr.sourceSize.h;
      // Calculate the top left destination coordinates of the sprite
      var tl_dx = dx - w * spr.pivot.x;
      var tl_dy = dy - h * spr.pivot.y;
      ctx.drawImage(image,
          spr.frame.x, spr.frame.y, // source offset
          w, h,                     // source size
          tl_dx, tl_dy,             // destination position
          w, h                      // destination size
      );
    }
  });
}

module.exports = loadSprites;