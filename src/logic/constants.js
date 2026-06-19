// Grid dimensions
export const GRID_SIZE = 10;
export const ROWS = 10;
export const COLS = 10;

// Ship definitions
export const SHIP_TYPES = [
  { name: 'Carrier',    length: 5, id: 'carrier' },
  { name: 'Battleship', length: 4, id: 'battleship' },
  { name: 'Cruiser',    length: 3, id: 'cruiser' },
  { name: 'Submarine',  length: 3, id: 'submarine' },
  { name: 'Destroyer',  length: 2, id: 'destroyer' },
];

// Cell status constants
export const CELL_STATUS = {
  EMPTY: 'empty',
  SHIP: 'ship',
  HIT: 'hit',
  MISS: 'miss',
};

// Game phases
export const PHASE = {
  LANDING: 'landing',
  PLACEMENT: 'placement',
  BATTLE: 'battle',
  GAMEOVER: 'gameover',
};

// AI difficulty levels
export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Game modes
export const GAME_MODE = {
  AI: 'ai',
  LOCAL: 'local',
};

// Direction vectors for adjacency checks
export const DIRECTIONS = [
  { dr: -1, dc: 0 },  // North
  { dr: 1, dc: 0 },   // South
  { dr: 0, dc: -1 },  // West
  { dr: 0, dc: 1 },   // East
];

/**
 * Create an empty 10x10 board.
 */
export function createEmptyBoard() {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => ({
      status: CELL_STATUS.EMPTY,
      shipId: null,
      row,
      col,
    }))
  );
}

/**
 * Create default ship objects for a fleet.
 */
export function createFleet() {
  return SHIP_TYPES.map((def) => ({
    id: def.id,
    name: def.name,
    length: def.length,
    positions: [],
    orientation: 'h',
    hits: 0,
    sunk: false,
  }));
}
