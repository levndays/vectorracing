// js/ui/uiManager.js

import { MAX_HINTS, ICE_FIELD_PLACE_RADIUS, MIN_PLAYERS, MAX_PLAYERS } from '../constants.js';

export class UIManager {
    constructor(gameInstance) {
        this.gameInstance = gameInstance;

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

        // Map selection UI
        this.mapSelector = document.getElementById('mapSelector');

        // Game controls UI
        this.currentPlayerNameSpan = document.getElementById('currentPlayerName');
        this.currentPlayerColorIndicator = document.getElementById('currentPlayerColorIndicator');
        this.currentSpeedXSpan = document.getElementById('currentSpeedX');
        this.currentSpeedYSpan = document.getElementById('currentSpeedY');
        this.accelerationButtons = document.querySelectorAll('.acceleration-grid .game-button');
        this.hintButton = document.getElementById('hintButton');
        this.hintsRemainingSpan = document.getElementById('hintsRemaining');
        this.resetGameButton = document.getElementById('resetGameButton');

        // Editor controls UI
        this.tileSelectorButtons = document.querySelectorAll('#editorControls .tile-button');
        this.applyTrackAndPlayButton = document.getElementById('applyTrackAndPlayButton');
        this.resetTrackToDefaultButton = document.getElementById('resetTrackToDefaultButton');
        this.clearTrackButton = document.getElementById('clearTrackButton');

        // Message overlay
        this.messageDiv = document.getElementById('message');
        this.messageTimeout = null;

        // UI elements for abilities and targeting
        this.abilityButtonsContainer = document.getElementById('abilityButtonsContainer');
        this.targetingInfoElement = document.getElementById('targetingInfoPanel');

        // Tutorial UI Elements
        this.tutorialPanel = document.getElementById('tutorialMessagePanel');
        this.tutorialInstructionText = document.getElementById('tutorialInstructionText');
        this.tutorialNextButton = document.getElementById('tutorialNextButton');

        if (this.tutorialNextButton && this.gameInstance) {
            this.tutorialNextButton.addEventListener('click', () => {
                if (this.gameInstance.tutorialManager && this.gameInstance.tutorialManager.isActive) {
                    this.gameInstance.tutorialManager.notifyPlayerAction('next_button_clicked');
                }
            });
        }
    }

    populateMapSelector(maps, selectedMapId) {
        this.mapSelector.innerHTML = '';

        const customOption = document.createElement('option');
        customOption.value = "custom";
        customOption.textContent = "Custom Track";
        this.mapSelector.appendChild(customOption);

        if (maps && maps.length > 0) {
            maps.forEach(map => {
                const option = document.createElement('option');
                option.value = map.id;
                option.textContent = map.name;
                this.mapSelector.appendChild(option);
            });
        } else {
            console.warn("populateMapSelector: No maps data provided or maps array is empty.");
        }
        // Ensure the value exists before setting it, otherwise selector might show blank
        if (Array.from(this.mapSelector.options).some(opt => opt.value === selectedMapId)) {
            this.mapSelector.value = selectedMapId;
        } else if (maps && maps.length > 0) {
            this.mapSelector.value = maps[0].id; // Fallback to first map if selectedId is invalid
            console.warn(`populateMapSelector: selectedMapId '${selectedMapId}' not found. Falling back to '${this.mapSelector.value}'.`);
        } else {
            this.mapSelector.value = "custom"; // Fallback to custom if no maps
        }
    }

    updatePlayerCount(count, minPlayers = MIN_PLAYERS, maxPlayers = MAX_PLAYERS) {
        this.playerCountSpan.textContent = count;
        this.addPlayerButton.disabled = count >= maxPlayers;
        this.removePlayerButton.disabled = count <= minPlayers;
    }

    updateTrackSizeInputs(width, height) {
        this.trackWidthInput.value = width;
        this.trackHeightInput.value = height;
    }
    
