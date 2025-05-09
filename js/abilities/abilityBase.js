// js/abilities/abilityBase.js

// This base class doesn't typically need to import game-specific constants directly,
// as those would be used by subclasses or passed in via the `game` object.

export class AbilityBase {
    constructor(name, description, icon, charges = 1) {
        this.name = name;
        this.description = description;
        this.icon = icon; // Emoji or path to an icon image
        this.maxCharges = charges;
        this.currentCharges = charges;

        this.isActive = false;      // For abilities with ongoing effects that need updates
        this.duration = 0;          // Total duration for timed effects (e.g., in game turns or seconds)
        this.currentDuration = 0;   // Countdown timer for active effects

        this.requiresTargeting = false; // Flag if the ability needs map targeting
    }

    /*
     * Checks if the ability can be used by the player in the current game state.
     * @param {Player} player - The player attempting to use the ability.
     * @param {Game} game - The current game instance.
     * @returns {boolean} True if the ability can be used, false otherwise.
     */
    canUse(player, game) {
        // Basic checks: charges, not already active (for toggle/duration abilities), player state
        return this.currentCharges > 0 &&
               !this.isActive && // Prevent re-activating if it's a duration-based active ability
               !player.crashed &&
               !player.finished &&
               !game.isTargetingAbility; // Don't allow using another ability while one is being targeted
    }

    /*
     * Activates the ability. Subclasses implement specific logic.
     * @param {Player} player - The player using the ability.
     * @param {Game} game - The current game instance.
     * @param {object|null} [targetData=null] - Optional data for targeted abilities (e.g., {x, y}).
     * @returns {boolean} True if activation was successful (or initiated successfully for targeting), false otherwise.
     */

    activate(player, game, targetData = null) {
        // This base activate method mainly handles the canUse check.
        // Charge consumption is now generally handled by the Game class after successful activation,
        // especially for targeting abilities.
        if (this.canUse(player, game)) {
            console.log(`${player.name} is attempting to use ${this.name}`);
            return true; // Indicates prerequisite checks passed
        }
        return false;
    }

    /*
     * Updates the ability's state, e.g., for ongoing effects or cooldowns.
     * Called periodically by the game loop if the ability is active.
     * @param {Player} player - The player who owns this ability instance.
     * @param {Game} game - The current game instance.
     */

    update(player, game) {
        if (this.isActive && this.duration > 0) { // If ability has a timed duration
            this.currentDuration--;
            if (this.currentDuration <= 0) {
                this.deactivate(player, game);
            }
        }
    }

    /*
     * Deactivates the ability, cleaning up any ongoing effects.
     * @param {Player} player - The player who owns this ability instance.
     * @param {Game} game - The current game instance.
     */
    deactivate(player, game) {
        this.isActive = false;
        this.currentDuration = 0; // Reset duration timer
        console.log(`${this.name} for ${player.name} deactivated.`);
    }

    /*
     * Resets the ability to its initial state (e.g., charges, cooldowns).
     * Called when a game restarts or player resets.
     */
    
    reset() {
        this.currentCharges = this.maxCharges;
        this.isActive = false;
        this.currentDuration = 0;
    }
}