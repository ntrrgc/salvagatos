function valueToRatio(value, min, max) {
  if (value < min) {
    return 0;
  } else if (value > max) {
    return 1;
  } else {
    return (value - min) / (max - min);
  }
}

module.exports = valueToRatio;