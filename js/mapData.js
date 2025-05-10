// js/mapData.js
import { TILE_TYPES } from './constants.js';

const W = TILE_TYPES.WALL;
const E = TILE_TYPES.EMPTY;
const S = TILE_TYPES.START;
const F = TILE_TYPES.FINISH;

const maps = [
    { // ADD THE TUTORIAL MAP HERE
        id: "tutorial_map",
        name: "Game Tutorial",
        width: 25,
        height: 15,
        isTutorial: true,
        grid: (() => {
            const grid = Array(15).fill(null).map(() => Array(25).fill(E));
            // Outer Walls
            for (let y = 0; y < 15; y++) {
                for (let x = 0; x < 25; x++) {
                    if (x === 0 || x === 24 || y === 0 || y === 14) grid[y][x] = W;
                }
            }
            // Start position
            grid[7][2] = S;
            grid[7][3] = S;

            // A simple wall
            grid[7][10] = W;
            grid[6][10] = W;
            grid[8][10] = W;

            // A simple finish line
            grid[7][22] = F;
            grid[6][22] = F;
            grid[8][22] = F;
            return grid;
        })()
    },
    {
        id: "classic_eight",
        name: "The Classic Eight",
        width: 35,
        height: 25,
        isTutorial: false, // Explicitly add isTutorial: false for non-tutorial maps if desired
        grid: (() => {
            // ... (grid data for classic_eight)
            const grid = Array(25).fill(null).map(() => Array(35).fill(E));
            for (let y = 0; y < 25; y++) { for (let x = 0; x < 35; x++) { if (x === 0 || x === 34 || y === 0 || y === 24) grid[y][x] = W; } }
            for (let x = 8; x <= 26; x++) { if (x < 15 || x > 19) { grid[12][x] = W; } }
            for (let y = 5; y <= 19; y++) { if (y < 10 || y > 14) { grid[y][17] = W; } }
            grid[5][10] = W; grid[5][24] = W; grid[19][10] = W; grid[19][24] = W;
            for(let i=1; i<5; i++) { grid[5+i][10-i] = W; grid[5+i][24+i] = W; grid[19-i][10-i] = W; grid[19-i][24+i] = W; }
            grid[12][3] = S; grid[13][3] = S; grid[11][3] = S;
            grid[12][31] = F; grid[13][31] = F; grid[11][31] = F;
            return grid;
        })()
    },
    {
        id: "canyon_chase",
        name: "Canyon Chase",
        width: 40,
        height: 20,
        isTutorial: false,
        grid: (() => {
            // ... (grid data for canyon_chase)
            const grid = Array(20).fill(null).map(() => Array(40).fill(E));
            for (let y = 0; y < 20; y++) { for (let x = 0; x < 40; x++) { if (x === 0 || x === 39 || y === 0 || y === 19) grid[y][x] = W; } }
            for (let x = 5; x < 35; x++) { grid[9][x] = W; grid[10][x] = W; }
            grid[9][15] = E; grid[10][15] = E; grid[9][16] = E; grid[10][16] = E;
            grid[9][25] = E; grid[10][25] = E; grid[9][26] = E; grid[10][26] = E;
            grid[5][8] = W; grid[5][9] = W; grid[6][8] = W; grid[6][9] = W;
            grid[13][8] = W; grid[14][8] = W; grid[13][9] = W; grid[14][9] = W;
            grid[5][30] = W; grid[5][31] = W; grid[6][30] = W; grid[6][31] = W;
            grid[13][30] = W; grid[14][30] = W; grid[13][31] = W; grid[14][31] = W;
            grid[3][2] = S; grid[4][2] = S; // Consider adding grid[2][2] = S; if that was intended for a wider start
            grid[15][37] = F; grid[16][37] = F; // Consider adding grid[17][37] = F; if that was intended
            return grid;
        })()
    },
    {
        id: "urban_gridlock",
        name: "Urban Gridlock",
        width: 30,
        height: 30,
        isTutorial: false,
        grid: (() => {
            // ... (grid data for urban_gridlock)
            const grid = Array(30).fill(null).map(() => Array(30).fill(E));
            for (let y = 0; y < 30; y++) { for (let x = 0; x < 30; x++) { if (x === 0 || x === 29 || y === 0 || y === 29) grid[y][x] = W; } }
            for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) {
                const top = 5 + r * 8; const left = 5 + c * 8;
                for (let y = top; y < top + 4; y++) { for (let x = left; x < left + 4; x++) {
                    if ( (r===1 && c===1) ) { if (y < top + 2 && x < left + 2) grid[y][x] = W; } else { grid[y][x] = W; }
                }}
            }}
            grid[13][13]=E; grid[14][13]=E; grid[13][14]=E; grid[14][14]=E;
            grid[2][14] = S; grid[2][15] = S;
            grid[27][14] = F; grid[27][15] = F;
            return grid;
        })()
    },
    {
        id: "spiral_ascent",
        name: "Spiral Ascent",
        width: 25,
        height: 25,
        isTutorial: false,
        grid: (() => {
            // ... (grid data for spiral_ascent)
            const grid = Array(25).fill(null).map(() => Array(25).fill(W));
            let x = 1, y = 1; let dx = 1, dy = 0; let segmentLength = 23;
            let segmentPassed = 0; let turnCounter = 0; let safetyBreak = 0;
            while(segmentLength > 1 && safetyBreak < 500) {
                safetyBreak++; if (y >=0 && y < 25 && x >= 0 && x < 25) grid[y][x] = E; else break;
                segmentPassed++;
                if (segmentPassed >= segmentLength) {
                    segmentPassed = 0; turnCounter++; let tempDx = dx; dx = -dy; dy = tempDx;
                    if (turnCounter % 2 === 0) { segmentLength -= 2; }
                }
                x += dx; y += dy;
            }
            grid[1][1] = S; grid[1][2] = S; grid[2][1] = S;
            const centerX = Math.floor(25/2); const centerY = Math.floor(25/2);
            grid[centerY][centerX] = F;
            if(grid[centerY-1] && grid[centerY-1][centerX] === E) grid[centerY-1][centerX] = F;
            if(grid[centerY+1] && grid[centerY+1][centerX] === E) grid[centerY+1][centerX] = F;
            if(grid[centerY][centerX-1] === E) grid[centerY][centerX-1] = F;
            if(grid[centerY][centerX+1] === E) grid[centerY][centerX+1] = F;
            return grid;
        })()
    },
    {
        id: "island_hop",
        name: "Island Hop",
        width: 38,
        height: 22,
        isTutorial: false,
        grid: (() => {
            // ... (grid data for island_hop)
            const grid = Array(22).fill(null).map(() => Array(38).fill(W));
            const createIsland = (x,y,w,h) => { for(let r=0;r<h;r++){for(let c=0;c<w;c++){if(y+r<22&&x+c<38&&y+r>=0&&x+c>=0)grid[y+r][x+c]=E;}}};
            const createBridgeH = (x,y,l)=>{for(let i=0;i<l;i++)if(grid[y]&&grid[y][x+i]!==undefined)grid[y][x+i]=E;};
            const createBridgeV = (x,y,l)=>{for(let i=0;i<l;i++)if(grid[y+i]&&grid[y+i][x]!==undefined)grid[y+i][x]=E;};
            createIsland(2,2,8,8); createIsland(15,2,8,6); createIsland(28,2,8,8);
            createIsland(2,12,6,8); createIsland(16,14,6,6); createIsland(28,12,8,8);
            createBridgeH(10,5,5); createBridgeH(23,5,5); createBridgeV(5,10,2);
            createBridgeV(18,8,6); createBridgeV(31,10,2); createBridgeH(8,16,8); createBridgeH(22,16,6);
            grid[3][3]=S; grid[4][3]=S; grid[3][4]=S; // Or grid[3][3]=S; grid[4][3]=S; as in original
            grid[17][33]=F; grid[18][33]=F; grid[17][32]=F; // Or grid[17][33]=F; grid[18][33]=F; as in original
            return grid;
        })()
    }
];

export default maps;