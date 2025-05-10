// js/core/game.js
import availableMapsData from '../mapData.js';
import { TutorialManager } from '../tutorialManager.js';
import {
    GRID_SIZE, MIN_TRACK_SIZE, MAX_TRACK_WIDTH, MAX_TRACK_HEIGHT, TILE_TYPES,
    NUM_EXPLOSION_PARTICLES, ICE_FIELD_PLACE_RADIUS, PLAYER_BASE_COLORS,
    MAX_PLAYERS, MIN_PLAYERS, MAX_HINTS, HINT_DURATION
} from '../constants.js';
import { Player } from '../entities/player.js';
import { Track } from '../entities/track.js';
import { Particle } from '../entities/particle.js';
import { UIManager } from '../ui/uiManager.js';
import { InstaStopAbility } from '../abilities/instaStopAbility.js';
import { TemporaryWallAbility } from '../abilities/temporaryWallAbility.js';
import { IceFieldAbility } from '../abilities/iceFieldAbility.js';
import { hexToRgba } from '../utils.js';

export class Game {
    constructor() {
        this.ui = new UIManager(this);
        this.tutorialManager = new TutorialManager(this);

        this.availableMaps = availableMapsData;
        if (!this.availableMaps || this.availableMaps.length === 0) {
            console.error("CRITICAL: No map data loaded from mapData.js!");
            this.availableMaps = [{id: "error_map", name: "Error Loading Maps", width: 20, height: 15, grid: [], isTutorial: false}];
        }

        // Determine initial map: if a tutorial map exists and is flagged, consider it.
        // Otherwise, use the first map.
        const tutorialMapData = this.availableMaps.find(m => m.id === "tutorial_map" && m.isTutorial);
        this.currentMapId = tutorialMapData ? tutorialMapData.id : this.availableMaps[0].id;
        console.log(`[Game Constructor] Initial currentMapId set to: ${this.currentMapId}`);


        const initialMapConfig = this.availableMaps.find(m => m.id === this.currentMapId);
        if (!initialMapConfig) {
            console.error(`CRITICAL: Initial map with ID "${this.currentMapId}" not found.`);
            this.track = new Track(20, 15); // Fallback
            this.track.clear();
        } else {
            this.track = new Track(initialMapConfig.width, initialMapConfig.height);
        }
        
        this.players = [];
        this.numPlayers = MIN_PLAYERS;
        this.editorMode = false;
        this.selectedTileTypeInEditor = TILE_TYPES.WALL;
        this.isDrawingInEditor = false;
        this.currentPlayerIndex = 0;
        this.gameOver = false;
        this.hintActive = false;
        this.hintPlayerIndexShowing = -1;
        this.hintTimeoutId = null;
        this.usedPlayerColors = new Set();
        this.particles = [];
        this.globalTurnCounter = 0;

        this.lastAccelerationInput = { ddx: 0, ddy: 0 };
        this.lastAbilityUsed = null;

        this.isTargetingAbility = false;
        this.isTargetingListenerActive = false;
        this.abilityBeingTargeted = null;
        this.targetCursorHandler = (event) => this.handleAbilityTargeting(event);

        this.availableAbilities = [InstaStopAbility, TemporaryWallAbility, IceFieldAbility];
        
        this.init();
    }

    init() {
        console.log("[Game.init] Initializing game setup.");
        // Load the initial map (which might be the tutorial map)
        // The `selectMap` call here will handle the initial tutorial trigger if conditions are met.
        this.selectMap(this.currentMapId, false); // `false` because this is not called by tutorialManager

        // This was moved to selectMap:
        // const currentMapData = this.availableMaps.find(m => m.id === this.currentMapId);
        // if (currentMapData) {
        //     this.track.loadMapData(currentMapData);
        // } else {
        //     this.track.clear();
        // }
        // this.ui.canvas.width = this.track.width * GRID_SIZE;
        // this.ui.canvas.height = this.track.height * GRID_SIZE;
        
        this.ui.populateMapSelector(this.availableMaps, this.currentMapId);
        // this.ui.updateTrackSizeInputs(this.track.width, this.track.height); // Done in selectMap
        this.ui.updatePlayerCount(this.numPlayers, MIN_PLAYERS, MAX_PLAYERS);

        // this.setupPlayers(); // Done in selectMap via resetGame
        // this.resetGame(false); // selectMap calls resetGame(true)
        this.bindEvents();
        // this.switchToMode(false); // selectMap calls switchToMode
        this.ui.selectTileButton('WALL');
        this.gameLoop();
    }

