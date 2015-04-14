Promise = require('bluebird');

function imagePromise(url) {
  var image = new Image();
  return new Promise(function (resolve, reject) {
    image.addEventListener('load', resolve);
    image.addEventListener('error', reject);
    image.src = url;
  }).then(function () {
    return image;
  });
}

module.exports = imagePromise;