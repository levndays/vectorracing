// js/core/game.js

import {
    GRID_SIZE, DEFAULT_TRACK_WIDTH, DEFAULT_TRACK_HEIGHT,
    MIN_TRACK_SIZE, MAX_TRACK_WIDTH, MAX_TRACK_HEIGHT, TILE_TYPES,
    NUM_EXPLOSION_PARTICLES, ICE_FIELD_PLACE_RADIUS, PLAYER_BASE_COLORS, // Added PLAYER_BASE_COLORS
    MAX_PLAYERS, MIN_PLAYERS, MAX_HINTS, HINT_DURATION // Added these constants
} from '../constants.js';
import { Player } from '../entities/player.js';
import { Track } from '../entities/track.js';
import { Particle } from '../entities/particle.js';
import { UIManager } from '../ui/uiManager.js';
import { InstaStopAbility } from '../abilities/instaStopAbility.js';
import { TemporaryWallAbility } from '../abilities/temporaryWallAbility.js';
import { IceFieldAbility } from '../abilities/iceFieldAbility.js';
import { hexToRgba } from '../utils.js'; // Import utility

export class Game {
    constructor() {
        this.ui = new UIManager();
        this.track = new Track(DEFAULT_TRACK_WIDTH, DEFAULT_TRACK_HEIGHT);
        this.players = [];
        this.numPlayers = MIN_PLAYERS; // Start with min players
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
        this.isTargetingAbility = false;
        this.abilityBeingTargeted = null;
        this.targetCursorHandler = (event) => this.handleAbilityTargeting(event); // Pre-bind 'this'

        // Ensure this.availableAbilities is defined before setupPlayers is called in init
        this.availableAbilities = [InstaStopAbility, TemporaryWallAbility, IceFieldAbility];
        
        this.init();
    }

