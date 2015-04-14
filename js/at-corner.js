module.exports = function atCorner(edge, x, y) {
  return (edge.type == 'h' && y == edge.y1 && (x == edge.x1 || x == edge.x2))
      || (edge.type == 'v' && x == edge.x1 && (y == edge.y1 || y == edge.y2));
};