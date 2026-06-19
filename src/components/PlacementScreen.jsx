import { useState, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_MODE, GRID_SIZE } from '../logic/constants';
import { canPlaceShip, getShipPositions } from '../logic/shipPlacement';
import { useGameAudio } from './AudioManager';
import BoardCanvas from './BoardCanvas';
import ShipDock from './ShipDock';
import './PlacementScreen.css';

export default function PlacementScreen() {
  const { state, placeShipAction, removeShipAction, rotateShipAction, randomizeFleet, confirmPlacement } = useGame();
  const { playSound } = useGameAudio();

  const isAI = state.mode === GAME_MODE.AI;
  const playerKey = state.placementPlayer === 1 ? 'player1' : 'player2';
  const player = state[playerKey];

  const [selectedShipId, setSelectedShipId] = useState(null);
  const [previewPositions, setPreviewPositions] = useState([]);
  const [previewValid, setPreviewValid] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const [showPassOverlay, setShowPassOverlay] = useState(false);
  const [placementComplete, setPlacementComplete] = useState(false);

  // Check if all ships placed
  const allShipsPlaced = player.ships.every((s) => s.positions.length > 0);
  const selectedShip = player.ships.find((s) => s.id === selectedShipId);

  // Update preview when hovering with a selected ship
  useEffect(() => {
    if (!selectedShip || hoverRow === null || hoverCol === null) {
      setPreviewPositions([]);
      return;
    }

    const positions = getShipPositions(
      hoverRow, hoverCol, selectedShip.length, selectedShip.orientation
    );
    const valid = canPlaceShip(player.board, positions);
    setPreviewPositions(positions);
    setPreviewValid(valid);
  }, [selectedShip, hoverRow, hoverCol, player.board]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'r' || e.key === 'R') {
        if (selectedShipId) {
          rotateShipAction(state.placementPlayer, selectedShipId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedShipId(null);
        setPreviewPositions([]);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedShipId, state.placementPlayer, rotateShipAction]);

  // Handle board cell click for placement
  const handleCellClick = useCallback((row, col) => {
    if (!selectedShipId) return;

    const ship = player.ships.find((s) => s.id === selectedShipId);
    if (!ship || ship.positions.length > 0) return;

    const positions = getShipPositions(row, col, ship.length, ship.orientation);
    if (canPlaceShip(player.board, positions)) {
      placeShipAction(state.placementPlayer, selectedShipId, row, col, ship.orientation);
      playSound('sonar');
      setSelectedShipId(null);
      setPreviewPositions([]);
    }
  }, [selectedShipId, player.ships, player.board, state.placementPlayer, placeShipAction, playSound]);

  // Right-click on board rotates the selected ship
  const handleCellRightClick = useCallback((row, col) => {
    if (selectedShipId) {
      rotateShipAction(state.placementPlayer, selectedShipId);
    }
  }, [selectedShipId, state.placementPlayer, rotateShipAction]);

  // Handle cell hover for preview
  const handleCellHover = useCallback((row, col) => {
    setHoverRow(row);
    setHoverCol(col);
  }, []);

  // Open board for ship removal
  const handleBoardClickForRemoval = useCallback((row, col) => {
    if (selectedShipId) return; // placing mode, handled above
    // Click on a placed ship cell to remove it
    const cell = player.board[row][col];
    if (cell.shipId) {
      removeShipAction(state.placementPlayer, cell.shipId);
    }
  }, [selectedShipId, player.board, state.placementPlayer, removeShipAction]);

  const handleRandomize = () => {
    randomizeFleet(state.placementPlayer);
    playSound('cannon');
    setSelectedShipId(null);
    setPreviewPositions([]);
  };

  const handleConfirmPlacement = () => {
    if (!isAI && state.placementPlayer === 1 && !placementComplete) {
      // Show pass overlay for local 2-player mode
      setShowPassOverlay(true);
    } else {
      confirmPlacement(state.placementPlayer);
    }
  };

  const handlePassDevice = () => {
    setShowPassOverlay(false);
    setPlacementComplete(true);
    confirmPlacement(state.placementPlayer);
  };

  return (
    <div className="placement">
      <div className="placement__header">
        <h2 className="placement__title">
          DEPLOY FLEET — {player.name}
        </h2>
        <p className="placement__instructions">
          {selectedShipId
            ? `Placing ${selectedShip?.name} (${selectedShip?.length} cells, ${selectedShip?.orientation === 'h' ? 'HORIZONTAL' : 'VERTICAL'}) — Click board to place, press R or right‑click to rotate`
            : 'Select a ship from the dock, then click the board to place it. Click a placed ship to remove. Press R or click ↻ to rotate.'
          }
        </p>
      </div>

      <div className="placement__layout">
        {/* Ship Dock */}
        <div className="placement__dock">
          <ShipDock
            ships={player.ships}
            selectedShipId={selectedShipId}
            onSelectShip={(id) => {
              const ship = player.ships.find((s) => s.id === id);
              if (ship && ship.positions.length === 0) {
                const newId = id === selectedShipId ? null : id;
                setSelectedShipId(newId);
              }
            }}
            onRotateShip={(id) => rotateShipAction(state.placementPlayer, id)}
          />

          <button className="btn placement__random-btn" onClick={handleRandomize}>
            🎲 Random Placement
          </button>
        </div>

        {/* Board */}
        <div className="placement__board">
          <BoardCanvas
            board={player.board}
            ships={player.ships}
            isEnemy={false}
            isInteractive={true}
            onCellClick={(row, col) => {
              if (selectedShipId) {
                handleCellClick(row, col);
              } else {
                handleBoardClickForRemoval(row, col);
              }
            }}
            onCellRightClick={handleCellRightClick}
            onCellHover={handleCellHover}
            previewPositions={previewPositions}
            previewValid={previewValid}
            label={`${player.name}'s Fleet`}
          />

          {allShipsPlaced && (
            <button className="btn btn--primary placement__start-btn" onClick={handleConfirmPlacement}>
              ⚡ {(!isAI && state.placementPlayer === 1) ? 'NEXT PLAYER' : 'START BATTLE'}
            </button>
          )}
        </div>
      </div>

      {/* Pass Device Overlay (local 2-player only) */}
      {showPassOverlay && (
        <div className="overlay">
          <div className="overlay__content">
            <div className="overlay__title">HANDOFF</div>
            <p className="overlay__text">
              Pass the device to <strong>{state.player2.name}</strong>.
              <br />
              They will now place their fleet in secret.
            </p>
            <button className="btn btn--primary" onClick={handlePassDevice}>
              Ready — Deploy {state.player2.name}'s Fleet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
