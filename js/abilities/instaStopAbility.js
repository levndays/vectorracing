// js/abilities/instaStopAbility.js

import { AbilityBase } from './abilityBase.js';

export class InstaStopAbility extends AbilityBase {
    constructor() {
        super("Insta-Stop", "Immediately halts all movement.", "🛑", 1); // Name, Desc, Icon, Charges
    }

    /*
     * Activates the Insta-Stop ability.
     * @param {Player} player - The player using the ability.
     * @param {Game} game - The current game instance.
     * @returns {boolean} True if activation was successful, false otherwise.
     */
    
    activate(player, game) {
        // The `super.activate` in Game's `activatePlayerAbility` would have checked `canUse`.
        // Charge is consumed by Game.activatePlayerAbility after this returns true.
        
        player.dx = 0;
        player.dy = 0;
        // game.ui.showMessage(`${player.name} used Insta-Stop!`, 1500); // Game class can handle this message
        console.log(`${player.name} used Insta-Stop - successfully activated.`);
        return true; // Indicate successful effect application
    }

    // No update or deactivate needed as it's an instant effect.
}