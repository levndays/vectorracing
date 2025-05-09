// js/main.js

import { Game } from './core/game.js';

// This `gameInstance` variable will be local to this module's scope.
// If other modules (like abilities during their construction if they absolutely need it,
// which we are trying to avoid) need access to the game instance,
// you might consider a more structured way like a singleton pattern for the Game
// or passing the game instance around explicitly.
// For now, the abilities will get the game instance passed to their `activate` and `update` methods.

let gameInstance;

window.onload = () => {
    // All DOM elements should be available now.
    console.log("Document loaded. Initializing Game...");
    gameInstance = new Game();
    
    // If you need to expose the game instance globally for debugging (use with caution):
    // window.currentGame = gameInstance; 
};