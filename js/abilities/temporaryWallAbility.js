// js/abilities/temporaryWallAbility.js

import { AbilityBase } from './abilityBase.js';
import { TILE_TYPES, TEMP_WALL_DURATION_TURNS } from '../constants.js'; // TEMP_WALL_DURATION_TURNS

export class TemporaryWallAbility extends AbilityBase {
    constructor() {
        super("Rear Guard", `Deploys a temporary wall behind you for ${TEMP_WALL_DURATION_TURNS} game turns.`, "🧱", 1);
        // Wall positions are managed as temporary tiles on the track by the Game/Track system.
        // This ability class doesn't need to store them itself.
    }

    /*
     * Activates the Temporary Wall ability.
     * @param {Player} player - The player using the ability.
     * @param {Game} game - The current game instance.
     * @returns {boolean} True if the wall was successfully placed, false otherwise.
     */
    
    activate(player, game) {
        // Charge consumed by Game.activatePlayerAbility after this returns true.

        const wallLength = 2;
        const pointsToPlaceWall = [];
        let baseDx = 0;
        let baseDy = 0;

        // Determine direction "behind" the player
        if (player.dx !== 0 || player.dy !== 0) { // If moving, use inverse of current speed vector
            baseDx = -Math.sign(player.dx);
            baseDy = -Math.sign(player.dy);
            // Prioritize dominant direction for straight walls if diagonal
            if (Math.abs(player.dx) < Math.abs(player.dy)) baseDx = 0;
            else if (Math.abs(player.dy) < Math.abs(player.dx)) baseDy = 0;
        } else if (player.path.length > 1) { // If stationary, use inverse of last move vector
            const prevPos = player.path[player.path.length - 2];
            const lastMoveDx = player.x - prevPos.x;
            const lastMoveDy = player.y - prevPos.y;
            baseDx = -Math.sign(lastMoveDx);
            baseDy = -Math.sign(lastMoveDy);
            if (Math.abs(lastMoveDx) < Math.abs(lastMoveDy)) baseDx = 0;
            else if (Math.abs(lastMoveDy) < Math.abs(lastMoveDx)) baseDy = 0;
        } else { // At true start or no movement history, use car's last known orientation
            baseDx = -Math.round(Math.cos(player.lastAngle));
            baseDy = -Math.round(Math.sin(player.lastAngle));
        }
        // Fallback if no direction could be determined (should be rare)
        if (baseDx === 0 && baseDy === 0) baseDy = 1; // Default to placing "down" relative to grid

        // Find valid empty spots for the wall
        for (let i = 1; i <= wallLength; i++) {
            const wallX = player.x + baseDx * i;
            const wallY = player.y + baseDy * i;
            // Check if the target tile is effectively empty (no permanent wall, no other temp wall)
            if (game.track.getTile(wallX, wallY) === TILE_TYPES.EMPTY) {
                pointsToPlaceWall.push({ x: wallX, y: wallY });
            } else {
                break; // Stop placing if an obstacle is encountered
            }
        }
        
        if (pointsToPlaceWall.length > 0) {
            pointsToPlaceWall.forEach(p => {
                // expiresOnTurn: current turn + duration + 1 (to last *through* the Nth turn)
                game.track.setTemporaryTile(p.x, p.y, TILE_TYPES.TEMP_WALL, player.id, game.globalTurnCounter + TEMP_WALL_DURATION_TURNS +1);
            });
            // game.ui.showMessage(...); // Game class handles this
            console.log(`${player.name} used Rear Guard - successfully placed ${pointsToPlaceWall.length} segments.`);
            return true;
        } else {
            // game.ui.showMessage(...); // Game class handles this
            console.log(`${player.name} attempted Rear Guard, but no valid spot to place wall.`);
            return false; // Indicates placement failed, Game won't consume charge
        }
    }

    // No specific update or deactivate methods needed for this ability instance,
    // as the temporary tiles on the track manage their own lifespan via `expiresOnTurn`.
}