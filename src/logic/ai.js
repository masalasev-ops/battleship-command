import { ROWS, COLS, CELL_STATUS, DIRECTIONS } from './constants';

/**
 * Get an AI move based on difficulty level.
 *
 * @param {Array} board - The player's board (enemy board from AI perspective)
 * @param {Set|Array} shots - Previously shot coordinates
 * @param {Array} remainingShips - Ships not yet sunk
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {Object} aiState - Persistent AI state
 * @param {Object|null} lastResult - Result of the previous AI shot: { hit, sunk, row, col }
 * @returns {Object} { row, col, aiState: updatedState }
 */
export function getAIMove(board, shots, remainingShips, difficulty, aiState = {}, lastResult = null) {
  const shotSet = normalizeShots(shots);

  switch (difficulty) {
    case 'easy':
      return getEasyMove(board, shotSet);
    case 'medium':
      return getMediumMove(board, shotSet, remainingShips, aiState, lastResult);
    case 'hard':
      return getHardMove(board, shotSet, remainingShips);
    default:
      return getEasyMove(board, shotSet);
  }
}

function normalizeShots(shots) {
  if (shots instanceof Set) return shots;
  const s = new Set();
  if (Array.isArray(shots)) {
    for (const shot of shots) {
      s.add(`${shot.row},${shot.col}`);
    }
  }
  return s;
}

/**
 * Easy: pick a random unshot cell.
 */
function getEasyMove(board, shotSet) {
  const available = getAvailableCells(board, shotSet);
  if (available.length === 0) return null;
  const { row, col } = available[Math.floor(Math.random() * available.length)];
  return { row, col, aiState: { mode: 'hunt' } };
}

/**
 * Medium: Hunt-target pattern.
 * - Hunt: parity-based scanning
 * - Target: when a hit occurs, probe adjacent cells. If two hits found in a line,
 *   extend that line. Fall back to hunt when all adjacents miss.
 */
function getMediumMove(board, shotSet, remainingShips, aiState, lastResult) {
  const state = {
    mode: aiState.mode || 'hunt',
    lastHit: aiState.lastHit || null,
    hitChain: aiState.hitChain || [],      // ordered hits in current chain
    triedDirections: aiState.triedDirections || new Set(),
    originHit: aiState.originHit || null,   // first hit in the chain
    targetDirection: aiState.targetDirection || null,
  };

  // ── Update state based on last shot result ──────────────
  if (lastResult) {
    if (lastResult.hit && !lastResult.sunk) {
      // Hit! Enter target mode
      if (state.mode === 'hunt') {
        state.mode = 'target';
        state.originHit = { row: lastResult.row, col: lastResult.col };
        state.lastHit = { row: lastResult.row, col: lastResult.col };
        state.hitChain = [{ row: lastResult.row, col: lastResult.col }];
        state.triedDirections = new Set();
        state.targetDirection = null;
      } else {
        // Already in target mode — extend chain
        state.lastHit = { row: lastResult.row, col: lastResult.col };
        state.hitChain.push({ row: lastResult.row, col: lastResult.col });
        // Determine direction from origin
        if (state.hitChain.length >= 2) {
          const first = state.hitChain[0];
          const second = state.hitChain[1];
          if (second.row !== first.row) {
            state.targetDirection = second.row > first.row ? 'south' : 'north';
          } else {
            state.targetDirection = second.col > first.col ? 'east' : 'west';
          }
        }
      }
    } else if (lastResult.sunk) {
      // Ship sunk — reset to hunt
      state.mode = 'hunt';
      state.lastHit = null;
      state.hitChain = [];
      state.triedDirections = new Set();
      state.originHit = null;
      state.targetDirection = null;
    }
    // On miss in target mode: nothing changes, we try other directions
  }

  // ── Target mode: generate adjacent targets ─────────────
  if (state.mode === 'target' && state.lastHit) {
    const targets = [];

    if (state.targetDirection && state.hitChain.length >= 2) {
      // Extend in the determined direction from the LAST hit
      const dir = getDirVector(state.targetDirection);
      const next = { row: state.lastHit.row + dir.dr, col: state.lastHit.col + dir.dc };
      if (isValidCell(next.row, next.col) && !shotSet.has(`${next.row},${next.col}`)) {
        targets.push(next);
      }
      // Also try opposite direction from the origin
      const oppDir = { dr: -dir.dr, dc: -dir.dc };
      const opp = { row: state.originHit.row + oppDir.dr, col: state.originHit.col + oppDir.dc };
      if (isValidCell(opp.row, opp.col) && !shotSet.has(`${opp.row},${opp.col}`)) {
        targets.push(opp);
      }
    } else {
      // Single hit — try all 4 adjacent cells
      for (const { dr, dc } of DIRECTIONS) {
        const nr = state.lastHit.row + dr;
        const nc = state.lastHit.col + dc;
        const dirKey = `${dr},${dc}`;
        if (isValidCell(nr, nc) && !shotSet.has(`${nr},${nc}`) && !state.triedDirections.has(dirKey)) {
          targets.push({ row: nr, col: nc });
        }
      }
    }

    // Try targets
    const validTargets = targets.filter((t) => !shotSet.has(`${t.row},${t.col}`));
    if (validTargets.length > 0) {
      const pick = validTargets[Math.floor(Math.random() * validTargets.length)];
      // Track direction tried
      if (state.lastHit) {
        const dr = pick.row - state.lastHit.row;
        const dc = pick.col - state.lastHit.col;
        state.triedDirections.add(`${dr},${dc}`);
      }
      return { row: pick.row, col: pick.col, aiState: state };
    }

    // No valid adjacent targets — fall back to hunt
    state.mode = 'hunt';
    state.lastHit = null;
    state.hitChain = [];
    state.triedDirections = new Set();
    state.originHit = null;
    state.targetDirection = null;
  }

  // ── Hunt mode: parity-based scanning ─────────────────
  const allAvailable = getAvailableCells(board, shotSet);
  if (allAvailable.length === 0) return null;

  const parityTargets = allAvailable.filter(
    ({ row, col }) => (row + col) % 2 === 0
  );
  const candidates = parityTargets.length > 0 ? parityTargets : allAvailable;
  const { row, col } = candidates[Math.floor(Math.random() * candidates.length)];

  return { row, col, aiState: state };
}

