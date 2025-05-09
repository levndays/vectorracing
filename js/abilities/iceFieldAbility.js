// js/abilities/iceFieldAbility.js

import { AbilityBase } from './abilityBase.js';
import { TILE_TYPES, ICE_FIELD_PLACE_RADIUS, ICE_FIELD_SIZE_RADIUS } from '../constants.js';

export class IceFieldAbility extends AbilityBase {
    constructor() {
        // Note: Duration calculation depends on game.players.length.
        // This is now handled inside activate or if Game passes player count.
        super("Ice Slick", `Creates a 3x3 ice field within ${ICE_FIELD_PLACE_RADIUS} squares. Lasts a few rounds.`, "🧊", 1);
        this.requiresTargeting = true;
        this.fieldActiveDurationBaseRounds = 3; // Base duration in full game rounds
        this.placedTiles = []; // Keep track of tiles placed by this specific activation instance
    }

    /*
     * Activates the Ice Field ability after successful targeting.
     * @param {Player} player - The player using the ability.
     * @param {Game} game - The current game instance.
     * @param {object} targetData - The target coordinates {x, y} for the center of the ice field.
     * @returns {boolean} True if the ice field was successfully placed, false otherwise.
     */
    
    activate(player, game, targetData) {
        // Charge is consumed by Game.handleAbilityTargeting after this returns true.
        // `canUse` was checked by Game before initiating targeting.
        if (!targetData) {
            console.error("Ice Field ability: Target data missing for activation logic.");
            return false; 
        }

        const centerX = targetData.x;
        const centerY = targetData.y;
        const fieldTilesToPlace = [];
        const actualFieldDurationTurns = this.fieldActiveDurationBaseRounds * game.players.length + 1;


        for (let dx = -ICE_FIELD_SIZE_RADIUS; dx <= ICE_FIELD_SIZE_RADIUS; dx++) {
            for (let dy = -ICE_FIELD_SIZE_RADIUS; dy <= ICE_FIELD_SIZE_RADIUS; dy++) {
                const tileX = centerX + dx;
                const tileY = centerY + dy;
                // Check if the base tile is EMPTY on the permanent grid.
                // We can place ice over an empty space.
                if (game.track.grid[tileY] !== undefined && game.track.grid[tileY][tileX] === TILE_TYPES.EMPTY) {
                     // Also ensure we are not placing over another critical temp tile (e.g. another player's wall)
                    const currentEffectiveTile = game.track.getTile(tileX, tileY);
                    if (currentEffectiveTile === TILE_TYPES.EMPTY || currentEffectiveTile === TILE_TYPES.ICE_FIELD) { // Allow re-icing or placing on empty
                        fieldTilesToPlace.push({ x: tileX, y: tileY });
                    }
                }
            }
        }

        if (fieldTilesToPlace.length > 0) {
            this.isActive = true; // The ability instance itself is now active (controls the lifespan of its tiles)
            this.duration = actualFieldDurationTurns; // Total duration in game turns for this ability's effect
            this.currentDuration = actualFieldDurationTurns; // Start countdown
            this.placedTiles = []; // Clear any previous tiles from a (hypothetical) prior activation of this same instance

            fieldTilesToPlace.forEach(fp => {
                // Ice tiles themselves don't need individual durations on the tile object;
                // they exist as long as this ability instance is active.
                // We use ownerId to link them back to this ability instance for cleanup.
                game.track.setTemporaryTile(fp.x, fp.y, TILE_TYPES.ICE_FIELD, player.id, -1); 
                this.placedTiles.push({x: fp.x, y: fp.y}); // Track tiles placed by THIS activation
            });
            // game.ui.showMessage(...); // Game class will handle this message after successful targeting
            console.log(`${player.name} used Ice Slick - successfully placed ${fieldTilesToPlace.length} ice tiles.`);
            return true;
        } else {
            // game.ui.showMessage(...); // Game class will handle this
            console.log(`${player.name} attempted Ice Slick, but no valid spot to place ice.`);
            return false; // Indicates placement failed
        }
    }

    /*
     * Deactivates the Ice Field, removing its tiles.
     * Called by AbilityBase.update when currentDuration runs out.
     * @param {Player} player - The player who owns this ability instance.
     * @param {Game} game - The current game instance.
     */

    deactivate(player, game) {
        console.log(`Deactivating Ice Slick for ${player.name}. Removing ${this.placedTiles.length} tiles.`);
        this.placedTiles.forEach(pt => {
            // Remove only if it's an ice tile and matches the owner.
            // This is important if multiple ice fields could overlap (though currently unlikely with 1 charge).
            game.track.removeTemporaryTile(pt.x, pt.y, player.id, TILE_TYPES.ICE_FIELD);
        });
        this.placedTiles = []; // Clear the record of placed tiles
        super.deactivate(player, game); // Sets isActive to false and resets currentDuration
    }

    // `update()` is handled by `AbilityBase` for duration countdown.
    // `reset()` is handled by `AbilityBase`, which also clears `isActive` and `currentDuration`.
    // We also need to clear `placedTiles` in `reset` in case a game resets while ice is active.
    reset() {
        super.reset();
        this.placedTiles = [];
    }
}