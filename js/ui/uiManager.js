// js/ui/uiManager.js

import { MAX_HINTS, ICE_FIELD_PLACE_RADIUS } from '../constants.js'; // Import if needed for UI text

export class UIManager {
    constructor() {
        // Canvas elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.speedVectorCanvas = document.getElementById('speedVectorCanvas');
        this.speedVectorCtx = this.speedVectorCanvas.getContext('2d');

        // Mode switching buttons
        this.switchToGameModeButton = document.getElementById('switchToGameModeButton');
        this.switchToEditorModeButton = document.getElementById('switchToEditorModeButton');

        // Control panels
        this.gameControlsDiv = document.getElementById('gameControls');
        this.editorControlsDiv = document.getElementById('editorControls');

        // Player management UI
        this.playerCountSpan = document.getElementById('playerCount');
        this.addPlayerButton = document.getElementById('addPlayerButton');
        this.removePlayerButton = document.getElementById('removePlayerButton');

        // Track size UI
        this.trackWidthInput = document.getElementById('trackWidthInput');
        this.trackHeightInput = document.getElementById('trackHeightInput');
        this.applyTrackSizeButton = document.getElementById('applyTrackSizeButton');

        // Game controls UI
        this.currentPlayerNameSpan = document.getElementById('currentPlayerName');
        this.currentPlayerColorIndicator = document.getElementById('currentPlayerColorIndicator');
        this.currentSpeedXSpan = document.getElementById('currentSpeedX');
        this.currentSpeedYSpan = document.getElementById('currentSpeedY');
        this.accelerationButtons = document.querySelectorAll('.acceleration-grid button');
        this.hintButton = document.getElementById('hintButton');
        this.hintsRemainingSpan = document.getElementById('hintsRemaining');
        this.resetGameButton = document.getElementById('resetGameButton');

        // Editor controls UI
        this.tileSelectorButtons = document.querySelectorAll('.tile-button');
        this.applyTrackAndPlayButton = document.getElementById('applyTrackAndPlayButton');
        this.resetTrackToDefaultButton = document.getElementById('resetTrackToDefaultButton');
        this.clearTrackButton = document.getElementById('clearTrackButton');

        // Message overlay
        this.messageDiv = document.getElementById('message');

        // UI elements for abilities and targeting (dynamically managed)
        this.abilityButtonsContainer = document.createElement('div');
        this.abilityButtonsContainer.className = 'ability-buttons-container';
        
        this.targetingInfoElement = document.createElement('div');
        this.targetingInfoElement.className = 'targeting-info-panel';
        this.targetingInfoElement.style.display = 'none'; // Initially hidden
    }

    /*
     * Updates the displayed player count and enables/disables add/remove buttons.
     * @param {number} count - The current number of players.
     * @param {number} minPlayers - Minimum allowed players.
     * @param {number} maxPlayers - Maximum allowed players.
     */
    updatePlayerCount(count, minPlayers, maxPlayers) {
        this.playerCountSpan.textContent = count;
        this.addPlayerButton.disabled = count >= maxPlayers;
        this.removePlayerButton.disabled = count <= minPlayers;
    }

    updateTrackSizeInputs(width, height) {
        this.trackWidthInput.value = width;
        this.trackHeightInput.value = height;
    }
    
    /*
     * Displays a message in the overlay.
     * @param {string} htmlContent - HTML content for the message.
     * @param {number} [duration=3000] - Duration in ms. 0 for indefinite.
     */
    showMessage(htmlContent, duration = 3000) {
        this.messageDiv.innerHTML = htmlContent; 
        this.messageDiv.style.display = 'flex';
        if (duration > 0) {
            // Clear any existing timeout to prevent multiple hide calls
            if (this.messageTimeout) clearTimeout(this.messageTimeout);
            this.messageTimeout = setTimeout(() => this.hideMessage(), duration);
        }
    }

    hideMessage() {
        this.messageDiv.style.display = 'none';
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
    }

    /*
     * Sets up and displays buttons for the current player's abilities.
     * @param {Player} player - The current player.
     * @param {Game} game - The game instance (for calling activatePlayerAbility).
     */

