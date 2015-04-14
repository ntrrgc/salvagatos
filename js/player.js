var _ = require('lodash');
var clamp = require('./clamp');
var inPolygonEdges = require('./in-polygon-edges');
var insidePolygon = require('./inside-polygon');
var collisionPointWithEdges = require('./collision-point-edges');
var indexOfEdgeWithPoint = require('./index-of-edge-with-point');
var atCorner = require('./at-corner');
var cornerNeighbor = require('./corner-neighbor');
var breakerCollision = require('./breaker-collision');
var Keyboard = require('./keyboard');
var KeyCodes = require('./key-codes');

var collisionCache = {};

var POSITION_UP = 1,
    POSITION_DOWN = 2,
    POSITION_LEFT = 4,
    POSITION_RIGHT = 8;

var LOOKING_DOWN = 1,
    LOOKING_LEFT = 2,
    LOOKING_UP = 3,
    LOOKING_RIGHT = 4;

function Player(character, ice) {
  window.player = this;
  this.character = character;
  this.x = 500;
  this.y = 300;

  this.ice = ice;
  this.edges = ice.edges;

  this.startingEdgeIndex = indexOfEdgeWithPoint(this.edges, this.x, this.y);

  this.breakerMode = false; /* breaking the ice */
  this.breakerPath = [];
  this.breakerOriginX = null;
  this.breakerOriginY = null;
  this.breakerOriginOrientation = null; /* 'v' or 'h' */
  this.breakerOrientation = null; /* 'v' or 'h' */
  this.breakerDirection = 0; /* 1 or -1 */
  this.breakerSegmentOriginX = null;
  this.breakerSegmentOriginY = null;

  this.speed = 3;
  this.retreatSpeed = 6;

  // This variable is used to not start breaking again when the current breaker
  // reaches an edge: the player will need to lift space and press it again.
  this.spaceKeyBackoff = false;
}

