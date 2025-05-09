// js/entities/track.js

import { GRID_SIZE, TILE_TYPES } from '../constants.js';

export class Track {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = this.createEmptyGrid(); // Base grid for permanent tiles
        this.temporaryTiles = []; // Stores {x, y, type, ownerId, expiresOnTurn, originalTile}
        this.resetToDefault(); // Applies default track data to this.grid
    }

    createEmptyGrid() {
        return Array(this.height).fill(null).map(() => Array(this.width).fill(TILE_TYPES.EMPTY));
    }

    generateDefaultTrackData() {
        const newTrack = Array(this.height).fill(null).map(() => Array(this.width).fill(TILE_TYPES.EMPTY));
        // Border walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    newTrack[y][x] = TILE_TYPES.WALL;
                }
            }
        }
        // Default Start/Finish and obstacles
        if (this.width > 10 && this.height > 10) {
            newTrack[2][2] = TILE_TYPES.START;
            newTrack[2][3] = TILE_TYPES.START;
            newTrack[this.height - 3][this.width - 3] = TILE_TYPES.FINISH;
            newTrack[this.height - 3][this.width - 4] = TILE_TYPES.FINISH;

            const midX = Math.floor(this.width / 2);
            if (this.height > 15) {
                for (let i = Math.floor(this.height * 0.2); i < Math.floor(this.height * 0.8); i++) {
                    if (newTrack[i]) newTrack[i][midX] = TILE_TYPES.WALL;
                }
            }
        }
        return newTrack;
    }

    resetToDefault() {
        const defaultData = this.generateDefaultTrackData();
        // Deep copy defaultData to this.grid
        this.grid = defaultData.map(row => [...row]);
        this.temporaryTiles = []; // Clear all temporary tiles
    }

    clear() { // Clears user-placed stuff from base grid, keeps border walls from default
        this.grid = this.createEmptyGrid(); // Start with all empty
        for (let y = 0; y < this.height; y++) { // Re-add border walls
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.grid[y][x] = TILE_TYPES.WALL;
                }
            }
        }
        this.temporaryTiles = [];
    }

    // For editor: sets permanent tiles on the base grid
    setTile(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            // In editor, if placing a permanent tile, it should probably clear any temp tile at that spot.
            // Or, prevent placing permanent over temporary. For now, let's clear temp.
            this.removeTemporaryTile(x, y); 
            this.grid[y][x] = type;
        }
    }

    /*
     * Adds or replaces a temporary tile.
     * @param {number} x - X grid coordinate.
     * @param {number} y - Y grid coordinate.
     * @param {number} type - TILE_TYPES value for the temporary tile.
     * @param {number} ownerId - ID of the player or entity that placed the tile.
     * @param {number} [expiresOnTurn=-1] - Global turn number when this tile should expire. -1 for indefinite (managed by ability).
     */

    setTemporaryTile(x, y, type, ownerId, expiresOnTurn = -1) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.removeTemporaryTile(x, y); // Ensure no duplicate temporary tile at the same spot
            const originalBaseTile = (this.grid[y] && typeof this.grid[y][x] !== 'undefined') ? this.grid[y][x] : TILE_TYPES.EMPTY;
            this.temporaryTiles.push({ x, y, type, ownerId, expiresOnTurn, originalTile: originalBaseTile });
        }
    }

    /**
     * Removes a temporary tile.
     * @param {number} x - X grid coordinate.
     * @param {number} y - Y grid coordinate.
     * @param {number|null} [specificOwnerId=null] - If provided, only remove if owner matches.
     * @param {number|null} [specificType=null] - If provided, only remove if type matches.
     */
    removeTemporaryTile(x, y, specificOwnerId = null, specificType = null) {
        this.temporaryTiles = this.temporaryTiles.filter(tile => {
            const posMatch = tile.x === x && tile.y === y;
            const ownerMatch = !specificOwnerId || tile.ownerId === specificOwnerId;
            const typeMatch = !specificType || tile.type === specificType;
            return !(posMatch && ownerMatch && typeMatch);
        });
    }

    // Gets the effective tile type at a coordinate, considering temporary tiles first.
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return TILE_TYPES.WALL; // Out of bounds is always a wall
        }
        const tempTile = this.temporaryTiles.find(t => t.x === x && t.y === y);
        if (tempTile) {
            return tempTile.type;
        }
        return (this.grid[y] && typeof this.grid[y][x] !== 'undefined') ? this.grid[y][x] : TILE_TYPES.EMPTY;
    }

    getStartPositions() {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === TILE_TYPES.START) { // Start positions are on the base grid
                    positions.push({ x, y });
                }
            }
        }
        if (positions.length === 0) {
            // Fallback if no start tiles are defined
            const fallbackX = Math.max(1, Math.floor(this.width / 10));
            const fallbackY = Math.max(1, Math.floor(this.height / 10));
            return [{ x: fallbackX, y: fallbackY }];
        }
        return positions;
    }

    isValid() {
        let hasStart = false;
        let hasFinish = false;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === TILE_TYPES.START) hasStart = true;
                if (this.grid[y][x] === TILE_TYPES.FINISH) hasFinish = true;
            }
        }
        return hasStart && hasFinish;
    }

    draw(ctx) {
        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let x_coord = 0; x_coord <= this.width * GRID_SIZE; x_coord += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(x_coord, 0); ctx.lineTo(x_coord, this.height * GRID_SIZE); ctx.stroke();
        }
        for (let y_coord = 0; y_coord <= this.height * GRID_SIZE; y_coord += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, y_coord); ctx.lineTo(this.width * GRID_SIZE, y_coord); ctx.stroke();
        }

        // Draw base grid tiles first
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.drawSingleTile(ctx, x, y, this.grid[y][x], false);
            }
        }
        // Then draw temporary tiles on top
        this.temporaryTiles.forEach(tile => {
            this.drawSingleTile(ctx, tile.x, tile.y, tile.type, true);
        });
    }

    drawSingleTile(ctx, x, y, tileType, isTemporary = false) {
        const cellX = x * GRID_SIZE;
        const cellY = y * GRID_SIZE;
        let color;

        // If drawing a temporary tile that should be transparent (like ice),
        // the base tile underneath it should have already been drawn.
        if (isTemporary && (tileType === TILE_TYPES.ICE_FIELD)) {
            // The base tile was drawn in the first loop. Now we overlay the ice.
        }

        switch (tileType) {
            case TILE_TYPES.EMPTY:
                // No color, effectively transparent or background color of canvas shows
                break;
            case TILE_TYPES.WALL:
                color = '#6c757d';
                break;
            case TILE_TYPES.START:
                color = '#90ee90'; // Lighter green
                break;
            case TILE_TYPES.FINISH:
                color = '#ffd700'; // Gold
                break;
            case TILE_TYPES.TEMP_WALL:
                color = '#a0522d'; // Brownish for temporary wall
                break;
            case TILE_TYPES.ICE_FIELD:
                color = 'rgba(173, 216, 230, 0.55)'; // Light blue, semi-transparent
                break;
            default:
                // console.warn(`Unknown tile type: ${tileType} at ${x},${y}`);
                return; // Don't draw unknown types
        }

        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

            // Special styling for certain types
            if (tileType === TILE_TYPES.WALL && !isTemporary) { // Only permanent walls get 3D effect
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE / 8); // Top shadow
                ctx.fillRect(cellX, cellY, GRID_SIZE / 8, GRID_SIZE); // Left shadow
            }
            if (isTemporary && tileType === TILE_TYPES.TEMP_WALL) {
                ctx.strokeStyle = "rgba(50,20,0,0.7)"; // Darker outline for temp wall
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX + 1, cellY + 1, GRID_SIZE - 2, GRID_SIZE - 2); // Inner border
            }
            if (isTemporary && tileType === TILE_TYPES.ICE_FIELD) {
                // "Sparkle" effect for ice
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                for (let i = 0; i < 2; i++) { // Fewer, larger "sparkles"
                    ctx.beginPath();
                    const flakeX = cellX + GRID_SIZE * 0.2 + Math.random() * GRID_SIZE * 0.6;
                    const flakeY = cellY + GRID_SIZE * 0.2 + Math.random() * GRID_SIZE * 0.6;
                    ctx.arc(flakeX, flakeY, GRID_SIZE * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Thin border for ice field tile for definition
                ctx.strokeStyle = "rgba(100, 150, 200, 0.6)";
                ctx.lineWidth = 0.5;
                ctx.strokeRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
            }
        }
    }
}