    showMessage(htmlContent, duration = 3000) {
        // Prevent general game messages if an active tutorial is already showing its panel
        if (this.gameInstance && this.gameInstance.tutorialManager && this.gameInstance.tutorialManager.isActive &&
            this.tutorialPanel && this.tutorialPanel.style.display === 'block') {
            console.log("[UIManager.showMessage] Tutorial panel active, suppressing general message:", htmlContent.substring(0, 50) + "...");
            return;
        }

        this.messageDiv.innerHTML = htmlContent; 
        this.messageDiv.style.display = 'flex';
        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        if (duration > 0) {
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

    // --- Tutorial Specific UI Methods ---
    displayTutorialInstruction(html, showNextBtn) {
        if (this.tutorialPanel && this.tutorialInstructionText && this.tutorialNextButton) {
            this.tutorialPanel.style.display = 'block';
            this.tutorialInstructionText.innerHTML = html;
            this.tutorialNextButton.style.display = showNextBtn ? 'inline-block' : 'none';
            if (showNextBtn) this.tutorialNextButton.disabled = false; // Ensure it's enabled if shown
        } else {
            console.error("Tutorial UI elements not found! Cannot display instruction.");
        }
    }

    hideTutorialMessage() {
        if (this.tutorialPanel) this.tutorialPanel.style.display = 'none';
    }

    highlightElement(selectorOrElement) {
        const element = (typeof selectorOrElement === 'string') ? document.querySelector(selectorOrElement) : selectorOrElement;
        if (element) {
            element.classList.add('tutorial-highlight');
        } else {
            console.warn("Tutorial highlight: Element not found for selector/element:", selectorOrElement);
        }
    }

    removeHighlight(selectorOrElement) {
        const element = (typeof selectorOrElement === 'string') ? document.querySelector(selectorOrElement) : selectorOrElement;
        if (element) {
            element.classList.remove('tutorial-highlight');
        }
        // Not warning if element not found, as it might have been dynamically removed or selector was optional
    }

    disableAllGameControls(disable) {
        const controlsToManage = [
            // Top panel
            this.switchToGameModeButton, this.switchToEditorModeButton,
            this.addPlayerButton, this.removePlayerButton,
            this.trackWidthInput, this.trackHeightInput, this.applyTrackSizeButton,
            this.mapSelector,
            // Game controls panel
            ...this.accelerationButtons, this.hintButton, this.resetGameButton,
            // Editor controls panel
            ...this.tileSelectorButtons, this.applyTrackAndPlayButton,
            this.resetTrackToDefaultButton, this.clearTrackButton,
            // Tutorial panel buttons (if they are not managed by enableTutorialControls)
            this.tutorialNextButton // Usually managed by tutorial steps, but good to include in a master disable
        ];

        controlsToManage.forEach(control => {
            if (control) control.disabled = disable;
        });

        // Also disable/enable ability buttons if they exist
        Array.from(this.abilityButtonsContainer.children).forEach(btn => {
            if (btn && typeof btn.disabled !== 'undefined') btn.disabled = disable;
        });
        
        if (disable && !(this.gameInstance && this.gameInstance.tutorialManager && this.gameInstance.tutorialManager.isActive)) {
            this.hideMessage(); // Hide general game messages when disabling all (unless tutorial is managing UI)
        }
    }

    enableTutorialControls(selectorsOrElements) {
        if (!Array.isArray(selectorsOrElements)) {
            console.warn("enableTutorialControls expects an array.");
            return;
        }
        selectorsOrElements.forEach(item => {
            const element = (typeof item === 'string') ? document.querySelector(item) : item;
            if (element) {
                element.disabled = false;
            } else {
                console.warn("Tutorial: Element not found to enable:", item);
            }
        });
    }
    // --- End Tutorial Specific UI Methods ---

    setupAbilityButtons(player, game) {
        this.abilityButtonsContainer.innerHTML = ''; // Clear previous buttons

        // Conditions for not showing ability buttons at all
        if (!player || game.editorMode || game.gameOver || player.crashed || player.finished) {
            this.abilityButtonsContainer.style.display = 'none';
            this.hideTargetingInfo(); // Ensure targeting info is also hidden
            return;
        }
        
        // Handle UI for active ability targeting
        if (game.isTargetingAbility && player.id === game.players[game.currentPlayerIndex]?.id) {
            const rangeText = game.abilityBeingTargeted?.name === "Ice Slick" ? `(Range: ${ICE_FIELD_PLACE_RADIUS})` : "";
            this.showTargetingInfo(
                `Targeting: ${game.abilityBeingTargeted?.icon || ''} ${game.abilityBeingTargeted?.name || 'Ability'}. <br>Click on map ${rangeText}.`,
                () => game.cancelAbilityTargeting() // Pass the cancel function
            );
            this.abilityButtonsContainer.style.display = 'none'; // Hide ability buttons while targeting
            return; 
        } else {
            this.hideTargetingInfo(); // Clear targeting info if not actively targeting
        }

        // Create and add buttons for each ability
        let hasAnyAbilities = false;
        if (player.abilities && player.abilities.length > 0) {
            hasAnyAbilities = true;
            player.abilities.forEach((ability, index) => {
                if (!ability) return; 
                const button = document.createElement('button');
                button.classList.add('action-button', 'ability-button', 'game-button'); 
                button.innerHTML = `${ability.icon} ${ability.name} (${ability.currentCharges}/${ability.maxCharges})`;
                button.title = ability.description;
                // Disable based on ability's own logic. Tutorial steps might further disable/enable.
                button.disabled = !ability.canUse(player, game); 
                button.addEventListener('click', () => {
                    game.activatePlayerAbility(index);
                });
                this.abilityButtonsContainer.appendChild(button);
            });
        }
        
        // Show or hide the container based on whether there are abilities
        this.abilityButtonsContainer.style.display = hasAnyAbilities ? 'flex' : 'none';

        // The tutorial's step setup function (called via loadStep)
        // will be responsible for further enabling/disabling specific controls,
        // including these ability buttons if necessary for a particular tutorial step.
        // No direct call to tutorialManager from here.
    }
    
    showTargetingInfo(message, cancelCallback) {
        this.targetingInfoElement.innerHTML = `${message} <button id="cancelTargetingBtnUI" class="action-button small-action game-button">Cancel</button>`;
        this.targetingInfoElement.style.display = 'block';
        const cancelBtnUI = document.getElementById('cancelTargetingBtnUI');
        if(cancelBtnUI && cancelCallback) {
            // Ensure only one listener, or clear previous if any
            cancelBtnUI.onclick = null; 
            cancelBtnUI.onclick = cancelCallback;
        }
    }

    hideTargetingInfo() {
        this.targetingInfoElement.style.display = 'none';
        this.targetingInfoElement.innerHTML = ''; // Clear content
    }

    updateGameControls(game) {
        const player = game.players[game.currentPlayerIndex];
        
        // First, set up ability buttons based on current player and game state.
        // TutorialManager's loadStep will then apply its specific control overrides if active.
        this.setupAbilityButtons(player, game);

        // If tutorial is active, it primarily manages control states via its step setup functions.
        // We still update player-specific info here.
        if (game.tutorialManager && game.tutorialManager.isActive) {
            if (player) {
                this.currentPlayerNameSpan.textContent = player.name + (player.finished ? " (Finished!)" : (player.crashed ? " (Crashed!)" : ""));
                this.currentPlayerColorIndicator.style.backgroundColor = player.color;
                this.currentSpeedXSpan.textContent = player.dx;
                this.currentSpeedYSpan.textContent = player.dy;
                this.hintsRemainingSpan.textContent = player.hints;
                if (!player.finished && !player.crashed) this.drawSpeedVector(player.dx, player.dy);
                else this.clearSpeedVector();
            } else {
                 this.currentPlayerNameSpan.textContent = "-";
                 this.currentPlayerColorIndicator.style.backgroundColor = 'transparent';
                 this.currentSpeedXSpan.textContent = "0"; this.currentSpeedYSpan.textContent = "0";
                 this.hintsRemainingSpan.textContent = "0";
                 this.clearSpeedVector();
            }
            // Most button enabled/disabled states are handled by TutorialManager.loadStep -> step.setupFunction
            return; // Return early to let tutorial have full control over button states
        }

        // --- Normal Game Control Update (Non-Tutorial) ---
        if (!game.editorMode && player && !game.gameOver) {
            this.currentPlayerNameSpan.textContent = player.name + (player.finished ? " (Finished!)" : (player.crashed ? " (Crashed!)" : ""));
            this.currentPlayerColorIndicator.style.backgroundColor = player.color;
            this.currentSpeedXSpan.textContent = player.dx;
            this.currentSpeedYSpan.textContent = player.dy;
            this.hintsRemainingSpan.textContent = player.hints;
            
            const controlsDisabled = player.crashed || player.finished || game.isTargetingAbility;
            this.hintButton.disabled = controlsDisabled || player.hints <= 0 || game.hintActive;
            this.accelerationButtons.forEach(b => b.disabled = controlsDisabled);
            
            if (!player.finished && !player.crashed) this.drawSpeedVector(player.dx, player.dy);
            else this.clearSpeedVector();

        } else if (game.gameOver && !game.editorMode) { // Game over, not in editor
            this.currentPlayerNameSpan.textContent = "Game Over";
            this.currentPlayerColorIndicator.style.backgroundColor = 'transparent';
            this.currentSpeedXSpan.textContent = "-"; this.currentSpeedYSpan.textContent = "-";
            this.hintsRemainingSpan.textContent = "-";
            this.hintButton.disabled = true;
            this.accelerationButtons.forEach(b => b.disabled = true);
            this.clearSpeedVector();
        } else { // Editor mode or no player/game not started fully
            this.currentPlayerNameSpan.textContent = game.editorMode ? "Editor Mode" : "-";
            this.currentPlayerColorIndicator.style.backgroundColor = 'transparent';
            this.currentSpeedXSpan.textContent = "0"; this.currentSpeedYSpan.textContent = "0";
            this.hintsRemainingSpan.textContent = MAX_HINTS.toString(); // Default
            this.hintButton.disabled = true;
            this.accelerationButtons.forEach(b => b.disabled = true);
            this.clearSpeedVector();
        }
        // Reset game button state (should be enabled unless targeting, or if tutorial manages it)
        this.resetGameButton.disabled = game.isTargetingAbility || (game.editorMode && !game.track.isValid());
    }
    
    updateModeButtons(editorMode) {
        this.gameControlsDiv.style.display = editorMode ? 'none' : 'flex';
        this.editorControlsDiv.style.display = editorMode ? 'flex' : 'none';
        this.canvas.classList.toggle('editor-active', editorMode);
        
        if (!editorMode) { // When switching to game mode
            this.canvas.classList.remove('targeting-active'); // Ensure targeting visuals are off
            this.hideTargetingInfo();
        }
        // ARIA states are updated in Game.js event listeners for mode switch buttons
    }

    selectTileButton(typeKey) {
        this.tileSelectorButtons.forEach(btn => {
            const isActive = btn.dataset.tileType.toUpperCase() === typeKey.toUpperCase();
            btn.classList.toggle('active-tile', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
        });
    }

    drawSpeedVector(dx, dy) {
        const ctx = this.speedVectorCtx;
        const w = this.speedVectorCanvas.width;
        const h = this.speedVectorCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const centerX = w / 2;
        const centerY = h / 2;
        const scale = 6; // Adjust for visual scaling of vector

        // Grid lines
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ui-text-secondary').trim() || '#9096a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY); ctx.lineTo(w, centerY); // X-axis
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h); // Y-axis
        ctx.stroke();

        if (dx === 0 && dy === 0) return; // No vector to draw if speed is zero

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
        const headlen = 8; // Length of arrowhead lines
        const angle = Math.atan2(endY - centerY, endX - centerX);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    clearSpeedVector() {
        const ctx = this.speedVectorCtx;
        const w = this.speedVectorCanvas.width;
        const h = this.speedVectorCanvas.height;
        ctx.clearRect(0, 0, w, h);
        // Optionally redraw axes if desired even when cleared
        const centerX = w / 2;
        const centerY = h / 2;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ui-text-secondary').trim() || '#9096a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
        ctx.stroke();
    }
}