_.assign(Player.prototype, {

  getStartingEdge: function () {
    return this.edges[this.startingEdgeIndex];
  },

  getCurrentOrientation: function () {
    if (!this.breakerMode) {
      return this.getStartingEdge().type;
    } else {
      return this.breakerOrientation;
    }
  },

  update: function () {
    var dirX = Keyboard.dirX;
    var dirY = Keyboard.dirY;

    if (dirX != 0 || dirY != 0) {
      this.move(dirX, dirY);
    }

    if (!Keyboard.isKeyPressed(KeyCodes.DOM_VK_SPACE)) {
      this.spaceKeyBackoff = false;
    }

    if (Keyboard.isKeyPressed(KeyCodes.DOM_VK_SPACE) && !this.spaceKeyBackoff) {
      this.advanceBreaking();
    } else if (this.breakerMode) {
      this.retreatBreaking();
    }
  },

  draw: function (ctx) {
    if (this.startingEdgeIndex != -1) {
      var edge = this.edges[this.startingEdgeIndex];
      ctx.beginPath()
      ctx.moveTo(edge.x1, edge.y1)
      ctx.lineTo(edge.x2, edge.y2)
      ctx.strokeStyle = 'limegreen'
      ctx.stroke()
    }

    if (this.breakerMode) {
      this.drawBreaker(ctx);
    }

    var orientation = this.whereIsLooking();
    drawSprite(ctx, 'flan' + orientation.toString(), this.x, this.y);
  },

  whereIsLooking: function () {
    if (this.breakerMode) {
      if (this.breakerOrientation == 'v') {
        if (this.breakerDirection == -1) {
          return LOOKING_UP;
        } else {
          return LOOKING_DOWN;
        }
      } else {
        if (this.breakerDirection == -1) {
          return LOOKING_LEFT;
        } else {
          return LOOKING_RIGHT;
        }
      }
    } else {
      var currentEdge = this.edges[this.startingEdgeIndex];
      var meanX = (currentEdge.x1 + currentEdge.x2) >> 1;
      var meanY = (currentEdge.y1 + currentEdge.y2) >> 1;

      if (currentEdge.type == 'v') {
        if (insidePolygon(this.edges, meanX + 1, meanY, false)) {
          return LOOKING_RIGHT;
        } else {
          return LOOKING_LEFT;
        }
      } else {
        if (insidePolygon(this.edges, meanX, meanY + 1 , false)) {
          return LOOKING_DOWN;
        } else {
          return LOOKING_UP;
        }
      }
    }
  },

  move: function (dirX, dirY) {
    if (this.breakerMode === false) {
      this.moveAroundEdges(dirX, dirY);
    } else if (!this.selfCollision) {
      this.rotateBreaker(dirX, dirY);
    }
  },

  moveAroundEdges: function(dirX, dirY) {
    var edge = this.edges[this.startingEdgeIndex];

    var minX = (edge.x1 < edge.x2 ? edge.x1 : edge.x2);
    var maxX = (edge.x1 < edge.x2 ? edge.x2 : edge.x1);
    var minY = (edge.y1 < edge.y2 ? edge.y1 : edge.y2);
    var maxY = (edge.y1 < edge.y2 ? edge.y2 : edge.y1);

    if (dirX != 0 && edge.type == 'h') {
      // Horizontal movement, in the same edge
      this.x = clamp(this.x + dirX * this.speed, minX, maxX);
    } else if (dirY != 0 && edge.type == 'v') {
      // Vertical movement, in the same edge
      this.y = clamp(this.y + dirY * this.speed, minY, maxY);
    } else if (dirX != 0 && edge.type == 'v'
        && (this.x == minX || this.x == maxX))
    {
      // Jump to horizontal edge
      var newEdgeIx = indexOfEdgeWithPoint(this.edges, this.x + dirX, this.y);
      if (newEdgeIx == -1) {
        /* Illegal movement */
        return;
      }

      this.startingEdgeIndex = newEdgeIx;
      var edge = this.edges[newEdgeIx];
      var minX = (edge.x1 < edge.x2 ? edge.x1 : edge.x2);
      var maxX = (edge.x1 < edge.x2 ? edge.x2 : edge.x1);

      this.x = clamp(this.x + dirX * this.speed, minX, maxX);
    } else if (dirY != 0 && edge.type == 'h'
        && (this.y == minY || this.y == maxY))
    {
      // Jump to vertical edge
      var newEdgeIx = indexOfEdgeWithPoint(this.edges, this.x, this.y + dirY);
      if (newEdgeIx == -1) {
        /* Illegal movement */
        return;
      }

      this.startingEdgeIndex = newEdgeIx;

      var edge = this.edges[newEdgeIx];
      var minY = (edge.y1 < edge.y2 ? edge.y1 : edge.y2);
      var maxY = (edge.y1 < edge.y2 ? edge.y2 : edge.y1);

      this.y = clamp(this.y + dirY * this.speed, minY, maxY);
    }
  },

  getBreakerAllowedDirections: function () {
    var currentEdge = this.edges[this.startingEdgeIndex];
    var mask = 0;
    if (atCorner(currentEdge, this.x, this.y)) {
      /* Check every direction. Look for filled area, edges are not enough. */
      if (insidePolygon(this.edges, this.x, this.y - 1) &&
          !inPolygonEdges(this.edges, this.x, this.y - 1)) {
        mask |= POSITION_UP;
      }
      if (insidePolygon(this.edges, this.x, this.y + 1) &&
          !inPolygonEdges(this.edges, this.x, this.y + 1)) {
        mask |= POSITION_DOWN;
      }
      if (insidePolygon(this.edges, this.x - 1, this.y) &&
          !inPolygonEdges(this.edges, this.x - 1, this.y)) {
        mask |= POSITION_LEFT;
      }
      if (insidePolygon(this.edges, this.x + 1, this.y) &&
          !inPolygonEdges(this.edges, this.x + 1, this.y)) {
        mask |= POSITION_RIGHT;
      }
    } else {
      /* Check perpendicular directions */
      if (currentEdge.type == 'h') {
        if (insidePolygon(this.edges, this.x, this.y - 1)) {
          mask |= POSITION_UP;
        }
        if (insidePolygon(this.edges, this.x, this.y + 1)) {
          mask |= POSITION_DOWN;
        }
      } else {
        if (insidePolygon(this.edges, this.x - 1, this.y)) {
          mask |= POSITION_LEFT;
        }
        if (insidePolygon(this.edges, this.x + 1, this.y)) {
          mask |= POSITION_RIGHT;
        }
      }
    }
    return mask;
  },

  launchBreaker: function () {
    var allowedDirections = this.getBreakerAllowedDirections();
    if (allowedDirections == 0) {
      return;
    }
    
    this.breakerMode = true;
    this.breakerPath.push(0);

    var startingEdge = this.edges[this.startingEdgeIndex];

    this.breakerOriginOrientation = this.getBreakerOriginOrientation();
    this.breakerOriginX = this.x;
    this.breakerOriginY = this.y;
    this.breakerDirection = this.getBreakerOriginDirection(
        this.breakerOriginOrientation,
        this.breakerOriginX,
        this.breakerOriginY
    );

    if (startingEdge.type == this.breakerOriginOrientation) {
      /* Launched from a corner.
       * Make sure startingEdge is always perpendicular to the breaker.
       * If the breaker has an orientation parallel the edge, then choose
       * a (needly perpendicular) neighbor edge in which the player is also
       * located.*/
      this.startingEdgeIndex = cornerNeighbor(this.edges, this.startingEdgeIndex, this.x, this.y);
     }

    this.breakerOrientation = this.breakerOriginOrientation;
    this.breakerSegmentOriginX = this.x;
    this.breakerSegmentOriginY = this.y;
  },

  getBreakerOriginOrientation: function () {
    var startingEdge = this.edges[this.startingEdgeIndex];
    
    if ((this.x == startingEdge.x1 && this.y == startingEdge.y1)
        || (this.x == startingEdge.x2 && this.y == startingEdge.y2))
    {
      /* The player is at a corner. Use the arrow keys to disambiguate. */
      if (Keyboard.dirY) {
        return 'v';
      } else if (Keyboard.dirX) {
        return 'h';
      } else {
        /* Use the opposite of the current edge as default */
        return (startingEdge.type == 'h' ? 'v' : 'h');
      }
    } else {
      /* No ambiguity: Always part perpendicular to the edge. */
      return (startingEdge.type == 'h' ? 'v' : 'h');
    }
  },

  getBreakerOriginDirection: function (orientation, x, y) {
    if (orientation == 'h') {
      if (insidePolygon(this.edges, x + 1, y) &&
          !inPolygonEdges(this.edges, x + 1, y)) {
        return 1;
      } else if (insidePolygon(this.edges, x - 1, y) &&
          !inPolygonEdges(this.edges, x - 1, y)) {
        return -1;
      } else {
        throw new Error("Invalid position. Are you sure the player is on an edge?");
      }
    } else {
      if (insidePolygon(this.edges, x, y + 1) &&
          !inPolygonEdges(this.edges, x, y + 1)) {
        return 1;
      } else if (insidePolygon(this.edges, x, y - 1) &&
          !inPolygonEdges(this.edges, x, y - 1)) {
        return -1;
      } else {
        throw new Error("Invalid position. Are you sure the player is on an edge?");
      }
    }
  },

  advanceBreaking: function () {
    if (this.breakerPath.length == 0) {
      if (!this.launchBreaker()) {
        /* Can't launch */
        return;
      }
    }

    var increment = this.breakerDirection * this.speed;
    var newX, newY;

    if (this.breakerOrientation == 'h') {
      newX = this.x + increment;
      newY = this.y;
    } else {
      newX = this.x;
      newY = this.y + increment;
    }

    var collisionWithEdge = false;
    this.selfCollision = false;
    var collision = collisionPointWithEdges(collisionCache,
        this.edges, this.breakerOrientation,
        this.breakerSegmentOriginX, this.breakerSegmentOriginY,
        newX, newY,
        true, this.breakerOriginX, this.breakerOriginY /* ignore collisions in this point */
    );
    if (collision.found) {
      collisionWithEdge = true;
    } else if (this.breakerPath[this.breakerPath.length - 1] != 0) {
      /* Check for collisions within the path */
      /* This is not checked if the last path segment is zero-length. Otherwise the player
       * could not rotate because it would collide with the immediately previous segment. */
      collision = breakerCollision(collisionCache,
          this.breakerOriginOrientation, this.breakerOriginX, this.breakerOriginY, this.breakerPath,
          this.breakerOrientation, this.x, this.y, newX, newY
      );
      this.selfCollision = collision.found;
    }

    if (collision.found) {
      if (this.breakerOrientation == 'h') {
        increment = collision.x - this.x;
        newX = this.x + increment;
      } else {
        increment = collision.y - this.y;
        newY = this.y + increment;
      }
    }

    this.x = newX;
    this.y = newY;
    this.breakerPath[this.breakerPath.length - 1] += increment;

    if (collisionWithEdge) {
      this.ice.breakPolygon(this.breakerPath, this.breakerOriginOrientation,
          this.startingEdgeIndex, collision.edgeIndex,
          this.breakerOriginX, this.breakerOriginY);
      // Update starting segment (the polygon has been cropped, so the old index is not valid)
      this.startingEdgeIndex = indexOfEdgeWithPoint(this.edges,
          this.x, this.y);

      this.breakerPath.splice(0, this.breakerPath.length);
      this.breakerMode = false;
      this.spaceKeyBackoff = true;
    }
  },

  rotateBreaker: function (dirX, dirY) {
    if (this.breakerPath[this.breakerPath.length - 1] == 0) {
      /* Don't allow zero-length segments. */
      return;
    }

    if (dirX !=0 && this.breakerOrientation == 'v') {
      this.breakerOrientation = 'h';
      this.breakerPath.push(0);
      this.breakerDirection = dirX;

      this.breakerSegmentOriginX = this.x;
      this.breakerSegmentOriginY = this.y;
    } else if (dirY !=0 && this.breakerOrientation == 'h') {
      this.breakerOrientation = 'v';
      this.breakerPath.push(0);
      this.breakerDirection = dirY;

      this.breakerSegmentOriginX = this.x;
      this.breakerSegmentOriginY = this.y;
    }
  },

  retreatBreaking: function () {
    var decrease = this.retreatSpeed;

    while (this.breakerPath.length > 0) {
      var oldSegmentLength = this.breakerPath[this.breakerPath.length - 1];
      var partialDecrease = Math.min(Math.abs(oldSegmentLength), decrease);

      if (this.breakerOrientation == 'h') {
        this.x -= this.breakerDirection * partialDecrease;
      } else {
        this.y -= this.breakerDirection * partialDecrease;
      }

      if (partialDecrease == decrease) {
        /* This segment is long enough */
        this.breakerPath[this.breakerPath.length - 1] -= this.breakerDirection * decrease;

        /* Do not retreat anymore for now */
        return;
      } else {
        /* Removing this edge */
        this.breakerPath.pop();
        if (this.breakerPath.length > 0) {
          /* Keep removing older segments */
          decrease -= oldSegmentLength;
          /* Change orientation */
          this.breakerOrientation = (this.breakerOrientation == 'h' ? 'v' : 'h');
          /* Recover direction */
          this.breakerDirection = (this.breakerPath[this.breakerPath.length - 1] < 0 ? -1 : 1);
        }
      }
    }

    /* Breaker aborted */
    this.breakerMode = false;
  },

  drawBreaker: function (ctx) {
    var x = this.breakerOriginX;
    var y = this.breakerOriginY;
    var orientation = this.breakerOriginOrientation;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.breakerOriginX, this.breakerOriginY);
    for (var i = 0; i < this.breakerPath.length; i++) {
      if (orientation == 'h') {
        x += this.breakerPath[i];
        orientation = 'v';
      } else {
        y += this.breakerPath[i];
        orientation = 'h';
      }
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
});

module.exports = Player;