function getDirVector(dir) {
  switch (dir) {
    case 'north': return { dr: -1, dc: 0 };
    case 'south': return { dr: 1, dc: 0 };
    case 'east': return { dr: 0, dc: 1 };
    case 'west': return { dr: 0, dc: -1 };
    default: return { dr: 0, dc: 0 };
  }
}

/**
 * Hard: Probability density map.
 * For each remaining enemy ship, try all possible placements that don't overlap
 * misses. Each valid placement adds 1 to each cell's weight.
 * Pick the cell with max weight.
 */
function getHardMove(board, shotSet, remainingShips) {
  const weights = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  for (const ship of remainingShips) {
    const len = ship.length;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Horizontal
        if (c + len <= COLS && canPlaceForProbability(board, r, c, len, 'h')) {
          for (let i = 0; i < len; i++) {
            if (!shotSet.has(`${r},${c + i}`)) {
              weights[r][c + i]++;
            }
          }
        }
        // Vertical
        if (r + len <= ROWS && canPlaceForProbability(board, r, c, len, 'v')) {
          for (let i = 0; i < len; i++) {
            if (!shotSet.has(`${r + i},${c}`)) {
              weights[r + i][c]++;
            }
          }
        }
      }
    }
  }

  // Find max weight cell (random among ties)
  let maxWeight = -1;
  const candidates = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (shotSet.has(`${r},${c}`)) continue;
      if (weights[r][c] > maxWeight) {
        maxWeight = weights[r][c];
        candidates.length = 0;
        candidates.push({ row: r, col: c });
      } else if (weights[r][c] === maxWeight) {
        candidates.push({ row: r, col: c });
      }
    }
  }

  if (candidates.length === 0) return null;
  const { row, col } = candidates[Math.floor(Math.random() * candidates.length)];
  return { row, col, aiState: { mode: 'hunt' } };
}

function canPlaceForProbability(board, row, col, length, orientation) {
  for (let i = 0; i < length; i++) {
    const r = orientation === 'v' ? row + i : row;
    const c = orientation === 'h' ? col + i : col;

    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;

    const cell = board[r][c];
    // Cannot place over a miss
    if (cell.status === CELL_STATUS.MISS) return false;
    // OK: can go over hits (they're part of the same ship) and unhit ships
  }
  return true;
}

function getAvailableCells(board, shotSet) {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!shotSet.has(`${r},${c}`)) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

function isValidCell(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}
