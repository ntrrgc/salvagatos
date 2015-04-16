var _ = require('lodash');
var Cat = require('./cat');
var valueToRatio = require('./value-to-ratio');
var d3 = require('d3');

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
  this.shouldThink = true;

  //this.speed = 0;
  //this.shouldThink = false;

  this.plotFuzzySets();
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
      'no': {to: 0.3},
      'present': {from: 0.1, to: 0.7},
      'near': {from: 0.5}
    },
    'speed': {
      'slow': {to: 0.7},
      'fast': {from: 0.3}
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
    },
    {
      preconditions: [
        {sensor: 'speed', value: 'slow'},
        {sensor: 'cat', value: 'present'}
      ],
      action: [
        {effector: 'accelerator', value: 'still'}
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
      if (nearestCat.x < 30) {
        catNear -= 1 - valueToRatio(nearestCat.x, 0, 30);
      } else if (nearestCat.x > 300) {
        catNear -= valueToRatio(nearestCat.x, 300, 350);
      }
    }
    this.cat = catNear;

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
    if (!this.shouldThink) return;

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
    if (!this.shouldThink) return;

    function y(val) {
      return 190 - 30 * val;
    }
    function x(val) {
      return 400 * val;
    }

    if (this.debugTrapezoids) {
      ctx.save();
      ctx.translate(0.5, 0.5);

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
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(x(0), y(0))
      ctx.lineTo(x(1), y(0));
      ctx.stroke();
      ctx.closePath();

      ctx.restore();
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
  },

  plotFuzzySets: function() {
    var chart = d3.select('#fuzzy-sets');
    var margin = {
      left: 40, right: 10
    }
    var x = d3.scale.linear()
        .range([margin.left, chart.attr('width') - margin.left - margin.right])
        .domain([0, 1])

    function rangeToPath(range) {
      if (!('from' in range)) {
        return [
          {x: 0, y: 1},
          {x: range.to, y: 0}
        ]
      } else if (!('to' in range)) {
        return [
          {x: range.from, y: 0},
          {x: 1, y: 1}
        ]
      } else {
        return [
          {x: range.from, y: 0},
          {x: (range.from + range.to) / 2, y: 1},
          {x: range.to, y: 0},
        ]
      }
    }

    var chartHeight = 170
    var variables = [
      {name: 'speed', ranges: this.sensorLabels['speed']},
      {name: 'cat', ranges: this.sensorLabels['cat']},
      {name: 'accelerator', ranges:this.effectorLabels['accelerator']}
    ]

    chart.selectAll('g.variable')
        .data(variables)
        .enter()
        .append('g')
        .attr('class', 'variable')
        .each(function (d, i) {
          return plotVariable(d3.select(this), 60 + chartHeight * i, d.ranges, d.name);
        })

    function plotVariable(chart, y0, fuzzySetsRanges, name) {
      var colors = ['red', 'green', 'blue']
      var i = 0
      var fuzzySets = _.map(fuzzySetsRanges, function (range, setName) {
        return {
          setName: setName,
          range: range,
          path: rangeToPath(range),
          color: colors[i++ % 3]
        }
      });

      var height = 100;
      var y = d3.scale.linear()
          .range([y0 + height, y0])
          .domain([0, 1]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient('bottom')
          .ticks(5)
      var yAxis = d3.svg.axis()
          .scale(y)
          .ticks(3)
          .orient('left')
      var yAxis2 = d3.svg.axis()
          .scale(y)
          .ticks(3)
          .orient('right')

      chart.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + (y0 + height) + ')')
          .call(xAxis)
      chart.append('g')
          .attr('class', 'y axis')
          .attr('transform', 'translate(' + margin.left + ','
                                        + 0 + ')')
          .call(yAxis)
      chart.append('g')
          .attr('class', 'y axis')
          .attr('transform', 'translate(' + x(1) + ','
          + 0 + ')')
          .call(yAxis2)

      var line = d3.svg.line()
          .x(function (d) {
            return x(d.x);
          })
          .y(function (d) {
            return y(d.y);
          })

      var enter = chart.selectAll('path.line')
        .data(fuzzySets).enter()
      enter
        .append('path')
        .attr('class', 'line')
        .attr('d', function (d) {
          return line(d.path)
        })
        .style('stroke', function (d) {
          return d.color
        })
        .style('fill', 'none')
      enter
        .append('text')
          .attr('class', 'label')
          .attr('y', y0 - 20)
          .attr('x', function (d) {
            return x((d.path[0].x + d.path[d.path.length - 1].x) / 2);
          })
          .text(function (d) {
            return d.setName;
          })
    }
  }
});

module.exports = Car;