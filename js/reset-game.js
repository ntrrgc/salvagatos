var scheduler = require('./scheduler');

function resetGame() {
  scheduler.frameCount = 0;
  window.game.reset();
}

function hook() {
  document.getElementById('resetGame').addEventListener('click', resetGame);
}

exports.resetGame = resetGame;
exports.hook = hook;