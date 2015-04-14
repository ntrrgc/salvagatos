var Keyboard = require('./keyboard');
var resetGame = require('./reset-game');

function loadReplay() {
  var textarea = document.getElementById('replayData');
  var recordedEvents;
  try {
    recordedEvents = JSON.parse(textarea.value);
  } catch (ex) {
    alert('Bad format');
    return;
  }

  resetGame.resetGame();
  Keyboard.replay(recordedEvents);
}

function hook() {
  document.getElementById('loadReplay').addEventListener('click', loadReplay);
}

exports.hook = hook;