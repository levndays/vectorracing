export const GRID_SIZE = 20;
// export const DEFAULT_TRACK_WIDTH = 30; // Will be set by selected map
// export const DEFAULT_TRACK_HEIGHT = 20; // Will be set by selected map
export const MIN_TRACK_SIZE = 10;
export const MAX_TRACK_WIDTH = 100;
export const MAX_TRACK_HEIGHT = 60;

export const TILE_TYPES = { 
    EMPTY: 0, 
    WALL: 1, 
    START: 2, 
    FINISH: 3, 
    TEMP_WALL: 4, 
    ICE_FIELD: 5 
};
Object.freeze(TILE_TYPES);

export const PLAYER_BASE_COLORS = ['#007bff', '#dc3545', '#28a745', '#ffc107', '#6f42c1'];
export const MAX_PLAYERS = 5;
export const MIN_PLAYERS = 1;

export const MAX_HINTS = 3;
export const HINT_DURATION = 2000;

export const NUM_EXPLOSION_PARTICLES = 25;

export const ICE_FIELD_PLACE_RADIUS = 6;
export const ICE_FIELD_SIZE_RADIUS = 1;  // Makes a (2*R+1)x(2*R+1) = 3x3 field

export const TEMP_WALL_DURATION_TURNS = 5; // Number of global game turns wall lasts