import * as THREE from 'three';
import { Game } from './game';

let game;

function init() {
  const container = document.getElementById('game-container');
  game = new Game(container);
  game.start();
}

init();