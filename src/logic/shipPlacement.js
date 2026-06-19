import { ROWS, COLS, CELL_STATUS } from './constants';

/**
 * Get all cell coordinates a ship would occupy given its bow position and orientation.
 */
export function getShipPositions(row, col, length, orientation) {
  const positions = [];
  for (let i = 0; i < length; i++) {
    const r = orientation === 'v' ? row + i : row;
    const c = orientation === 'h' ? col + i : col;
    positions.push({ row: r, col: c });
  }
  return positions;
}

/**
 * Check if a ship can be placed at the given positions on the board.
 */
export function canPlaceShip(board, positions) {
  for (const { row, col } of positions) {
    // Bounds check
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return false;
    }
    // Check no overlap with existing ships
    if (board[row][col].status === CELL_STATUS.SHIP) {
      return false;
    }
  }
  return true;
}

/**
 * Place a ship on the board by updating cell statuses.
 * Returns a new board (immutable).
 */
export function placeShip(board, ship, positions) {
  const newBoard = board.map((r) => r.map((c) => ({ ...c })));
  for (const { row, col } of positions) {
    newBoard[row][col] = {
      ...newBoard[row][col],
      status: CELL_STATUS.SHIP,
      shipId: ship.id,
    };
  }
  return newBoard;
}

/**
 * Remove a ship from the board (set its cells back to empty).
 * Returns a new board (immutable).
 */
export function removeShip(board, ship) {
  const newBoard = board.map((r) => r.map((c) => ({ ...c })));
  for (const { row, col } of ship.positions) {
    if (newBoard[row] && newBoard[row][col] && newBoard[row][col].shipId === ship.id) {
      newBoard[row][col] = {
        ...newBoard[row][col],
        status: CELL_STATUS.EMPTY,
        shipId: null,
      };
    }
  }
  return newBoard;
}

/**
 * Generate a random fleet placement on the board.
 * Uses a simple backtracking approach: try random positions, retry whole fleet on failure.
 */
export function generateRandomFleet(ships) {
  const maxAttempts = 200;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({
        status: CELL_STATUS.EMPTY,
        shipId: null,
        row: r,
        col: c,
      }))
    );
    const placedShips = [];
    let allPlaced = true;

    for (const shipDef of ships) {
      const ship = {
        id: shipDef.id,
        name: shipDef.name,
        length: shipDef.length,
        positions: [],
        orientation: 'h',
        hits: 0,
        sunk: false,
      };

      // Try up to 50 positions for this ship
      let shipPlaced = false;
      for (let posAttempt = 0; posAttempt < 50; posAttempt++) {
        const orientation = Math.random() < 0.5 ? 'h' : 'v';
        const row = Math.floor(Math.random() * ROWS);
        const col = Math.floor(Math.random() * COLS);
        const positions = getShipPositions(row, col, ship.length, orientation);

        if (canPlaceShip(board, positions)) {
          // Place on board
          for (const { row: r, col: c } of positions) {
            board[r][c] = {
              ...board[r][c],
              status: CELL_STATUS.SHIP,
              shipId: ship.id,
            };
          }
          ship.positions = positions;
          ship.orientation = orientation;
          placedShips.push(ship);
          shipPlaced = true;
          break;
        }
      }

      if (!shipPlaced) {
        allPlaced = false;
        break;
      }
    }

    if (allPlaced) {
      return { board, ships: placedShips };
    }
  }

  // Fallback: should not happen with 200 attempts, but just in case
  throw new Error('Could not generate random fleet after max attempts');
}
