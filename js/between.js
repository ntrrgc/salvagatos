function between(value, a, b) {
  if (a < b) {
    return value >= a && value <= b;
  } else {
    return value >= b && value <= a;
  }
}

module.exports = between;