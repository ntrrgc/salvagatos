var KeyCodes = require('./key-codes');
var arrayToSet = require('./array-to-set');
var scheduler = require('./scheduler');
var _ = require('lodash');

var arrowsStack = [];
var arrows = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0}
};
var fakeEventCache = {
  keyCode: 0,
  altKey: false,
  metaKey: false,
  ctrlKey: false,
  repeat: false,
  preventDefault: function () {},
};

function keyDown(e) {
  if (e.keyCode in this.mappedKeys && !e.altKey && !e.metaKey && !e.ctrlKey && !e.repeat) {
    e.preventDefault();

    if (!this.playing && this.recording) {
      this.recordedEvents.push({t: scheduler.frameCount, s: 'd',k: e.keyCode});
    }

    var newArrow = null;
    switch (e.keyCode) {
      case KeyCodes.DOM_VK_UP:
        newArrow = arrows.up;
        break;
      case KeyCodes.DOM_VK_DOWN:
        newArrow = arrows.down;
        break;
      case KeyCodes.DOM_VK_LEFT:
        newArrow = arrows.left;
        break;
      case KeyCodes.DOM_VK_RIGHT:
        newArrow = arrows.right
        break;
    }

    if (newArrow) {
      var repeatedPosition = arrowsStack.indexOf(newArrow);
      if (repeatedPosition != -1) {
        arrowsStack.splice(repeatedPosition, 1);
      }
      arrowsStack.unshift(newArrow);
      this.dirX = newArrow.x;
      this.dirY = newArrow.y;
    }

    this.keyboardState[e.keyCode] = true;
  }
}

function keyUp (e) {
  if (e.keyCode in this.mappedKeys && !e.altKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();

    if (!this.playing && this.recording) {
      this.recordedEvents.push({t: scheduler.frameCount, s: 'u',k: e.keyCode});
    }

    var arrow;
    switch (e.keyCode) {
      case KeyCodes.DOM_VK_UP:
        arrow = arrows.up;
        break;
      case KeyCodes.DOM_VK_DOWN:
        arrow = arrows.down;
        break;
      case KeyCodes.DOM_VK_LEFT:
        arrow = arrows.left;
        break;
      case KeyCodes.DOM_VK_RIGHT:
        arrow = arrows.right;
        break;
    }

    if (arrow) {
      arrowsStack.splice(arrowsStack.indexOf(arrow), 1);
      if (arrowsStack.length > 0) {
        var nextArrow = arrowsStack[0];
        this.dirX = nextArrow.x;
        this.dirY = nextArrow.y;
      } else {
        this.dirX = this.dirY = 0;
      }
    }

    this.keyboardState[e.keyCode] = false;
  }
}

window.Keyboard = exports;
_.assign(exports, {
  playing: false,
  recording: true,
  recordedEvents: [],
  nextEventToPlayIx: 0,

  hook: function (keys) {
    this.hookedKeys = keys;
    this.mappedKeys = arrayToSet(keys);
    document.addEventListener('keydown', keyDown.bind(this));
    document.addEventListener('keyup', keyUp.bind(this));
  },

  unhook: function () {
    document.removeEventListener('keydown', keyDown.bind(this));
    document.removeEventListener('keyup', keyUp.bind(this));
  },

  keyboardState: {},
  dirX: 0,
  dirY: 0,
  hookedKeys: [],

  isKeyPressed: function (key) {
    return this.keyboardState[key];
  },

  replay: function (events) {
    this.playing = true;
    this.recordedEvents = events;
    this.nextEventToPlayIx = 0;
    this.unhook();

    scheduler.frameCount = events[0].t;
  },
  
  update: function () {
    if (this.playing) {
      var fullyReplayed = true; /* will carry on being true if the for loop ends without breaking */

      for (; this.nextEventToPlayIx < this.recordedEvents.length; this.nextEventToPlayIx++) {
        var event = this.recordedEvents[this.nextEventToPlayIx];
        if (event.t <= scheduler.frameCount) {
          fakeEventCache.keyCode = event.k;
          if (event.s == 'u') {
            keyUp.call(this, fakeEventCache);
          } else {
            keyDown.call(this, fakeEventCache);
          }
        } else {
          fullyReplayed = false;
          break;
        }
      }

      if (fullyReplayed) {
        this.playing = false;
        this.hook(this.hookedKeys);
      }
    }
  }
});

