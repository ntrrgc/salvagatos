var _ = require('lodash');
var Cat = require('./cat');
var valueToRatio = require('./value-to-ratio');

function intersection() {

}

function Car() {
  this.pos = 100;
  this.speed = 5;
  this.maxSpeed = 6;
  this.accel = 0.0;

  this.debug = true;
  this.debugTrapezoids = true;
  this.debugShape = false;
  this.debugPoints = false;
  this.debugCentroid = true;
}

_.assign(Car.prototype, {
  update: function () {
    this.think();

    this.speed += this.accel;
    if (this.speed < 0) {
      this.speed = 0;
    }

    this.pos += this.speed
  },

  sensorLabels: {
    'cat': {
      'no': {to: 0.2},
      'present': {from: 0.1, to: 0.7},
      'near': {from: 0.5}
    },
    'speed': {
      'slow': {to: 0.3},
      'mid': {from: 0.2, to: 0.8},
      'fast': {from: 0.7}
    }
  },

  effectorLabels: {
    'accelerator': {
      // 0 is accel = -0.1
      // 0.66 is accel = 0
      // 1 is accel = 0.05
      'brake': {to: 0.66},
      'still': {from: 0.46, to: 0.86},
      'accelerate': {from: 0.66}
    }
  },

  rules: [
    {
      preconditions: [
        {sensor: 'speed', value: 'slow'},
        {sensor: 'cat', value: 'no'}
      ],
      action: [
        {effector: 'accelerator', value: 'accelerate'}
      ]
    },
    {
      preconditions: [
        {sensor: 'speed', value: 'mid'},
        {sensor: 'cat', value: 'present'}
      ],
      action: [
        {effector: 'accelerator', value: 'still'}
      ]
    },
    {
      preconditions: [
        {sensor: 'speed', value: 'fast'},
        {sensor: 'cat', value: 'no'}
      ],
      action: [
        {effector: 'accelerator', value: 'still'}
      ]
    },
    {
      preconditions: [
        {sensor: 'cat', value: 'near'}
      ],
      action: [
        {effector: 'accelerator', value: 'brake'}
      ]
    }
  ],
  
  readSensors: function () {
    var self = this;
    var speed = this.speed / this.maxSpeed;
    if (speed > 1) {
      speed = 1;
    }
    var nearestCat = _.min(_.filter(this.game.gameNodes, function (node) {
      return node instanceof Cat && node.x <= 350 && node.y - self.pos < 700;
    }), function (cat) {
      return cat.y;
    });

    var catNear;
    if (!(nearestCat instanceof Cat)) {
      catNear = 0;
    } else {
      var inverseDistance = 600 - (nearestCat.y - this.pos);
      catNear = valueToRatio(inverseDistance, 0, 600);
    }

    return {
      speed: speed,
      cat: catNear
    }
  },

  valueInLabel: function (sensor, value, label) {
    var range = this.sensorLabels[sensor][label];
    return this.valueInRange(range, value);
  },

  valueInRange: function (range, value) {
    if ('from' in range && 'to' in range) {
      if (value < range.from || value > range.to) {
        return 0;
      } else {
        var peak = range.from + (range.to - range.from) / 2;
        if (value < peak) {
          return (value - range.from) / (peak - range.from)
        } else {
          return 1 - (value - peak) / (range.to - peak);
        }
      }
    } else if ('to' in range) {
      if (value < 0) {
        return 1;
      } else if (value > range.to) {
        return 0;
      } else {
        return 1 - (value / range.to);
      }
    } else if ('from' in range) {
      if (value > 1) {
        return 1;
      } else if (value < range.from) {
        return 0;
      } else {
        return (value - range.from) / (1 - range.from);
      }
    }
  },

  calcWeightRule: function (readings, rule) {
    var self = this;
    return _.reduce(rule.preconditions, function (result, precond) {
      return Math.min(result, self.valueInLabel(precond.sensor, readings[precond.sensor], precond.value));
    }, 1);
  },

  debugWeightedRules: function (weightedRules) {
    return _.map(weightedRules, function (rule) {
      return rule.output + ': ' + rule.weight * 100 + '%';
    }).join(', ');
  },

  think: function () {
    // Ponderate rules
    var self = this;
    var readings = this.readSensors();

    for (var effector in this.effectorLabels) {
      var weightedActions = _.map(this.rules, function (rule) {
        return {
          weight: self.calcWeightRule(readings, rule),
          output: _.find(rule.action, function (action) {
            return action.effector == effector;
          }).value
        }
      });

      var centroid = self.calcCentroid(weightedActions, this.effectorLabels[effector]);
      self.modifyEffector(effector, centroid);
    }
  },

  calcCentroid: function (weightedActions, sets) {
    function ratioInRange(ratio, min, max) {
      return min + (max - min) * ratio;
    }

    var trapezoids = _.map(weightedActions, function (action) {
      var outputRange = sets[action.output];
      if (!('from' in outputRange)) {
        var plainEndX = ratioInRange(1 - action.weight, 0, outputRange.to)
        return [
          {x: 0, y: action.weight},
          {x: plainEndX, y: action.weight},
          {x: outputRange.to, y: 0}
        ];
      } else if (!('to' in outputRange)) {
        var plainStartX = ratioInRange(action.weight, outputRange.from, 1)
        return [
          {x: outputRange.from, y: 0},
          {x: plainStartX, y: action.weight},
          {x: 1, y: action.weight}
        ];
      } else {
        var halfX = (outputRange.from + outputRange.to) / 2;
        var plainStartX = ratioInRange(action.weight, outputRange.from, halfX);
        var plainEndX = ratioInRange(1 - action.weight, halfX, outputRange.to);
        return [
          {x: outputRange.from, y: 0},
          {x: plainStartX, y: action.weight},
          {x: plainEndX, y: action.weight},
          {x: outputRange.to, y: 0}
        ]
      }
    });
    this.trapezoids = trapezoids;

    var segments = _.reduce(trapezoids, function (segments, points) {
      for (var i = 0; i < points.length - 1; i++) {
        var a = points[i];
        var b = points[i + 1];
        if (a.x != b.x) {
          segments.push({x1: a.x, y1: a.y, x2: b.x, y2: b.y});
        }
      }
      return segments;
    }, []);

    var xPoints = [];
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      xPoints.push(segment.x1);
      xPoints.push(segment.x2);
    }

    for (var i = 0; i < segments.length; i++) {
      var a = segments[i];
      for (var j = 0; j < segments.length; j++) {
        var b = segments[j];
        if (a != b) {
          if (a.x2 < b.x1 && a.y1 > 0) {
            var am = (a.y2 - a.y1) / (a.x2 - a.x1);
            var an = a.y1 - am * a.x1;

            var bm = (b.y2 - b.y1) / (b.x2 - b.x1);
            var bn = b.y1 - bm * b.x1;

            if (am - bm != 0) {
              var intersectionX = (bn - an) / (am - bm);
              xPoints.push(intersectionX);
            }
          }
        }
      }
    }
    xPoints.sort();
    xPoints = _.uniq(xPoints, true);
    this.xPoints = xPoints;

    function cutTrapezoid(trapezoid, x) {
      for (var i = 0; i < trapezoid.length - 1; i++) {
        var segment = {
          x1: trapezoid[i].x, y1: trapezoid[i].y,
          x2: trapezoid[i + 1].x, y2: trapezoid[i + 1].y
        };
        if (x >= segment.x1 && x <= segment.x2 && segment.x2 != segment.x1) {
          var m = (segment.y2 - segment.y1) / (segment.x2 - segment.x1);
          var n = segment.y1 - m * segment.x1;
          var y = m * x + n;
          if (isNaN(y)) {
            debugger;
          }
          return y;
        }
      }
      return 0; // not found
    }

    var self = this;
    var shape = _.map(xPoints, function (xPoint) {
      return {
        x: xPoint,
        y: _.max(_.map(trapezoids, function (trapezoid) {
          return cutTrapezoid(trapezoid, xPoint);
        }))
      }
    });
    this.shape = shape;

    var centroid = _.sum(_.map(shape, function (p) {
      return p.x * p.y;
    })) / _.sum(_.map(shape, function (p) {
          return p.y;
        }));
    this.centroid = centroid;

    return centroid;
  },

  modifyEffector: function(effector, value) {
    if (!isNaN(value)) {
      this.accel = value * 0.15 - 0.10;
    }
  },

  draw: function (ctx) {
    ctx.strokeStyle = 'red';
    ctx.fillStyle = '#FAEBD7';
    ctx.beginPath();
    ctx.rect(200, 600, 100, 185);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    if (this.debug) {
      this.drawDebug(ctx)
    }
  },

  drawDebug: function (ctx) {
    function y(val) {
      return 190 - 30 * val;
    }
    function x(val) {
      return 400 * val;
    }

    if (this.debugTrapezoids) {
      var colors = ['blue', 'green', 'red']
      for (var i = 0; i < this.trapezoids.length; i++) {
        var trapezoid = this.trapezoids[i];

        ctx.strokeStyle = colors[i];
        ctx.beginPath();
        ctx.moveTo(x(trapezoid[0].x), y(trapezoid[0].y))
        for (var j = 0; j < trapezoid.length; j++) {
          var point = trapezoid[j];
          ctx.lineTo(x(point.x), y(point.y));
        }
        ctx.stroke();
        ctx.closePath();
      }
    }

    if (this.debugShape) {
      ctx.strokeStyle = 'black';
      var shape = this.shape;
      ctx.beginPath();
      ctx.moveTo(x(shape[0].x), 2 + y(shape[0].y))
      for (var j = 0; j < shape.length; j++) {
        var point = shape[j];
        ctx.lineTo(x(point.x), 2 + y(point.y));
      }
      ctx.stroke();
      ctx.closePath();
    }

    if (this.debugPoints) {
      ctx.strokeStyle = 'black';
      for (var i = 0; i < this.xPoints.length; i++) {
        var point = this.xPoints[i];
        ctx.beginPath();
        ctx.moveTo(x(point), y(0));
        ctx.lineTo(x(point), y(-1));
        ctx.stroke();
        ctx.closePath();
      }
    }

    if (this.debugCentroid) {
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(x(this.centroid), y(0));
      ctx.lineTo(x(this.centroid), y(-1));
      ctx.stroke();
      ctx.closePath();
    }
  }
});

module.exports = Car;