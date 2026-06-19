import { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import {
  PHASE,
  GAME_MODE,
  AI_DIFFICULTY,
  CELL_STATUS,
  SHIP_TYPES,
  createEmptyBoard,
  createFleet,
} from '../logic/constants';
import { canPlaceShip, placeShip, removeShip, getShipPositions, generateRandomFleet } from '../logic/shipPlacement';
import { resolveAttack } from '../logic/attackResolver';
import { getAIMove } from '../logic/ai';

// ─── Initial State ────────────────────────────────────────────────

function createInitialPlayer(name) {
  return {
    name,
    board: createEmptyBoard(),
    ships: createFleet(),
    shots: [],  // array of {row, col} for tracking
  };
}

const initialState = {
  mode: GAME_MODE.AI,
  phase: PHASE.LANDING,
  player1: createInitialPlayer('Admiral'),
  player2: createInitialPlayer('AI Commander'),
  currentPlayer: 1,
  winner: null,
  messageLog: [],
  aiDifficulty: AI_DIFFICULTY.HARD,
  placementPlayer: 1,     // which player is currently placing (local 2-player)
  aiState: { mode: 'hunt', lastHit: null, targets: [] },
};

// ─── Action Types ─────────────────────────────────────────────────

const ACTIONS = {
  START_GAME: 'START_GAME',
  PLACE_SHIP: 'PLACE_SHIP',
  REMOVE_SHIP: 'REMOVE_SHIP',
  ROTATE_SHIP: 'ROTATE_SHIP',
  RANDOMIZE_FLEET: 'RANDOMIZE_FLEET',
  CONFIRM_PLACEMENT: 'CONFIRM_PLACEMENT',
  START_BATTLE: 'START_BATTLE',
  ATTACK_CELL: 'ATTACK_CELL',
  AI_MOVE: 'AI_MOVE',
  END_TURN: 'END_TURN',
  GAME_OVER: 'GAME_OVER',
  RESET_GAME: 'RESET_GAME',
  SET_MODE: 'SET_MODE',
  SET_AI_DIFFICULTY: 'SET_AI_DIFFICULTY',
  SET_PLAYER_NAME: 'SET_PLAYER_NAME',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SHOW_PASS_OVERLAY: 'SHOW_PASS_OVERLAY',
  HIDE_PASS_OVERLAY: 'HIDE_PASS_OVERLAY',
};

// ─── Reducer ──────────────────────────────────────────────────────

function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_GAME: {
      const { mode, player1Name, player2Name, aiDifficulty } = action.payload;
      return {
        ...initialState,
        mode,
        phase: PHASE.PLACEMENT,
        player1: {
          ...createInitialPlayer(player1Name || 'Admiral'),
        },
        player2: {
          ...createInitialPlayer(mode === GAME_MODE.AI ? 'AI Commander' : (player2Name || 'Captain')),
        },
        aiDifficulty: aiDifficulty || AI_DIFFICULTY.HARD,
        placementPlayer: 1,
      };
    }

    case ACTIONS.SET_MODE:
      return { ...state, mode: action.payload };

    case ACTIONS.SET_AI_DIFFICULTY:
      return { ...state, aiDifficulty: action.payload };

    case ACTIONS.SET_PLAYER_NAME: {
      const { playerNum, name } = action.payload;
      if (playerNum === 1) {
        return { ...state, player1: { ...state.player1, name } };
      }
      return { ...state, player2: { ...state.player2, name } };
    }

    case ACTIONS.PLACE_SHIP: {
      const { playerNum, shipId, row, col, orientation } = action.payload;
      const playerKey = playerNum === 1 ? 'player1' : 'player2';
      const player = state[playerKey];
      const ship = player.ships.find((s) => s.id === shipId);
      if (!ship) return state;
      if (ship.positions.length > 0) return state; // already placed

      const positions = getShipPositions(row, col, ship.length, orientation);
      if (!canPlaceShip(player.board, positions)) return state;

      const newBoard = placeShip(player.board, ship, positions);
      const newShips = player.ships.map((s) => {
        if (s.id === shipId) {
          return { ...s, positions, orientation };
        }
        return s;
      });

      return {
        ...state,
        [playerKey]: { ...player, board: newBoard, ships: newShips },
      };
    }

    case ACTIONS.REMOVE_SHIP: {
      const { playerNum, shipId } = action.payload;
      const playerKey = playerNum === 1 ? 'player1' : 'player2';
      const player = state[playerKey];
      const ship = player.ships.find((s) => s.id === shipId);
      if (!ship || ship.positions.length === 0) return state;

      const newBoard = removeShip(player.board, ship);
      const newShips = player.ships.map((s) => {
        if (s.id === shipId) {
          return { ...s, positions: [], orientation: 'h', hits: 0, sunk: false };
        }
        return s;
      });

      return {
        ...state,
        [playerKey]: { ...player, board: newBoard, ships: newShips },
      };
    }

    case ACTIONS.ROTATE_SHIP: {
      const { playerNum, shipId } = action.payload;
      const playerKey = playerNum === 1 ? 'player1' : 'player2';
      const player = state[playerKey];
      const ship = player.ships.find((s) => s.id === shipId);
      if (!ship || ship.positions.length > 0) return state; // can't rotate after placed

      const newShips = player.ships.map((s) => {
        if (s.id === shipId) {
          return { ...s, orientation: s.orientation === 'h' ? 'v' : 'h' };
        }
        return s;
      });

      return { ...state, [playerKey]: { ...player, ships: newShips } };
    }

    case ACTIONS.RANDOMIZE_FLEET: {
      const { playerNum } = action.payload;
      const playerKey = playerNum === 1 ? 'player1' : 'player2';
      const player = state[playerKey];

      try {
        const { board, ships } = generateRandomFleet(SHIP_TYPES);
        return {
          ...state,
          [playerKey]: { ...player, board, ships },
        };
      } catch (e) {
        return state;
      }
    }

    case ACTIONS.CONFIRM_PLACEMENT: {
      const { playerNum } = action.payload;
      if (state.mode === GAME_MODE.LOCAL && playerNum === 1) {
        // Move to player 2 placement in local mode
        return {
          ...state,
          placementPlayer: 2,
          messageLog: [...state.messageLog, `Fleet deployed. Pass device to ${state.player2.name}.`],
        };
      }
      // All placements done — start battle.
      // If AI mode, randomly place the AI's fleet now.
      if (state.mode === GAME_MODE.AI) {
        try {
          const { board, ships } = generateRandomFleet(SHIP_TYPES);
          return {
            ...state,
            phase: PHASE.BATTLE,
            currentPlayer: 1,
            player2: { ...state.player2, board, ships },
            messageLog: [...state.messageLog, `${state.player1.name}'s fleet ready. Enemy fleet deployed.`],
          };
        } catch (e) {
          return { ...state, phase: PHASE.BATTLE, currentPlayer: 1 };
        }
      }
      // Local mode P2 done
      return { ...state, phase: PHASE.BATTLE, currentPlayer: 1 };
    }

    case ACTIONS.START_BATTLE:
      return { ...state, phase: PHASE.BATTLE, currentPlayer: 1 };

    case ACTIONS.ATTACK_CELL: {
      const { playerNum, row, col } = action.payload;
      const attackerKey = playerNum === 1 ? 'player1' : 'player2';
      const defenderKey = playerNum === 1 ? 'player2' : 'player1';
      const attacker = state[attackerKey];
      const defender = state[defenderKey];

      const result = resolveAttack(defender.board, defender.ships, { row, col });
      if (result.error) return state;

      // Record shot
      const newShots = [...attacker.shots, { row, col }];
      const colLabel = String.fromCharCode(65 + col);
      const rowLabel = (row + 1).toString();
      const hitMsg = result.hit
        ? `${colLabel}${rowLabel} – HIT${result.shipSunk ? `! ${result.shipName} SUNK!` : '!'}`
        : `${colLabel}${rowLabel} – Miss`;

      const newMessages = [...state.messageLog, hitMsg].slice(-50); // keep last 50

      const newState = {
        ...state,
        [attackerKey]: { ...attacker, shots: newShots },
        [defenderKey]: { ...defender, board: result.updatedBoard, ships: result.updatedShips },
        messageLog: newMessages,
      };

      if (result.allShipsSunk) {
        return {
          ...newState,
          phase: PHASE.GAMEOVER,
          winner: playerNum,
          messageLog: [...newState.messageLog, `${attacker.name} wins! All enemy ships destroyed!`],
        };
      }

      // For AI mode: after player 1 attacks, it's AI's turn (handled via AI_MOVE)
      // For local mode: after a player attacks, switch turn after pass overlay
      return {
        ...newState,
        currentPlayer: playerNum === 1 ? 2 : 1,
      };
    }

    case ACTIONS.AI_MOVE: {
      const { row, col } = action.payload;
      // AI (player 2) attacks player 1
      const result = resolveAttack(state.player1.board, state.player1.ships, { row, col });
      if (result.error) return state;

      const newShots = [...state.player2.shots, { row, col }];
      const colLabel = String.fromCharCode(65 + col);
      const rowLabel = (row + 1).toString();
      const hitMsg = result.hit
        ? `Enemy ${colLabel}${rowLabel} – HIT${result.shipSunk ? `! ${result.shipName} SUNK!` : '!'}`
        : `Enemy ${colLabel}${rowLabel} – Miss`;

      const newMessages = [...state.messageLog, hitMsg].slice(-50);

      const newState = {
        ...state,
        player1: { ...state.player1, board: result.updatedBoard, ships: result.updatedShips },
        player2: { ...state.player2, shots: newShots },
        messageLog: newMessages,
        aiState: {
          ...action.payload.aiState,
          lastResult: { hit: result.hit, sunk: result.shipSunk, row, col },
        },
      };

      if (result.allShipsSunk) {
        return {
          ...newState,
          phase: PHASE.GAMEOVER,
          winner: 2,
          messageLog: [...newState.messageLog, `${state.player2.name} wins! Your fleet is destroyed!`],
        };
      }

      return {
        ...newState,
        currentPlayer: 1, // back to player
      };
    }

    case ACTIONS.END_TURN:
      return {
        ...state,
        currentPlayer: state.currentPlayer === 1 ? 2 : 1,
      };

    case ACTIONS.GAME_OVER:
      return { ...state, phase: PHASE.GAMEOVER, winner: action.payload };

    case ACTIONS.ADD_MESSAGE:
      return { ...state, messageLog: [...state.messageLog, action.payload].slice(-50) };

    case ACTIONS.RESET_GAME:
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const aiTimeoutRef = useRef(null);

  // ─── Thunks / Complex actions ───────────────────────────────────

  const startGame = useCallback((mode, player1Name, player2Name, aiDifficulty) => {
    dispatch({
      type: ACTIONS.START_GAME,
      payload: { mode, player1Name, player2Name, aiDifficulty },
    });
  }, []);

  const placeShipAction = useCallback((playerNum, shipId, row, col, orientation) => {
    dispatch({
      type: ACTIONS.PLACE_SHIP,
      payload: { playerNum, shipId, row, col, orientation },
    });
  }, []);

  const removeShipAction = useCallback((playerNum, shipId) => {
    dispatch({ type: ACTIONS.REMOVE_SHIP, payload: { playerNum, shipId } });
  }, []);

  const rotateShipAction = useCallback((playerNum, shipId) => {
    dispatch({ type: ACTIONS.ROTATE_SHIP, payload: { playerNum, shipId } });
  }, []);

  const randomizeFleet = useCallback((playerNum) => {
    dispatch({ type: ACTIONS.RANDOMIZE_FLEET, payload: { playerNum } });
  }, []);

  const confirmPlacement = useCallback((playerNum) => {
    dispatch({ type: ACTIONS.CONFIRM_PLACEMENT, payload: { playerNum } });
  }, []);

  /**
   * Player attacks a cell on the enemy board.
   * Returns the result so the caller can react (e.g., play sound).
   * In AI mode, also schedules the AI counter-attack.
   */
  const attackCell = useCallback((playerNum, row, col) => {
    dispatch({ type: ACTIONS.ATTACK_CELL, payload: { playerNum, row, col } });
  }, []);

  /**
   * Trigger AI move. Called after a short delay from the component.
   */
  const executeAIMove = useCallback((board, shots, remainingShips, difficulty, aiState) => {
    const lastResult = aiState.lastResult || null;
    const move = getAIMove(board, shots, remainingShips, difficulty, aiState, lastResult);
    if (move) {
      dispatch({
        type: ACTIONS.AI_MOVE,
        payload: { row: move.row, col: move.col, aiState: move.aiState },
      });
      return move;
    }
    return null;
  }, []);

  const endTurn = useCallback(() => {
    dispatch({ type: ACTIONS.END_TURN });
  }, []);

  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    dispatch({ type: ACTIONS.RESET_GAME });
  }, []);

  const setMode = useCallback((mode) => {
    dispatch({ type: ACTIONS.SET_MODE, payload: mode });
  }, []);

  const setAiDifficulty = useCallback((difficulty) => {
    dispatch({ type: ACTIONS.SET_AI_DIFFICULTY, payload: difficulty });
  }, []);

  const setPlayerName = useCallback((playerNum, name) => {
    dispatch({ type: ACTIONS.SET_PLAYER_NAME, payload: { playerNum, name } });
  }, []);

  const addMessage = useCallback((msg) => {
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: msg });
  }, []);

  // ─── Value ─────────────────────────────────────────────────────

  const value = {
    state,
    startGame,
    placeShipAction,
    removeShipAction,
    rotateShipAction,
    randomizeFleet,
    confirmPlacement,
    attackCell,
    executeAIMove,
    endTurn,
    resetGame,
    setMode,
    setAiDifficulty,
    setPlayerName,
    addMessage,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}

export { ACTIONS, GAME_MODE, AI_DIFFICULTY, PHASE };
