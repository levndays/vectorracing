// js/entities/track.js

import { GRID_SIZE, TILE_TYPES } from '../constants.js';
import { deepCopyGrid } from '../utils.js'; // Import for deep copying grid data

export class Track {
    constructor(initialWidth, initialHeight) {
        this.width = initialWidth;
        this.height = initialHeight;
        this.grid = this.createEmptyGrid(); // Base grid for permanent tiles, populated by loadMapData or clear
        this.temporaryTiles = []; // Stores {x, y, type, ownerId, expiresOnTurn, originalTile}
        // Map data is now loaded by Game.js using loadMapData after instantiation or track.clear for custom.
    }

    createEmptyGrid() {
        return Array(this.height).fill(null).map(() => Array(this.width).fill(TILE_TYPES.EMPTY));
    }

    /**
     * Loads map data from a map object.
     * @param {object} mapObject - The map object containing width, height, and grid.
     */
    loadMapData(mapObject) {
        if (!mapObject || !mapObject.grid) {
            console.error("Invalid map data provided to loadMapData.");
            // Fallback to a clear state for current dimensions if map data is bad
            this.clear();
            return;
        }
        this.width = mapObject.width;
        this.height = mapObject.height;
        this.grid = deepCopyGrid(mapObject.grid); // Use deep copy
        this.temporaryTiles = []; // Clear all temporary tiles when loading a new map
        console.log(`Loaded map: ${mapObject.name || 'Unnamed Map'}, Size: ${this.width}x${this.height}`);
    }

    // Clears user-placed stuff from base grid, keeps/re-adds border walls for current dimensions
    clear() { 
        this.grid = this.createEmptyGrid(); // Start with all empty based on current this.width/this.height
        for (let y = 0; y < this.height; y++) { // Re-add border walls
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    if (this.grid[y]) { // Ensure row exists
                       this.grid[y][x] = TILE_TYPES.WALL;
                    }
                }
            }
        }
        this.temporaryTiles = [];
    }

    // For editor: sets permanent tiles on the base grid
    setTile(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.removeTemporaryTile(x, y); 
            if (this.grid[y]) { // Ensure row exists
                this.grid[y][x] = type;
            }
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
            this.removeTemporaryTile(x, y); 
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
        if (!this.grid || this.grid.length === 0) return [{ x: 1, y: 1 }]; // Safeguard

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y] && this.grid[y][x] === TILE_TYPES.START) {
                    positions.push({ x, y });
                }
            }
        }
        if (positions.length === 0) {
            const fallbackX = Math.max(1, Math.floor(this.width / 10));
            const fallbackY = Math.max(1, Math.floor(this.height / 10));
            return [{ x: fallbackX, y: fallbackY }];
        }
        return positions;
    }

    isValid() {
        let hasStart = false;
        let hasFinish = false;
        if (!this.grid || this.grid.length === 0) return false; // Safeguard

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y]) { // Ensure row exists
                    if (this.grid[y][x] === TILE_TYPES.START) hasStart = true;
                    if (this.grid[y][x] === TILE_TYPES.FINISH) hasFinish = true;
                }
            }
        }
        return hasStart && hasFinish;
    }

    draw(ctx) {
        // Draw grid lines
        ctx.strokeStyle = '#404550'; // Darker grid lines to contrast with magenta theme
        ctx.lineWidth = 0.5;
        for (let x_coord = 0; x_coord <= this.width * GRID_SIZE; x_coord += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(x_coord, 0); ctx.lineTo(x_coord, this.height * GRID_SIZE); ctx.stroke();
        }
        for (let y_coord = 0; y_coord <= this.height * GRID_SIZE; y_coord += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, y_coord); ctx.lineTo(this.width * GRID_SIZE, y_coord); ctx.stroke();
        }

        // Draw base grid tiles first
        if (this.grid && this.grid.length > 0) {
            for (let y = 0; y < this.height; y++) {
                if (!this.grid[y]) continue; // Skip if row doesn't exist (safety)
                for (let x = 0; x < this.width; x++) {
                    this.drawSingleTile(ctx, x, y, this.grid[y][x], false);
                }
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

        switch (tileType) {
            case TILE_TYPES.EMPTY:
                // No color, effectively transparent or background color of canvas shows
                break;
            case TILE_TYPES.WALL:
                color = '#6c757d'; // Bootstrap's secondary color, good for walls
                break;
            case TILE_TYPES.START:
                color = '#90ee90'; // Lighter green
                break;
            case TILE_TYPES.FINISH:
                color = '#ffd700'; // Gold
                break;
            case TILE_TYPES.TEMP_WALL:
                color = '#a0522d'; // Brownish for temporary wall (Sienna)
                break;
            case TILE_TYPES.ICE_FIELD:
                color = 'rgba(173, 216, 230, 0.55)'; // Light blue, semi-transparent
                break;
            default:
                // console.warn(`Unknown tile type: ${tileType} at ${x},${y}`);
                return; 
        }

        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

            // Special styling for certain types
            if (tileType === TILE_TYPES.WALL && !isTemporary) {
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE / 8); 
                ctx.fillRect(cellX, cellY, GRID_SIZE / 8, GRID_SIZE); 
            }
            if (isTemporary && tileType === TILE_TYPES.TEMP_WALL) {
                ctx.strokeStyle = "rgba(50,20,0,0.7)";
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX + 1, cellY + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            }
            if (isTemporary && tileType === TILE_TYPES.ICE_FIELD) {
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                for (let i = 0; i < 2; i++) { 
                    ctx.beginPath();
                    const flakeX = cellX + GRID_SIZE * 0.2 + Math.random() * GRID_SIZE * 0.6;
                    const flakeY = cellY + GRID_SIZE * 0.2 + Math.random() * GRID_SIZE * 0.6;
                    ctx.arc(flakeX, flakeY, GRID_SIZE * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.strokeStyle = "rgba(100, 150, 200, 0.6)";
                ctx.lineWidth = 0.5;
                ctx.strokeRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
            }
        }
    }
}