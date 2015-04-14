var getTimestamp;

if (window.performance.now) {
  getTimestamp = function() { return window.performance.now(); };
} else {
  if (window.performance.webkitNow) {
    getTimestamp = function() { return window.performance.webkitNow(); };
  } else {
    getTimestamp = function() { return new Date().getTime(); };
  }
}

module.exports = getTimestamp;