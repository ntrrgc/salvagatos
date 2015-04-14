var Promise = require('bluebird');

function xhrJsonPromise(url) {
  var xhr = new XMLHttpRequest;
  return new Promise(function (resolve, reject) {
    xhr.addEventListener('load', resolve);
    xhr.addEventListener('error', reject);
    xhr.open('GET', url);
    xhr.send(null);
  }).then(function () {
    return JSON.parse(xhr.responseText);
  });
}

module.exports = xhrJsonPromise;