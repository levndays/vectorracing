// js/main.js

import { Game } from './core/game.js';

let gameInstance;

// Use DOMContentLoaded for faster initialization if assets aren't critical for initial JS setup
document.addEventListener('DOMContentLoaded', () => {
    console.log("Document content loaded. Initializing Game...");
    gameInstance = new Game();
    
    // If you need to expose the game instance globally for debugging (use with caution):
    // window.currentGame = gameInstance; 
});