    gameLoop() {
        this.players.forEach(player => {
            player.abilities.forEach(ability => {
                if (ability.isActive) {
                    ability.update(player, this);
                }
            });
        });
        this.updateTemporaryTiles();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    updateTemporaryTiles() {
        const tilesToRemove = [];
        const currentGlobalTurn = this.globalTurnCounter;

        this.track.temporaryTiles.forEach((tile) => {
            if (tile.type === TILE_TYPES.TEMP_WALL) {
                if (tile.expiresOnTurn !== -1 && currentGlobalTurn >= tile.expiresOnTurn) {
                    tilesToRemove.push({ x: tile.x, y: tile.y, ownerId: tile.ownerId, type: tile.type });
                }
            } else if (tile.type === TILE_TYPES.ICE_FIELD) {
                const ownerAbility = this.players.find(p => p.id === tile.ownerId)
                    ?.abilities.find(a => a instanceof IceFieldAbility && a.isActive);
                if (!ownerAbility) {
                    tilesToRemove.push({ x: tile.x, y: tile.y, ownerId: tile.ownerId, type: tile.type });
                }
            }
        });
        tilesToRemove.forEach(tr => this.track.removeTemporaryTile(tr.x, tr.y, tr.ownerId, tr.type));
    }

    createExplosion(gridX, gridY, playerColor) {
        const canvasX = gridX * GRID_SIZE + GRID_SIZE / 2;
        const canvasY = gridY * GRID_SIZE + GRID_SIZE / 2;
        const baseParticleColor = playerColor ? hexToRgba(playerColor, 1) : undefined;
        for (let i = 0; i < NUM_EXPLOSION_PARTICLES; i++) {
            let pColor = baseParticleColor;
            if (i % 3 === 1) pColor = hexToRgba("#FFFF64", 1);
            if (i % 3 === 2) pColor = hexToRgba("#B4B4B4", 1);
            this.particles.push(new Particle(canvasX, canvasY, pColor));
        }
    }

    setupPlayers() {
        let numToSetup = this.tutorialManager.isActive ? 1 : this.numPlayers;
        console.log(`[Game.setupPlayers] Setting up ${numToSetup} player(s). Tutorial active: ${this.tutorialManager.isActive}`);
        this.players = [];
        this.usedPlayerColors.clear();
        for (let i = 0; i < numToSetup; i++) {
            const color = this.getNextAvailableColor();
            const player = new Player(i, `Player ${i + 1}`, color);
            player.assignAbilities(this.availableAbilities);
            this.players.push(player);
            this.usedPlayerColors.add(color);
        }
    }

    getNextAvailableColor() {
        for (const color of PLAYER_BASE_COLORS) {
            if (!this.usedPlayerColors.has(color)) return color;
        }
        return `rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`;
    }

    addPlayer() {
        if (this.tutorialManager.isActive) {
            this.ui.showMessage("Cannot change player count during tutorial.", 2000);
            return;
        }
        if (this.numPlayers < MAX_PLAYERS) {
            this.numPlayers++;
            this.ui.updatePlayerCount(this.numPlayers, MIN_PLAYERS, MAX_PLAYERS);
            // this.setupPlayers(); // Will be handled by resetGame
            this.resetGame(true);
        }
    }

    removePlayer() {
        if (this.tutorialManager.isActive) {
            this.ui.showMessage("Cannot change player count during tutorial.", 2000);
            return;
        }
        if (this.numPlayers > MIN_PLAYERS) {
            this.numPlayers--;
            this.ui.updatePlayerCount(this.numPlayers, MIN_PLAYERS, MAX_PLAYERS);
            // this.setupPlayers(); // Will be handled by resetGame
            this.resetGame(true);
        }
    }

    setTrackSize(newWidth, newHeight) {
        if (this.tutorialManager.isActive) {
            this.ui.showMessage("Cannot change track size during tutorial.", 2000);
            return;
        }
        newWidth = Math.max(MIN_TRACK_SIZE, Math.min(MAX_TRACK_WIDTH, newWidth));
        newHeight = Math.max(MIN_TRACK_SIZE, Math.min(MAX_TRACK_HEIGHT, newHeight));
        
        this.currentMapId = "custom"; // Flag that we are on a custom setup
        this.track.width = newWidth;
        this.track.height = newHeight;
        this.track.clear(); // Clears to new dimensions with borders

        this.ui.canvas.width = newWidth * GRID_SIZE;
        this.ui.canvas.height = newHeight * GRID_SIZE;
        this.ui.populateMapSelector(this.availableMaps, "custom"); // Update selector to show "Custom Track"
        
        this.resetGame(true); // Reset game for the new size
        this.ui.showMessage("Custom track size applied. Track cleared.", 2000);
        this.switchToMode(true); // Go to editor mode for the new custom track
    }

    selectMap(mapId, calledByTutorialManager = false) {
        console.log(`[Game.selectMap] Attempting to select map ID: ${mapId}, calledByTutorialManager: ${calledByTutorialManager}`);
        if (this.isTargetingAbility) this.cancelAbilityTargeting();

        // If tutorial is active and this call isn't from tutorialManager itself, block map change.
        if (this.tutorialManager.isActive && !calledByTutorialManager) {
            this.ui.showMessage("Please complete or end the tutorial before changing maps.", 2500);
            if (this.ui.mapSelector.value !== this.currentMapId) {
                this.ui.mapSelector.value = this.currentMapId; // Revert UI selection
            }
            return;
        }

        const selectedMapData = this.availableMaps.find(m => m.id === mapId);

        if (selectedMapData) {
            console.log(`[Game.selectMap] Found map data for: ${selectedMapData.name}`);
            this.currentMapId = mapId;
            this.track.loadMapData(selectedMapData); // This logs "Loaded map: ..."

            this.ui.canvas.width = this.track.width * GRID_SIZE;
            this.ui.canvas.height = this.track.height * GRID_SIZE;
            this.ui.updateTrackSizeInputs(this.track.width, this.track.height);
            
            // Only update UI selector if not called by tutorial manager (it might be managing UI)
            // And also ensure the map selector is up-to-date if the map was changed programmatically (e.g. on init)
            if (!calledByTutorialManager && this.ui.mapSelector.value !== this.currentMapId) {
                this.ui.populateMapSelector(this.availableMaps, this.currentMapId);
            }


            this.resetGame(true); // Full reset for the new map (sets up players etc.)

            // Show message unless tutorial is starting or it was called by tutorial.
            if (!this.tutorialManager.isActive && !selectedMapData.isTutorial && !calledByTutorialManager) {
                 this.ui.showMessage(`Map "${selectedMapData.name}" loaded.`, 2000);
            }
           
            // This call will switch UI panels (game/editor)
            // For initial load, this.editorMode is false, so it switches to game panel.
            this.switchToMode(this.editorMode);

            // --- TUTORIAL TRIGGER LOGIC ---
            console.log(`[Game.selectMap] Checking tutorial condition for map: ${selectedMapData.name}`);
            console.log(`[Game.selectMap] selectedMapData.isTutorial value:`, selectedMapData.isTutorial, `(Type: ${typeof selectedMapData.isTutorial})`);
            console.log(`[Game.selectMap] calledByTutorialManager value:`, calledByTutorialManager, `(Type: ${typeof calledByTutorialManager})`);

            if (selectedMapData.isTutorial === true && !calledByTutorialManager) {
                console.log("[Game.selectMap] 'isTutorial' is true AND !calledByTutorialManager. Attempting to start tutorial.");
                this.tutorialManager.startTutorial();
            } else {
                console.log("[Game.selectMap] Tutorial condition NOT met. Will not start tutorial from here.");
                if (selectedMapData.isTutorial !== true) console.log(`[Game.selectMap] Reason: isTutorial is not true (value: ${selectedMapData.isTutorial}).`);
                if (calledByTutorialManager) console.log("[Game.selectMap] Reason: calledByTutorialManager is true.");
            }
            // --- END TUTORIAL TRIGGER LOGIC ---

        } else if (mapId === "custom") {
            console.log("[Game.selectMap] Selected 'custom' map option.");
            this.currentMapId = "custom";
            const w = parseInt(this.ui.trackWidthInput.value) || 30;
            const h = parseInt(this.ui.trackHeightInput.value) || 20;
            this.setTrackSize(w,h); // This will handle resetGame and switchToMode(true)
            // this.ui.populateMapSelector(this.availableMaps, "custom"); // setTrackSize handles this
            // this.ui.showMessage("Switched to custom track editor.", 2000); // setTrackSize handles this
        } else {
            console.error(`[Game.selectMap] Map ID "${mapId}" not found in availableMaps.`);
        }
    }

    resetGame(startNewGame = true) {
        console.log(`[Game.resetGame] Called with startNewGame: ${startNewGame}. Tutorial active: ${this.tutorialManager.isActive}`);
        
        if (this.tutorialManager.isActive && startNewGame) {
            // If tutorial is active, it manages its own player state largely.
            // A full game reset might disrupt it unless it's ending the tutorial.
            // TutorialManager.startTutorial will call this.setupPlayers and player.reset
            console.log("[Game.resetGame] Tutorial is active. Major game state reset might be handled by TutorialManager.");
        } else {
            this.gameOver = false; // Only reset gameOver if not in a tutorial-controlled reset
        }

        // Common reset logic for both game and some tutorial phases
        this.currentPlayerIndex = 0;
        if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
        this.hintActive = false;
        this.hintPlayerIndexShowing = -1;
        this.particles = [];
        this.globalTurnCounter = 0;
        if (this.isTargetingAbility) this.cancelAbilityTargeting();

        // Setup players based on numPlayers or 1 if tutorial just started
        // This should happen before trying to get start positions for them
        if (startNewGame || (!this.tutorialManager.isActive && this.players.length !== this.numPlayers)) {
            this.setupPlayers();
        }

        const startPositions = this.track.getStartPositions();
        if (startPositions.length === 0 && !this.editorMode && !this.tutorialManager.isActive) {
            this.ui.showMessage("No start positions on the track! Please add them in the editor.", 0);
            this.switchToMode(true); // Force editor mode
            return; // Stop reset if no start positions and not in editor/tutorial
        }
        
        // Reset player states
        // If tutorial is active, TutorialManager.startTutorial or step setups should handle player reset.
        // This is more for regular game resets or if tutorial calls resetGame(false).
        if (!this.tutorialManager.isActive || !startNewGame) {
            this.players.forEach((player, index) => {
                const pos = startPositions[index % startPositions.length] || {x:1, y:1}; // Fallback if not enough start pos
                player.reset(pos.x, pos.y);
            });
        }

        if(startNewGame && !this.tutorialManager.isActive) this.ui.hideMessage();
        this.ui.updateGameControls(this);
    }

    switchToMode(isEditor) {
        console.log(`[Game.switchToMode] Switching to editor: ${isEditor}. Tutorial active: ${this.tutorialManager.isActive}`);
        if (this.tutorialManager.isActive && isEditor) {
            console.log("[Game.switchToMode] Editor mode selected while tutorial active. Ending tutorial.");
            this.tutorialManager.endTutorial(); // End tutorial if switching to editor
        }
        this.editorMode = isEditor;
        if (this.isTargetingAbility) this.cancelAbilityTargeting();

        if (this.editorMode) {
            this.gameOver = true; // In editor, game is effectively "over" from play perspective
            if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
            this.hintActive = false;
            this.ui.hideMessage(); // Clear any game messages
        } else { // Switching to Game Mode
            if (!this.tutorialManager.isActive) { // Only validate if not in tutorial
                if (!this.track.isValid()) {
                    this.ui.showMessage("Track is missing Start or Finish tiles! Please add them in the editor.", 0);
                    this.editorMode = true; // Force back to editor
                } else {
                    // If coming from editor to valid play, reset game fully
                    // This was already handled by selectMap if a map was chosen.
                    // If "Apply & Play" from editor, a reset is good.
                    this.resetGame(true);
                }
            }
            // If tutorial is active, its own logic dictates game state.
        }
        this.ui.updateModeButtons(this.editorMode);
        this.ui.updateGameControls(this);
    }

    draw() {
        this.ui.ctx.clearRect(0, 0, this.ui.canvas.width, this.ui.canvas.height);
        this.track.draw(this.ui.ctx);

        if (!this.editorMode) {
            const unfinishedPlayers = this.players.filter(p => !p.finished);
            const finishedPlayers = this.players.filter(p => p.finished);
            
            // Draw finished players first (they are "under" active players if overlap)
            finishedPlayers.forEach(player => player.draw(this.ui.ctx));
            unfinishedPlayers.forEach(player => player.draw(this.ui.ctx));

            if (this.hintActive && this.players[this.hintPlayerIndexShowing] && !this.players[this.hintPlayerIndexShowing].finished) {
                this.drawHint(this.players[this.hintPlayerIndexShowing]);
            }
            if (this.isTargetingAbility && this.abilityBeingTargeted instanceof IceFieldAbility) {
                const player = this.players[this.currentPlayerIndex];
                this.ui.ctx.beginPath();
                this.ui.ctx.strokeStyle = 'rgba(255, 152, 0, 0.5)';
                this.ui.ctx.lineWidth = 2;
                this.ui.ctx.setLineDash([5, 5]);
                this.ui.ctx.arc(player.x * GRID_SIZE + GRID_SIZE / 2, player.y * GRID_SIZE + GRID_SIZE / 2, ICE_FIELD_PLACE_RADIUS * GRID_SIZE, 0, Math.PI * 2);
                this.ui.ctx.stroke();
                this.ui.ctx.setLineDash([]);
            }
        }
        this.particles.forEach(particle => { particle.update(); particle.draw(this.ui.ctx); });
        this.particles = this.particles.filter(p => p.life > 0 && p.size >= 0.5);
    }

    drawHint(player) {
        if (player.dx === 0 && player.dy === 0) return;
        const ctx = this.ui.ctx;
        const startX = player.x * GRID_SIZE + GRID_SIZE / 2;
        const startY = player.y * GRID_SIZE + GRID_SIZE / 2;
        const endX = (player.x + player.dx) * GRID_SIZE + GRID_SIZE / 2;
        const endY = (player.y + player.dy) * GRID_SIZE + GRID_SIZE / 2;
        ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 152, 0, 0.9)'; ctx.lineWidth = 4;
        ctx.setLineDash([6, 3]); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
        const arrowHeadSize = 12; const angle = Math.atan2(endY - startY, endX - startX);
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowHeadSize * Math.cos(angle - Math.PI / 6), endY - arrowHeadSize * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowHeadSize * Math.cos(angle + Math.PI / 6), endY - arrowHeadSize * Math.sin(angle + Math.PI / 6));
        ctx.stroke(); ctx.setLineDash([]);
    }

    activatePlayerAbility(abilityIndex) {
        if (this.gameOver || this.editorMode || this.isTargetingAbility) return;
        if (this.players.length === 0 || !this.players[this.currentPlayerIndex]) return;
        
        const player = this.players[this.currentPlayerIndex];
        if (!player || player.crashed || player.finished) return; // Extra check

        const ability = player.abilities[abilityIndex];

        if (ability && ability.canUse(player, this)) {
            this.lastAbilityUsed = ability; // Store for tutorial check
            if (ability.requiresTargeting) {
                this.isTargetingAbility = true;
                this.abilityBeingTargeted = ability;
                this.ui.canvas.style.cursor = 'crosshair';
                this.ui.canvas.classList.add('targeting-active');
                if (!this.isTargetingListenerActive) {
                    this.ui.canvas.addEventListener('click', this.targetCursorHandler, { once: true });
                    this.isTargetingListenerActive = true;
                }
                this.ui.updateGameControls(this); // Update UI to show targeting info
            } else {
                if (ability.activate(player, this)) {
                    ability.currentCharges--; 
                    if(!this.tutorialManager.isActive) this.ui.showMessage(`${player.name} used ${ability.name}!`, 1500);
                    
                    if (this.tutorialManager.isActive) {
                        this.tutorialManager.checkStepCompletion('ability_used');
                    }
                } else {
                    if(!this.tutorialManager.isActive) this.ui.showMessage(`${ability.name} could not be used.`, 1500);
                }
                this.ui.updateGameControls(this); // Update UI after ability use
            }
        }
    }

    cancelAbilityTargeting() {
        if (!this.isTargetingAbility) return;
        console.log("[Game.cancelAbilityTargeting] Targeting cancelled.");
        this.isTargetingAbility = false;
        this.abilityBeingTargeted = null; // Clear the ability
        this.ui.hideTargetingInfo();
        this.ui.canvas.style.cursor = '';
        this.ui.canvas.classList.remove('targeting-active');
        if (this.isTargetingListenerActive) {
            this.ui.canvas.removeEventListener('click', this.targetCursorHandler);
            this.isTargetingListenerActive = false;
        }
        this.ui.updateGameControls(this);
    }

    handleAbilityTargeting(event) {
        this.isTargetingListenerActive = false; // Listener was {once: true}

        if (!this.isTargetingAbility || !this.abilityBeingTargeted) {
            this.cancelAbilityTargeting(); 
            return;
        }

        const player = this.players[this.currentPlayerIndex];
        const rect = this.ui.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        const targetGridX = Math.floor(canvasX / GRID_SIZE);
        const targetGridY = Math.floor(canvasY / GRID_SIZE);
        
        let inRange = true;
        if (this.abilityBeingTargeted instanceof IceFieldAbility) {
            const distance = Math.sqrt(Math.pow(targetGridX - player.x, 2) + Math.pow(targetGridY - player.y, 2));
            inRange = distance <= ICE_FIELD_PLACE_RADIUS;
        }

        if (inRange) {
            if (this.abilityBeingTargeted.activate(player, this, { x: targetGridX, y: targetGridY })) {
                this.abilityBeingTargeted.currentCharges--;
                this.lastAbilityUsed = this.abilityBeingTargeted; // For tutorial
                if(!this.tutorialManager.isActive) this.ui.showMessage(`${player.name} used ${this.abilityBeingTargeted.name}!`, 2000);
                
                if (this.tutorialManager.isActive) {
                    // Use a more specific actionType if needed, e.g., 'ability_used_targeted'
                    this.tutorialManager.checkStepCompletion('ability_used');
                }
            } else {
                if(!this.tutorialManager.isActive) this.ui.showMessage(`Cannot place ${this.abilityBeingTargeted.name} there.`, 2000);
            }
        } else {
            if(!this.tutorialManager.isActive) this.ui.showMessage(`Target out of range for ${this.abilityBeingTargeted.name}. Click ability to try again.`, 2000);
        }
        
        // Reset targeting state AFTER processing
        this.isTargetingAbility = false;
        this.abilityBeingTargeted = null;
        this.ui.hideTargetingInfo();
        this.ui.canvas.style.cursor = '';
        this.ui.canvas.classList.remove('targeting-active');
        this.ui.updateGameControls(this);
    }

    handlePlayerMove(ddx, ddy) {
        if (this.gameOver || this.editorMode || this.players.length === 0) return;
        const player = this.players[this.currentPlayerIndex];
        if (!player || player.crashed || player.finished) { 
            if (!this.tutorialManager.isActive) this.nextTurn(); // Allow turn to pass if player is inactive
            return;
        }

        this.lastAccelerationInput = { ddx, ddy };

        let actualDdx = ddx; let actualDdy = ddy;
        if (player.isOnIce) {
            actualDdx = Math.round(ddx * 0.4) + (player.dx !== 0 && ddx === 0 ? Math.sign(player.dx) * Math.min(1, Math.abs(Math.floor(player.dx * 0.3))) : 0);
            actualDdy = Math.round(ddy * 0.4) + (player.dy !== 0 && ddy === 0 ? Math.sign(player.dy) * Math.min(1, Math.abs(Math.floor(player.dy * 0.3))) : 0);
            if (ddx === 0 && player.dx !== 0 && actualDdx === 0) actualDdx = Math.sign(player.dx);
            if (ddy === 0 && player.dy !== 0 && actualDdy === 0) actualDdy = Math.sign(player.dy);
        }
        player.dx += actualDdx; player.dy += actualDdy;

        const nextGridX = player.x + player.dx; const nextGridY = player.y + player.dy;
        let collisionOccurred = false; let otherPlayerHitGlobal = null;
        
        const wallCollisionResult = this.checkWallCollision(player.x, player.y, nextGridX, nextGridY);
        if (wallCollisionResult.collided) {
            if(!this.tutorialManager.isActive) this.ui.showMessage(`${player.name} crashed into a wall!`, 2000);
            this.crashPlayer(player);
            this.createExplosion(wallCollisionResult.crashPoint.x, wallCollisionResult.crashPoint.y, player.color);
            collisionOccurred = true;
        } else {
            const otherPlayerHit = this.checkPlayerCollision(player, nextGridX, nextGridY);
            if (otherPlayerHit) {
                if(!this.tutorialManager.isActive) this.ui.showMessage(`${player.name} and ${otherPlayerHit.name} collided!`, 2000);
                this.crashPlayer(player); this.crashPlayer(otherPlayerHit);
                this.createExplosion(Math.floor(nextGridX), Math.floor(nextGridY), player.color);
                this.createExplosion(Math.floor(otherPlayerHit.x), Math.floor(otherPlayerHit.y), otherPlayerHit.color);
                otherPlayerHitGlobal = otherPlayerHit; collisionOccurred = true;
            }
        }

        let tutorialActionForCompletion = 'accelerated'; // Default action

        if (collisionOccurred) {
            tutorialActionForCompletion = 'crashed';
            this.ui.updateGameControls(this); // Reflect crashed state
            
            setTimeout(() => {
                // In tutorial, we might not want to reset immediately, or let tutorial guide.
                // For now, consistent reset behavior.
                const startPositions = this.track.getStartPositions();
                let pos = startPositions[player.id % startPositions.length] || {x:1, y:1};
                player.reset(pos.x, pos.y);

                if (otherPlayerHitGlobal) {
                    pos = startPositions[otherPlayerHitGlobal.id % startPositions.length] || {x:1, y:1};
                    otherPlayerHitGlobal.reset(pos.x, pos.y);
                }
                this.ui.updateGameControls(this); // Update after reset
                if (this.tutorialManager.isActive) {
                    this.tutorialManager.checkStepCompletion(tutorialActionForCompletion);
                } else {
                    this.nextTurn();
                }
            }, (this.tutorialManager.isActive && !this.gameOver) ? 100 : 1500); // Faster reset if tutorial is active and game not over
        } else {
            player.setPosition(nextGridX, nextGridY);
            player.movesMade++;
            const currentTilePlayerIsOn = this.track.getTile(Math.floor(player.x), Math.floor(player.y));
            player.isOnIce = (currentTilePlayerIsOn === TILE_TYPES.ICE_FIELD);

            if (currentTilePlayerIsOn === TILE_TYPES.FINISH) {
                player.finished = true;
                tutorialActionForCompletion = 'finished';
                if(!this.tutorialManager.isActive) this.ui.showMessage(`${player.name} finished in ${player.movesMade} moves!`, 2000);
                this.createExplosion(Math.floor(player.x), Math.floor(player.y), player.color);
            }
            
            this.ui.updateGameControls(this); // Update after move, possibly finish

            if (this.tutorialManager.isActive) {
                this.tutorialManager.checkStepCompletion(tutorialActionForCompletion);
            } else {
                if (player.finished) this.checkGameCompletion();
                else this.nextTurn();
            }
        }
    }

    crashPlayer(player) {
        player.crashed = true;
        player.dx = 0; player.dy = 0;
        player.isOnIce = false; player.consecutiveIceMoves = 0;
    }

    checkWallCollision(startX, startY, endX, endY) {
        let x0 = Math.floor(startX); let y0 = Math.floor(startY);
        const x1 = Math.floor(endX); const y1 = Math.floor(endY);
        const dx_abs = Math.abs(x1 - x0); const dy_abs = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
        let err = dx_abs + dy_abs;
        while (true) {
            const tile = this.track.getTile(x0, y0);
            if (tile === TILE_TYPES.WALL || tile === TILE_TYPES.TEMP_WALL) {
                return { collided: true, crashPoint: { x: x0, y: y0 } };
            }
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy_abs) { err += dy_abs; x0 += sx; }
            if (e2 <= dx_abs) { err += dx_abs; y0 += sy; }
        } return { collided: false, crashPoint: null };
    }

    checkPlayerCollision(currentPlayer, nextX, nextY) {
        const targetX = Math.floor(nextX); const targetY = Math.floor(nextY);
        for (const other of this.players) {
            if (other.id === currentPlayer.id || other.crashed || other.finished) continue;
            if (Math.floor(other.x) === targetX && Math.floor(other.y) === targetY) return other;
        } return null;
    }

    checkGameCompletion() {
        if (this.tutorialManager.isActive) return; // Tutorial handles its own completion
        if (this.players.filter(p => !p.finished).length === 0 && this.players.length > 0) {
            this.gameOver = true; this.displayLeaderboard();
        }
    }

    displayLeaderboard() {
        const finished = this.players.filter(p => p.finished);
        finished.sort((a, b) => a.movesMade - b.movesMade);
        let html = `<h2>Race Over!</h2><table class="leaderboard-table"><thead><tr><th>Rank</th><th>Player</th><th>Moves</th></tr></thead><tbody>`;
        finished.forEach((p, i) => { html += `<tr><td>${i + 1}</td><td style="color:${p.color};font-weight:bold;">${p.name}</td><td>${p.movesMade}</td></tr>`; });
        if (finished.length === 0) html += '<tr><td colspan="3" style="text-align:center;">No players finished.</td></tr>';
        html += `</tbody></table><p style="margin-top:20px;">Press 'Restart Game' or select a new map to play again.</p>`;
        this.ui.showMessage(html, 0); this.ui.updateGameControls(this);
    }

    nextTurn() {
        if (this.tutorialManager.isActive) {
            // Tutorial might not use standard turn advancement or controls it differently.
            // Game controls should be updated by tutorialManager.loadStep or checkStepCompletion
            console.log("[Game.nextTurn] Tutorial active, standard turn advancement skipped.");
            this.ui.updateGameControls(this); // Ensure UI reflects current tutorial player
            return;
        }
        if (this.gameOver || this.editorMode) { this.ui.updateGameControls(this); return; }

        this.globalTurnCounter++;
        let nextPlayerFound = false;
        for (let i = 0; i < this.players.length; i++) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            const activePlayer = this.players[this.currentPlayerIndex];
            if (activePlayer.crashed) activePlayer.crashed = false; // Player is no longer crashed for their new turn
            if (!activePlayer.finished) { nextPlayerFound = true; break; }
        }
        if (!nextPlayerFound && this.players.every(p => p.finished) && this.players.length > 0) {
            if (!this.gameOver) { // Ensure leaderboard only shown once
                 this.gameOver = true; this.displayLeaderboard();
            }
        }
        this.ui.updateGameControls(this);
    }

    handleCanvasInteraction(event, isDrag = false) {
        if (!this.editorMode || (this.tutorialManager.isActive && !this.editorMode)) return; // Block if not editor OR tutorial is active and not in editor
        if (this.isTargetingAbility) return; // Block editor drawing if targeting an ability

        const rect = this.ui.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left; const canvasY = event.clientY - rect.top;
        const cellX = Math.floor(canvasX / GRID_SIZE); const cellY = Math.floor(canvasY / GRID_SIZE);
        if (cellX < 0 || cellX >= this.track.width || cellY < 0 || cellY >= this.track.height) return;

        const tileToSet = event.shiftKey ? TILE_TYPES.EMPTY : this.selectedTileTypeInEditor;
        if (event.shiftKey && tileToSet === TILE_TYPES.EMPTY) {
            this.track.removeTemporaryTile(cellX, cellY); 
            if (this.track.grid[cellY]?.[cellX] !== TILE_TYPES.EMPTY) {
                 this.track.setTile(cellX, cellY, TILE_TYPES.EMPTY);
            }
        } else if (this.track.getTile(cellX, cellY) !== tileToSet) { // Only set if different
             this.track.setTile(cellX, cellY, tileToSet);
        }
    }

    bindEvents() {
        this.ui.switchToGameModeButton.addEventListener('click', () => {
            this.switchToMode(false);
            this.ui.switchToGameModeButton.setAttribute('aria-pressed', 'true');
            this.ui.switchToEditorModeButton.setAttribute('aria-pressed', 'false');
        });
        this.ui.switchToEditorModeButton.addEventListener('click', () => {
            this.switchToMode(true);
            this.ui.switchToGameModeButton.setAttribute('aria-pressed', 'false');
            this.ui.switchToEditorModeButton.setAttribute('aria-pressed', 'true');
        });

        this.ui.addPlayerButton.addEventListener('click', () => this.addPlayer());
        this.ui.removePlayerButton.addEventListener('click', () => this.removePlayer());
        
        this.ui.applyTrackSizeButton.addEventListener('click', () => {
            if (this.tutorialManager.isActive) return;
            const w = parseInt(this.ui.trackWidthInput.value); 
            const h = parseInt(this.ui.trackHeightInput.value);
            this.setTrackSize(w, h);
        });
        this.ui.mapSelector.addEventListener('change', (e) => {
            this.selectMap(e.target.value);
        });

        this.ui.resetGameButton.addEventListener('click', () => {
            if (this.tutorialManager.isActive) {
                console.log("[Reset Game Button] Tutorial active. Ending tutorial.");
                this.tutorialManager.endTutorial(); // Default action: end tutorial.
                // Optionally, could have a "Restart Tutorial" logic here
            } else {
                this.ui.hideMessage(); this.resetGame(true);
            }
        });
        
        this.ui.accelerationButtons.forEach(b => {
            b.addEventListener('click', (e) => {
                if (this.players.length === 0 || !this.players[this.currentPlayerIndex]) return;
                const ddx = parseInt(e.currentTarget.dataset.ddx);
                const ddy = parseInt(e.currentTarget.dataset.ddy);
                this.handlePlayerMove(ddx, ddy);
            });
        });

        this.ui.hintButton.addEventListener('click', () => {
            if (this.gameOver || this.editorMode || this.hintActive || this.players.length === 0) return;
            if (this.tutorialManager.isActive) { // Disable hints during tutorial for now
                this.ui.showMessage("Hints are disabled during the tutorial.", 1500);
                return;
            }
            const p = this.players[this.currentPlayerIndex];
            if (!p || p.crashed || p.finished) return;
            if (p.hints > 0) {
                p.hints--; this.hintActive = true; this.hintPlayerIndexShowing = this.currentPlayerIndex;
                this.ui.updateGameControls(this);
                if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
                this.hintTimeoutId = setTimeout(() => { this.hintActive = false; this.hintPlayerIndexShowing = -1; this.ui.updateGameControls(this); }, HINT_DURATION);
            }
        });

        this.ui.canvas.addEventListener('mousedown', (e) => { if (this.editorMode && !(this.tutorialManager.isActive && !this.editorMode) && !this.isTargetingAbility) { this.isDrawingInEditor = true; this.handleCanvasInteraction(e); } });
        this.ui.canvas.addEventListener('mousemove', (e) => { if (this.editorMode && !(this.tutorialManager.isActive && !this.editorMode) && this.isDrawingInEditor && !this.isTargetingAbility) this.handleCanvasInteraction(e, true); });
        this.ui.canvas.addEventListener('mouseup', () => { if (this.editorMode && !(this.tutorialManager.isActive && !this.editorMode)) this.isDrawingInEditor = false; });
        this.ui.canvas.addEventListener('mouseleave', () => { if (this.editorMode && !(this.tutorialManager.isActive && !this.editorMode)) this.isDrawingInEditor = false; });

        this.ui.tileSelectorButtons.forEach(b => {
            b.addEventListener('click', (e) => {
                if (this.tutorialManager.isActive) return;
                const typeKey = e.currentTarget.dataset.tileType.toUpperCase();
                this.selectedTileTypeInEditor = TILE_TYPES[typeKey];
                this.ui.selectTileButton(typeKey);
            });
        });
        this.ui.applyTrackAndPlayButton.addEventListener('click', () => {
            if (this.tutorialManager.isActive) { this.tutorialManager.endTutorial(); }
            this.switchToMode(false); // Switch to game mode
        });
        
        this.ui.resetTrackToDefaultButton.addEventListener('click', () => {
            if (this.tutorialManager.isActive) return;
            if (this.editorMode) {
                if (this.currentMapId !== "custom" && this.currentMapId !== "tutorial_map") { // Don't reset tutorial map this way
                    const mapToReload = this.availableMaps.find(m => m.id === this.currentMapId);
                    if (mapToReload) {
                        this.track.loadMapData(mapToReload);
                        this.ui.canvas.width = this.track.width * GRID_SIZE;
                        this.ui.canvas.height = this.track.height * GRID_SIZE;
                        this.ui.updateTrackSizeInputs(this.track.width, this.track.height);
                        this.ui.showMessage(`Map "${mapToReload.name}" reset to default.`, 2000);
                        this.resetGame(false); // Soft reset, keep editor mode
                    }
                } else { // Custom map
                    this.track.clear();
                    this.ui.showMessage("Custom track cleared (borders remain).", 2000);
                    this.resetGame(false);
                }
            }
        });
        this.ui.clearTrackButton.addEventListener('click', () => { 
            if (this.tutorialManager.isActive) return;
            if (this.editorMode) { 
                this.track.clear(); 
                if (this.currentMapId !== "custom") {
                    this.currentMapId = "custom"; // Track is now custom
                    this.ui.populateMapSelector(this.availableMaps, "custom");
                }
                this.ui.showMessage("Track cleared (borders remain).", 2000); 
                this.resetGame(false);
            } 
        });
        document.addEventListener('keydown', (e) => {
            if (this.isTargetingAbility && e.key === "Escape") { this.cancelAbilityTargeting(); return; }
            if (!this.editorMode || (this.tutorialManager.isActive && !this.editorMode)) return; // Disable hotkeys during tutorial or if not in editor
            
            const key = e.key.toUpperCase(); let typeKey = null;
            if (key === 'W') typeKey = 'WALL'; else if (key === 'E') typeKey = 'EMPTY';
            else if (key === 'S') typeKey = 'START'; else if (key === 'F') typeKey = 'FINISH';
            if (typeKey && TILE_TYPES.hasOwnProperty(typeKey)) { this.selectedTileTypeInEditor = TILE_TYPES[typeKey]; this.ui.selectTileButton(typeKey); }
        });
    }
}