    setupAbilityButtons(player, game) {
        this.abilityButtonsContainer.innerHTML = ''; // Clear previous buttons
        let containerInDom = this.gameControlsDiv.contains(this.abilityButtonsContainer);

        // Conditions to hide ability buttons container entirely
        if (!player || game.editorMode || game.gameOver || player.finished || player.crashed) {
            if (containerInDom) {
                this.gameControlsDiv.removeChild(this.abilityButtonsContainer);
            }
            this.hideTargetingInfo(); // Also hide targeting info if controls are generally hidden
            return;
        }
        
        // If currently targeting an ability for this player
        if (game.isTargetingAbility && player.id === game.players[game.currentPlayerIndex].id) {
            this.showTargetingInfo(
                `Targeting: ${game.abilityBeingTargeted.icon} ${game.abilityBeingTargeted.name}. <br>Click on map (Range: ${ICE_FIELD_PLACE_RADIUS}).`,
                () => game.cancelAbilityTargeting() // Pass the cancel callback
            );
            // Remove normal ability buttons container if it was shown
            if (containerInDom) {
                this.gameControlsDiv.removeChild(this.abilityButtonsContainer);
            }
            return; 
        } else {
            this.hideTargetingInfo(); // Hide if not this player targeting
        }

        // Display normal ability buttons if not in targeting mode for this player
        let hasUsableAbilities = false;
        if (player.abilities && player.abilities.length > 0) {
            player.abilities.forEach((ability, index) => {
                if (!ability) return; 
                const button = document.createElement('button');
                button.classList.add('action-button', 'ability-button');
                button.innerHTML = `${ability.icon} ${ability.name} (${ability.currentCharges}/${ability.maxCharges})`;
                button.title = ability.description;
                button.disabled = !ability.canUse(player, game); 
                button.addEventListener('click', () => {
                    game.activatePlayerAbility(index);
                });
                this.abilityButtonsContainer.appendChild(button);
                if(!button.disabled) hasUsableAbilities = true;
            });
        }
        
        // Add/Remove the container from DOM based on whether there are abilities to show
        if (player.abilities && player.abilities.length > 0) {
            if (!containerInDom) this.insertAbilityButtonsContainer();
        } else {
            if (containerInDom) this.gameControlsDiv.removeChild(this.abilityButtonsContainer);
        }
    }

    /*
     * Inserts the ability buttons container into the DOM in a consistent location.
     */
    insertAbilityButtonsContainer() {
        const hintButton = document.getElementById('hintButton');
        if (hintButton) {
            this.gameControlsDiv.insertBefore(this.abilityButtonsContainer, hintButton);
        } else { // Fallback if hint button isn't found
            const resetGameButton = document.getElementById('resetGameButton');
            if (resetGameButton) {
                this.gameControlsDiv.insertBefore(this.abilityButtonsContainer, resetGameButton);
            } else {
                this.gameControlsDiv.appendChild(this.abilityButtonsContainer); // Last resort
            }
        }
    }
    
    /*
     * Shows the targeting information panel.
     * @param {string} message - The message to display.
     * @param {Function} cancelCallback - Callback function for the cancel button.
     */
    showTargetingInfo(message, cancelCallback) {
        this.targetingInfoElement.innerHTML = `${message} <button id="cancelTargetingBtnUI" class="action-button small-action">Cancel</button>`;
        if (!this.gameControlsDiv.contains(this.targetingInfoElement)) {
            const hintButton = document.getElementById('hintButton'); // Try to insert before hint
             if (hintButton) {
                this.gameControlsDiv.insertBefore(this.targetingInfoElement, hintButton);
            } else {
                 this.gameControlsDiv.appendChild(this.targetingInfoElement); // Fallback
            }
        }
        this.targetingInfoElement.style.display = 'block';
        const cancelBtnUI = document.getElementById('cancelTargetingBtnUI');
        if(cancelBtnUI && cancelCallback) {
            cancelBtnUI.onclick = cancelCallback;
        }
    }

    hideTargetingInfo() {
        this.targetingInfoElement.style.display = 'none';
        // Optionally remove from DOM if preferred, but hiding is often sufficient
        // if (this.gameControlsDiv.contains(this.targetingInfoElement)) {
        //     this.gameControlsDiv.removeChild(this.targetingInfoElement);
        // }
    }

