var _ = require('lodash');
var Cat = require('./cat');

function valueToRatio(value, min, max) {
  if (value < min) {
    return 0;
  } else if (value > max) {
    return 1;
  } else {
    return (value - min) / (max - min);
  }
}

function Car() {
  this.pos = 100;
  this.speed = 5;
  this.maxSpeed = 10;
  this.accel = 0.01;
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

  rules: [
    {
      preconditions: [
        {sensor: 'speed', value: 'slow'},
        {sensor: 'cat', value: 'no'}
      ],
      action: [
        {effector: 'accelerator', value: 1}
      ]
    },
    {
      preconditions: [
        {sensor: 'speed', value: 'fast'}
      ],
      action: [
        {effector: 'accelerator', value: 0}
      ]
    },
    {
      preconditions: [
        {sensor: 'cat', value: 'near'}
      ],
      action: [
        {effector: 'accelerator', value: -1}
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

  think: function () {
    // Ponderate rules
    var self = this;
    var readings = this.readSensors();
    var rule = _.max(this.rules, function (rule) {
      return self.calcWeightRule(readings, rule);
    });
    var belief = self.calcWeightRule(readings, rule)

    for (var i = 0; i < rule.action.length; i++) {
      var action = rule.action[i];

      this.modifyEffector(action.effector, action.value);
    }
  },

  modifyEffector: function(effector, value) {
    if (value > 0) {
      this.accel = value * 0.05;
    } else {
      this.accel = value * 0.1;
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
  },
});

module.exports = Car;