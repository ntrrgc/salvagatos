module.exports = function arrayToSet(array) {
  var set = {};
  for (i = 0; i < array.length; i++) {
    set[array[i]] = true;
  }
  return set;
}