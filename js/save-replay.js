var Keyboard = require('./keyboard');

function saveReplay() {
  var textarea = document.getElementById('replayData');
  textarea.value = JSON.stringify(Keyboard.recordedEvents);
  textarea.style.display = 'block';
}

function hook() {
  document.getElementById('saveReplay').addEventListener('click', saveReplay);
}

exports.hook = hook;