    init() {
        this.ui.canvas.width = this.track.width * GRID_SIZE;
        this.ui.canvas.height = this.track.height * GRID_SIZE;
        this.ui.updateTrackSizeInputs(this.track.width, this.track.height);
        this.ui.updatePlayerCount(this.numPlayers); // Initialize with current numPlayers

        this.setupPlayers(); // Now this.availableAbilities exists
        this.resetGame(false); // Initial reset
        this.bindEvents();
        this.switchToMode(false); // Default to game mode
        this.ui.selectTileButton('WALL'); // Default editor tile
        this.gameLoop(); // Start animation loop
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
                if (!ownerAbility) { // If the ability is no longer active, remove its tiles
                    tilesToRemove.push({ x: tile.x, y: tile.y, ownerId: tile.ownerId, type: tile.type });
                }
            }
        });

        tilesToRemove.forEach(tr => this.track.removeTemporaryTile(tr.x, tr.y, tr.ownerId, tr.type));
    }

    createExplosion(gridX, gridY, playerColor) {
        const canvasX = gridX * GRID_SIZE + GRID_SIZE / 2;
        const canvasY = gridY * GRID_SIZE + GRID_SIZE / 2;
        const baseParticleColor = playerColor ? hexToRgba(playerColor, 1) : undefined; // Use imported hexToRgba
        for (let i = 0; i < NUM_EXPLOSION_PARTICLES; i++) {
            let pColor = baseParticleColor;
            if (i % 3 === 1) pColor = hexToRgba("#FFFF64", 1); // Yellowish white
            if (i % 3 === 2) pColor = hexToRgba("#B4B4B4", 1); // Grey
            this.particles.push(new Particle(canvasX, canvasY, pColor));
        }
    }

    setupPlayers() {
        this.players = [];
        this.usedPlayerColors.clear();
        for (let i = 0; i < this.numPlayers; i++) {
            const color = this.getNextAvailableColor();
            const player = new Player(i, `Player ${i + 1}`, color);
            player.assignAbilities(this.availableAbilities);
            this.players.push(player);
            this.usedPlayerColors.add(color);
        }
    }

    getNextAvailableColor() {
        for (const color of PLAYER_BASE_COLORS) { // Use imported PLAYER_BASE_COLORS
            if (!this.usedPlayerColors.has(color)) {
                return color;
            }
        }
        return `rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`;
    }

    addPlayer() {
        if (this.numPlayers < MAX_PLAYERS) {
            this.numPlayers++;
            this.ui.updatePlayerCount(this.numPlayers);
            this.setupPlayers();
            this.resetGame(true);
        }
    }

    removePlayer() {
        if (this.numPlayers > MIN_PLAYERS) {
            this.numPlayers--;
            this.ui.updatePlayerCount(this.numPlayers);
            this.setupPlayers();
            this.resetGame(true);
        }
    }

    setTrackSize(newWidth, newHeight) {
        newWidth = Math.max(MIN_TRACK_SIZE, Math.min(MAX_TRACK_WIDTH, newWidth));
        newHeight = Math.max(MIN_TRACK_SIZE, Math.min(MAX_TRACK_HEIGHT, newHeight));
        this.track = new Track(newWidth, newHeight); // Track will use its constants
        this.ui.canvas.width = newWidth * GRID_SIZE;
        this.ui.canvas.height = newHeight * GRID_SIZE;
        this.ui.updateTrackSizeInputs(newWidth, newHeight);
        this.resetGame(true);
        this.ui.showMessage("Track size changed. Track reset to default.", 2000);
        this.switchToMode(this.editorMode);
    }

    resetGame(startNewGame = true) {
        this.gameOver = false;
        this.currentPlayerIndex = 0;
        if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
        this.hintActive = false;
        this.hintPlayerIndexShowing = -1;
        this.particles = [];
        this.globalTurnCounter = 0;
        this.track.temporaryTiles = [];
        this.isTargetingAbility = false;
        this.abilityBeingTargeted = null;
        if (this.targetCursorHandler && this.ui.canvas.getAttribute('listenerAttached') === 'true') { // Check if listener was actually attached
            this.ui.canvas.removeEventListener('click', this.targetCursorHandler);
            this.ui.canvas.removeAttribute('listenerAttached');
            this.ui.canvas.style.cursor = '';
            this.ui.canvas.classList.remove('targeting-active');
        }

        const startPositions = this.track.getStartPositions();
        if (startPositions.length === 0 && !this.editorMode) {
            this.ui.showMessage("No start positions on the track! Please add them in the editor.", 0);
            this.switchToMode(true);
            return;
        }
        this.players.forEach(player => player.crashed = false);
        this.players.forEach((player, index) => {
            const pos = startPositions[index % startPositions.length];
            player.reset(pos.x, pos.y);
        });
        this.ui.hideMessage();
        this.ui.updateGameControls(this);
    }

    switchToMode(isEditor) {
        this.editorMode = isEditor;
        if (this.isTargetingAbility) { // Cancel targeting if switching modes
            this.cancelAbilityTargeting();
        }
        if (this.editorMode) {
            this.gameOver = true;
            if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
            this.hintActive = false;
            this.ui.hideMessage();
        } else {
            if (!this.track.isValid()) {
                this.ui.showMessage("Track is missing Start or Finish tiles! Please add them in the editor.", 0);
                this.editorMode = true; // Force back to editor
            } else {
                this.resetGame(true);
            }
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
            finishedPlayers.forEach(player => player.draw(this.ui.ctx));
            unfinishedPlayers.forEach(player => player.draw(this.ui.ctx));

            if (this.hintActive && this.players[this.hintPlayerIndexShowing] && !this.players[this.hintPlayerIndexShowing].finished) {
                this.drawHint(this.players[this.hintPlayerIndexShowing]);
            }
            // Draw targeting range indicator
            if (this.isTargetingAbility && this.abilityBeingTargeted instanceof IceFieldAbility) {
                const player = this.players[this.currentPlayerIndex];
                this.ui.ctx.beginPath();
                this.ui.ctx.strokeStyle = 'rgba(255, 152, 0, 0.5)'; // Hint color, semi-transparent
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
        const player = this.players[this.currentPlayerIndex];
        const ability = player?.abilities[abilityIndex];

        if (ability && ability.canUse(player, this)) {
            if (ability.requiresTargeting) {
                this.isTargetingAbility = true;
                this.abilityBeingTargeted = ability;
                this.ui.canvas.style.cursor = 'crosshair';
                this.ui.canvas.classList.add('targeting-active');
                this.ui.updateGameControls(this); // This will show targeting info via UIManager
                this.ui.canvas.addEventListener('click', this.targetCursorHandler, { once: true });
                this.ui.canvas.setAttribute('listenerAttached', 'true'); // Mark that listener is on
            } else {
                if (ability.activate(player, this)) {
                    ability.currentCharges--; 
                }
                this.ui.updateGameControls(this);
            }
        }
    }

    cancelAbilityTargeting() {
        if (!this.isTargetingAbility) return;
        console.log("Targeting cancelled by user.");
        this.isTargetingAbility = false;
        // this.abilityBeingTargeted = null; // Keep for now, it's reset if another ability is chosen
        this.ui.hideTargetingInfo();
        this.ui.canvas.style.cursor = '';
        this.ui.canvas.classList.remove('targeting-active');
        // {once: true} on listener auto-removes it. If a different click triggered it, it's already gone.
        // But if this cancel is called before any click, we need to remove it if it was set.
        if (this.ui.canvas.getAttribute('listenerAttached') === 'true') {
            this.ui.canvas.removeEventListener('click', this.targetCursorHandler);
            this.ui.canvas.removeAttribute('listenerAttached');
        }
        this.ui.updateGameControls(this);
    }

    handleAbilityTargeting(event) {
        this.ui.canvas.removeAttribute('listenerAttached'); // Listener has fired or is being removed

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
        const distance = Math.sqrt(Math.pow(targetGridX - player.x, 2) + Math.pow(targetGridY - player.y, 2));

        let activatedSuccessfully = false;
        if (distance <= ICE_FIELD_PLACE_RADIUS) {
            if (this.abilityBeingTargeted.activate(player, this, { x: targetGridX, y: targetGridY })) {
                this.abilityBeingTargeted.currentCharges--;
                activatedSuccessfully = true;
                this.ui.showMessage(`${player.name} used ${this.abilityBeingTargeted.name}!`, 2000);
            } else {
                this.ui.showMessage(`Cannot place ${this.abilityBeingTargeted.name} there. (Placement failed)`, 2000);
            }
        } else {
            this.ui.showMessage(`Target out of range for ${this.abilityBeingTargeted.name}. Click ability to try again.`, 2000);
            // Charge not consumed
        }
        
        this.isTargetingAbility = false;
        // this.abilityBeingTargeted = null; // Allow re-selection
        this.ui.hideTargetingInfo();
        this.ui.canvas.style.cursor = '';
        this.ui.canvas.classList.remove('targeting-active');
        this.ui.updateGameControls(this);
    }

    handlePlayerMove(ddx, ddy) {
        if (this.gameOver || this.editorMode || this.players.length === 0) return;
        const player = this.players[this.currentPlayerIndex];
        if (player.crashed || player.finished) { this.nextTurn(); return; }

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
        let wallCrashSite = { x: Math.floor(nextGridX), y: Math.floor(nextGridY) };

        const wallCollisionResult = this.checkWallCollision(player.x, player.y, nextGridX, nextGridY);
        if (wallCollisionResult.collided) {
            this.ui.showMessage(`${player.name} crashed into a wall!`, 2000);
            this.crashPlayer(player);
            wallCrashSite = wallCollisionResult.crashPoint;
            this.createExplosion(wallCrashSite.x, wallCrashSite.y, player.color);
            collisionOccurred = true;
        } else {
            const otherPlayerHit = this.checkPlayerCollision(player, nextGridX, nextGridY);
            if (otherPlayerHit) {
                this.ui.showMessage(`${player.name} and ${otherPlayerHit.name} collided!`, 2000);
                this.crashPlayer(player); this.crashPlayer(otherPlayerHit);
                this.createExplosion(Math.floor(nextGridX), Math.floor(nextGridY), player.color);
                this.createExplosion(Math.floor(otherPlayerHit.x), Math.floor(otherPlayerHit.y), otherPlayerHit.color);
                otherPlayerHitGlobal = otherPlayerHit; collisionOccurred = true;
            }
        }

        if (collisionOccurred) {
            this.ui.updateGameControls(this); // Update controls before timeout potentially changes player
            setTimeout(() => {
                const startPositions = this.track.getStartPositions();
                let pos = startPositions[player.id % startPositions.length];
                player.reset(pos.x, pos.y); // player.crashed is set to false in reset
                // player.crashed = false; // Explicitly ensure cleared

                if (otherPlayerHitGlobal) {
                    pos = startPositions[otherPlayerHitGlobal.id % startPositions.length];
                    otherPlayerHitGlobal.reset(pos.x, pos.y);
                    // otherPlayerHitGlobal.crashed = false;
                }
                this.nextTurn();
            }, 1500);
        } else {
            player.setPosition(nextGridX, nextGridY);
            player.movesMade++;
            const currentTilePlayerIsOn = this.track.getTile(Math.floor(player.x), Math.floor(player.y));
            player.isOnIce = (currentTilePlayerIsOn === TILE_TYPES.ICE_FIELD);

            if (currentTilePlayerIsOn === TILE_TYPES.FINISH) {
                player.finished = true;
                this.ui.showMessage(`${player.name} finished in ${player.movesMade} moves!`, 2000);
                this.createExplosion(Math.floor(player.x), Math.floor(player.y), player.color);
                this.checkGameCompletion();
            }
            this.nextTurn(); // nextTurn handles its own UI update
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
        html += `</tbody></table><p style="margin-top:20px;">Press 'Restart Game' to play again.</p>`;
        this.ui.showMessage(html, 0); this.ui.updateGameControls(this);
    }

    nextTurn() {
        this.globalTurnCounter++;
        if (this.gameOver || this.editorMode) { this.ui.updateGameControls(this); return; }

        let nextPlayerFound = false;
        for (let i = 0; i < this.players.length; i++) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            const activePlayer = this.players[this.currentPlayerIndex];
            if (activePlayer.crashed) activePlayer.crashed = false; // Clear crash for their new turn
            if (!activePlayer.finished) { nextPlayerFound = true; break; }
        }
        if (!nextPlayerFound && this.players.every(p => p.finished) && this.players.length > 0) {
            if (!this.gameOver) { this.gameOver = true; this.displayLeaderboard(); }
        }
        this.ui.updateGameControls(this); // Update for new current player
    }

    handleCanvasInteraction(event, isDrag = false) {
        if (!this.editorMode) return;
        const rect = this.ui.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left; const canvasY = event.clientY - rect.top;
        const cellX = Math.floor(canvasX / GRID_SIZE); const cellY = Math.floor(canvasY / GRID_SIZE);
        if (cellX < 0 || cellX >= this.track.width || cellY < 0 || cellY >= this.track.height) return;

        const tileToSet = event.shiftKey ? TILE_TYPES.EMPTY : this.selectedTileTypeInEditor;
        // Allow erasing temp tiles in editor mode with shift+click (EMPTY)
        if (event.shiftKey && tileToSet === TILE_TYPES.EMPTY) {
            this.track.removeTemporaryTile(cellX, cellY); // Remove any type of temp tile
            // Also set base grid to empty if it wasn't already
            if (this.track.grid[cellY]?.[cellX] !== TILE_TYPES.EMPTY) {
                 this.track.setTile(cellX, cellY, TILE_TYPES.EMPTY);
            }
        } else if (this.track.getTile(cellX, cellY) !== tileToSet) { // getTile includes temp tiles
             this.track.setTile(cellX, cellY, tileToSet); // setTile for permanent changes
        }
    }

    bindEvents() {
        this.ui.switchToGameModeButton.addEventListener('click', () => this.switchToMode(false));
        this.ui.switchToEditorModeButton.addEventListener('click', () => this.switchToMode(true));
        this.ui.addPlayerButton.addEventListener('click', () => this.addPlayer());
        this.ui.removePlayerButton.addEventListener('click', () => this.removePlayer());
        this.ui.applyTrackSizeButton.addEventListener('click', () => {
            const w = parseInt(this.ui.trackWidthInput.value); const h = parseInt(this.ui.trackHeightInput.value);
            this.setTrackSize(w, h);
        });
        this.ui.resetGameButton.addEventListener('click', () => { this.ui.hideMessage(); this.resetGame(true) });
        this.ui.accelerationButtons.forEach(b => {
            b.addEventListener('click', (e) => {
                const ddx = parseInt(e.currentTarget.dataset.ddx); const ddy = parseInt(e.currentTarget.dataset.ddy);
                this.handlePlayerMove(ddx, ddy);
            });
        });
        this.ui.hintButton.addEventListener('click', () => {
            if (this.gameOver || this.editorMode || this.hintActive || this.players.length === 0) return;
            const p = this.players[this.currentPlayerIndex];
            if (p.crashed || p.finished) return;
            if (p.hints > 0) {
                p.hints--; this.hintActive = true; this.hintPlayerIndexShowing = this.currentPlayerIndex;
                this.ui.updateGameControls(this);
                if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
                this.hintTimeoutId = setTimeout(() => { this.hintActive = false; this.hintPlayerIndexShowing = -1; this.ui.updateGameControls(this); }, HINT_DURATION);
            }
        });
        // Canvas mousedown/move/up/leave for editor drawing (not targeting)
        this.ui.canvas.addEventListener('mousedown', (e) => { if (this.editorMode && !this.isTargetingAbility) { this.isDrawingInEditor = true; this.handleCanvasInteraction(e); } });
        this.ui.canvas.addEventListener('mousemove', (e) => { if (this.editorMode && this.isDrawingInEditor && !this.isTargetingAbility) this.handleCanvasInteraction(e, true); });
        this.ui.canvas.addEventListener('mouseup', () => { if (this.editorMode) this.isDrawingInEditor = false; });
        this.ui.canvas.addEventListener('mouseleave', () => { if (this.editorMode) this.isDrawingInEditor = false; });

        this.ui.tileSelectorButtons.forEach(b => {
            b.addEventListener('click', (e) => {
                const typeKey = e.currentTarget.dataset.tileType.toUpperCase();
                this.selectedTileTypeInEditor = TILE_TYPES[typeKey];
                this.ui.selectTileButton(typeKey);
            });
        });
        this.ui.applyTrackAndPlayButton.addEventListener('click', () => this.switchToMode(false));
        this.ui.resetTrackToDefaultButton.addEventListener('click', () => { if (this.editorMode) { this.track.resetToDefault(); this.ui.showMessage("Track reset to default.", 2000); } });
        this.ui.clearTrackButton.addEventListener('click', () => { if (this.editorMode) { this.track.clear(); this.ui.showMessage("Track cleared (borders remain).", 2000); } });
        document.addEventListener('keydown', (e) => {
            if (this.isTargetingAbility && e.key === "Escape") { this.cancelAbilityTargeting(); return; }
            if (!this.editorMode) return;
            const key = e.key.toUpperCase(); let typeKey = null;
            if (key === 'W') typeKey = 'WALL'; else if (key === 'E') typeKey = 'EMPTY';
            else if (key === 'S') typeKey = 'START'; else if (key === 'F') typeKey = 'FINISH';
            if (typeKey && TILE_TYPES.hasOwnProperty(typeKey)) { this.selectedTileTypeInEditor = TILE_TYPES[typeKey]; this.ui.selectTileButton(typeKey); }
        });
    }
}