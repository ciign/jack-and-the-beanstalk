export class UI {
  constructor() {
    this.scoreElement = document.getElementById('score-value');
    this.heightElement = document.getElementById('height-value');
    this.lastScore = null;
    this.lastHeight = null;
  }

  updateScore(score) {
    if (score === this.lastScore) return;
    this.lastScore = score;
    this.scoreElement.textContent = score;
  }

  updateHeight(height) {
    const h = Math.round(height);
    if (h === this.lastHeight) return;
    this.lastHeight = h;
    this.heightElement.textContent = h;
  }
}
