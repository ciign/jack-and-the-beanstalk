export class UI {
  constructor() {
    this.scoreElement = document.getElementById('score-value');
    this.heightElement = document.getElementById('height-value');
  }

  updateScore(score) {
    this.scoreElement.textContent = score;
  }

  updateHeight(height) {
    this.heightElement.textContent = height.toFixed(1);
  }
}