    /*
     * Updates all game controls based on the current game state.
     * @param {Game} game - The game instance.
     */
    updateGameControls(game) {
        const player = game.players[game.currentPlayerIndex];
        this.setupAbilityButtons(player, game); // Sets up ability buttons OR targeting info

        if (!game.editorMode && player && !game.gameOver) {
            this.currentPlayerNameSpan.textContent = player.name + (player.finished ? " (Finished!)" : "");
            this.currentPlayerColorIndicator.style.backgroundColor = player.color;
            this.currentSpeedXSpan.textContent = player.dx;
            this.currentSpeedYSpan.textContent = player.dy;
            this.hintsRemainingSpan.textContent = player.hints;
            
            const controlsDisabled = player.crashed || player.finished || game.isTargetingAbility;
            this.hintButton.disabled = controlsDisabled || player.hints <= 0 || game.hintActive;
            this.accelerationButtons.forEach(b => b.disabled = controlsDisabled);
            
            if (!player.finished) {
                this.drawSpeedVector(player.dx, player.dy);
            } else {
                this.clearSpeedVector();
            }
        } else if (game.gameOver) {
            this.currentPlayerNameSpan.textContent = "Game Over";
            this.currentPlayerColorIndicator.style.backgroundColor = 'transparent';
            this.currentSpeedXSpan.textContent = "-"; this.currentSpeedYSpan.textContent = "-";
            this.hintsRemainingSpan.textContent = "-"; // Or MAX_HINTS if preferred for game over state
            this.hintButton.disabled = true;
            this.accelerationButtons.forEach(b => b.disabled = true);
            this.clearSpeedVector();
        } else { // Editor mode or no players
            this.currentPlayerNameSpan.textContent = "-";
            this.currentPlayerColorIndicator.style.backgroundColor = 'transparent';
            this.currentSpeedXSpan.textContent = "0"; this.currentSpeedYSpan.textContent = "0";
            this.hintsRemainingSpan.textContent = MAX_HINTS.toString(); // Show default max hints
            this.hintButton.disabled = true;
            this.accelerationButtons.forEach(b => b.disabled = true);
            this.clearSpeedVector();
        }
        this.resetGameButton.disabled = game.editorMode || game.isTargetingAbility || (game.players.length === 0 && !game.gameOver);
    }
    
    updateModeButtons(editorMode) {
        this.gameControlsDiv.style.display = editorMode ? 'none' : 'flex';
        this.editorControlsDiv.style.display = editorMode ? 'flex' : 'none';
        this.canvas.classList.toggle('editor-active', editorMode);
        this.switchToEditorModeButton.classList.toggle('active-mode', editorMode);
        this.switchToGameModeButton.classList.toggle('active-mode', !editorMode);
        if (!editorMode) {
            this.canvas.classList.remove('targeting-active'); // Ensure targeting outline is off if switching to editor
            this.hideTargetingInfo(); // And hide targeting panel
        }
    }

    selectTileButton(typeKey) {
        this.tileSelectorButtons.forEach(btn => {
            btn.classList.toggle('active-tile', btn.dataset.tileType.toUpperCase() === typeKey.toUpperCase());
        });
    }

    drawSpeedVector(dx, dy) {
        const ctx = this.speedVectorCtx;
        const w = this.speedVectorCanvas.width;
        const h = this.speedVectorCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const centerX = w / 2;
        const centerY = h / 2;
        const scale = 6;

        // Axes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY); ctx.lineTo(w, centerY); // X-axis
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h); // Y-axis
        ctx.stroke();

        if (dx === 0 && dy === 0) return;

        const endX = centerX + dx * scale;
        const endY = centerY + dy * scale;

        // Vector line
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ui-text-primary').trim() || '#dadfe8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        const headlen = 10;
        const angle = Math.atan2(endY - centerY, endX - centerX);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    clearSpeedVector() {
        this.speedVectorCtx.clearRect(0, 0, this.speedVectorCanvas.width, this.speedVectorCanvas.height);
    }
}
