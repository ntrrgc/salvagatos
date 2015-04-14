var between = require('./between');

function segmentIntersection(h_y, h_x1, h_x2, v_x, v_y1, v_y2) {
  /* Tells if a horizontal (h) and vertical (v) segments intersect */
  return (
    between(v_x, h_x1, h_x2) &&
    between(h_y, v_y1, v_y2)
  );
}

module.exports = segmentIntersection;