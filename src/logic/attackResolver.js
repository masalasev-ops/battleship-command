import { CELL_STATUS } from './constants';

/**
 * Resolve an attack on a board at the given coordinate.
 * Updates the board cell and ship hit count.
 *
 * @param {Array} board - 2D array of cells (will be mutated immutably - returns new array)
 * @param {Array} ships - Array of ship objects
 * @param {Object} coord - { row, col }
 * @returns {Object} { hit, shipSunk, allShipsSunk, updatedBoard, updatedShips, shipName }
 */
export function resolveAttack(board, ships, coord) {
  const { row, col } = coord;

  if (row < 0 || row >= 10 || col < 0 || col >= 10) {
    return { hit: false, shipSunk: false, allShipsSunk: false, updatedBoard: board, updatedShips: ships, shipName: null, error: 'Out of bounds' };
  }

  const cell = board[row][col];

  // Already shot at this cell
  if (cell.status === CELL_STATUS.HIT || cell.status === CELL_STATUS.MISS) {
    return { hit: false, shipSunk: false, allShipsSunk: false, updatedBoard: board, updatedShips: ships, shipName: null, error: 'Already shot' };
  }

  // Clone board
  const updatedBoard = board.map((r) => r.map((c) => ({ ...c })));

  if (cell.status === CELL_STATUS.SHIP && cell.shipId) {
    // Hit!
    updatedBoard[row][col].status = CELL_STATUS.HIT;

    // Update the hit ship
    const ship = ships.find((s) => s.id === cell.shipId);
    if (!ship) {
      return { hit: true, shipSunk: false, allShipsSunk: false, updatedBoard, updatedShips: ships, shipName: null };
    }

    const newHits = ship.hits + 1;
    const sunk = newHits >= ship.length;

    const updatedShips = ships.map((s) => {
      if (s.id === ship.id) {
        return { ...s, hits: newHits, sunk };
      }
      return s;
    });

    const allShipsSunk = updatedShips.every((s) => s.sunk);

    return {
      hit: true,
      shipSunk: sunk,
      allShipsSunk,
      updatedBoard,
      updatedShips,
      shipName: ship.name,
    };
  }

  // Miss
  updatedBoard[row][col].status = CELL_STATUS.MISS;
  return {
    hit: false,
    shipSunk: false,
    allShipsSunk: false,
    updatedBoard,
    updatedShips: ships,
    shipName: null,
  };
}

/**
 * Check if a coordinate has already been shot.
 */
export function isCellShot(board, row, col) {
  if (row < 0 || row >= 10 || col < 0 || col >= 10) return true;
  const status = board[row][col].status;
  return status === CELL_STATUS.HIT || status === CELL_STATUS.MISS;
}

/**
 * Check if all ships are sunk (victory condition).
 */
export function checkVictory(ships) {
  return ships.every((s) => s.sunk);
}
