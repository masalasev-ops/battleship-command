import { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_MODE, CELL_STATUS } from '../logic/constants';
import { useGameAudio } from './AudioManager';
import BoardCanvas from './BoardCanvas';
import TurnIndicator from './TurnIndicator';
import MessageLog from './MessageLog';
import ShipHealth from './ShipHealth';
import './BattleScreen.css';

export default function BattleScreen() {
  const { state, attackCell, executeAIMove } = useGame();
  const { playSound } = useGameAudio();

  const isAI = state.mode === GAME_MODE.AI;
  const isLocal = state.mode === GAME_MODE.LOCAL;

  const [aiThinking, setAiThinking] = useState(false);
  const [shakeEnemyBoard, setShakeEnemyBoard] = useState(false);
  const [shakeOwnBoard, setShakeOwnBoard] = useState(false);
  const [showPassOverlay, setShowPassOverlay] = useState(false);
  const [mobileView, setMobileView] = useState('enemy');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const aiTimeoutRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Play sounds based on message log changes
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    const newCount = state.messageLog.length;
    if (newCount > prevCount) {
      // Check the newest messages
      for (let i = prevCount; i < newCount; i++) {
        const msg = state.messageLog[i];
        if (msg.includes('SUNK')) {
          playSound('sink');
        } else if (msg.startsWith('Enemy') && msg.includes('HIT')) {
          playSound('hit');
        } else if (msg.startsWith('Enemy') && msg.includes('Miss')) {
          playSound('miss');
        } else if (msg.includes('HIT')) {
          playSound('hit');
        } else if (msg.includes('Miss')) {
          playSound('miss');
        }
      }
    }
    prevMsgCountRef.current = newCount;
  }, [state.messageLog, playSound]);

  // Perspective: In AI mode, always show from Player 1's view.
  // In local mode, flip perspective based on currentPlayer.
  const perspectivePlayer = isAI
    ? 'player1'
    : (state.currentPlayer === 1 ? 'player1' : 'player2');
  const enemyPlayer = isAI
    ? 'player2'
    : (state.currentPlayer === 1 ? 'player2' : 'player1');

  const ownData = state[perspectivePlayer];
  const enemyData = state[enemyPlayer];

  // AI move logic
  useEffect(() => {
    if (!isAI) return;
    if (state.currentPlayer !== 2) return;
    if (state.phase !== 'battle') return;

    setAiThinking(true);

    aiTimeoutRef.current = setTimeout(() => {
      const remainingShips = state.player1.ships.filter((s) => !s.sunk);

      const move = executeAIMove(
        state.player1.board,
        state.player2.shots,
        remainingShips,
        state.aiDifficulty,
        state.aiState
      );

      if (move) {
        const cell = state.player1.board[move.row][move.col];
        if (cell.status === CELL_STATUS.SHIP) {
          setShakeOwnBoard(true);
          setTimeout(() => setShakeOwnBoard(false), 300);
        }
      }

      setAiThinking(false);
    }, 600 + Math.random() * 400);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [state.currentPlayer, state.phase, isAI]);

  // Handle player attack
  const handleEnemyCellClick = useCallback((row, col) => {
    if (state.currentPlayer !== 1) return;
    if (aiThinking) return;

    const cell = enemyData.board[row][col];
    if (cell.status === CELL_STATUS.HIT || cell.status === CELL_STATUS.MISS) return;

    attackCell(1, row, col);

    if (cell.status === CELL_STATUS.SHIP) {
      setShakeEnemyBoard(true);
      setTimeout(() => setShakeEnemyBoard(false), 300);
    }

    if (isLocal) {
      setTimeout(() => setShowPassOverlay(true), 800);
    }
  }, [state.currentPlayer, enemyData.board, aiThinking, isLocal, attackCell]);

  // Handle local player 2 attack (after pass overlay)
  const handleLocalP2Attack = useCallback((row, col) => {
    if (state.currentPlayer !== 2) return;

    const cell = enemyData.board[row][col];
    if (cell.status === CELL_STATUS.HIT || cell.status === CELL_STATUS.MISS) return;

    attackCell(2, row, col);

    if (cell.status === CELL_STATUS.SHIP) {
      setShakeEnemyBoard(true);
      setTimeout(() => setShakeEnemyBoard(false), 300);
    }

    setTimeout(() => setShowPassOverlay(true), 800);
  }, [state.currentPlayer, enemyData.board, attackCell]);

  const handlePassReady = () => {
    setShowPassOverlay(false);
  };

  const isEnemyBoardInteractive = !aiThinking && !showPassOverlay;

  return (
    <div className="battle">
      <TurnIndicator
        currentPlayer={state.currentPlayer}
        player1Name={state.player1.name}
        player2Name={state.player2.name}
        isAIThinking={aiThinking}
        mode={state.mode}
      />

      <div className="battle__content">
        <div className="battle__sidebar battle__sidebar--left">
          <ShipHealth ships={ownData.ships} label="YOUR FLEET" />
        </div>

        <div className="battle__boards">
          {isMobile && (
            <div className="battle__mobile-toggle">
              <button
                className={`btn btn--small ${mobileView === 'enemy' ? 'btn--primary' : ''}`}
                onClick={() => setMobileView('enemy')}
              >
                Enemy Waters
              </button>
              <button
                className={`btn btn--small ${mobileView === 'own' ? 'btn--primary' : ''}`}
                onClick={() => setMobileView('own')}
              >
                Your Fleet
              </button>
            </div>
          )}

          {/* Own board */}
          {(!isMobile || mobileView === 'own') && (
            <div className="battle__board-container">
              <BoardCanvas
                board={ownData.board}
                ships={ownData.ships}
                isEnemy={false}
                isInteractive={false}
                shakeBoard={shakeOwnBoard}
                label={`${ownData.name}'s Fleet`}
              />
            </div>
          )}

          {/* Enemy board */}
          {(!isMobile || mobileView === 'enemy') && (
            <div className={`battle__board-container ${showPassOverlay ? 'battle__board--hidden' : ''}`}>
              <BoardCanvas
                board={enemyData.board}
                ships={enemyData.ships}
                isEnemy={true}
                isInteractive={isEnemyBoardInteractive && state.currentPlayer === (perspectivePlayer === 'player1' ? 1 : 2)}
                onCellClick={state.currentPlayer === 1 ? handleEnemyCellClick : handleLocalP2Attack}
                shakeBoard={shakeEnemyBoard}
                label={`${enemyData.name}'s Waters`}
              />
              {showPassOverlay && (
                <div className="battle__peek-cover">
                  <span>🔒 Board Hidden</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="battle__sidebar battle__sidebar--right">
          <MessageLog messages={state.messageLog} />
          <ShipHealth ships={enemyData.ships} label="ENEMY FLEET" />
        </div>
      </div>

      {showPassOverlay && (
        <div className="overlay">
          <div className="overlay__content">
            <div className="overlay__title">HANDOFF</div>
            <p className="overlay__text">
              Pass the device to{' '}
              <strong>{state.currentPlayer === 1 ? state.player1.name : state.player2.name}</strong>.
              <br />
              The battle board is hidden to prevent screen-peeking.
            </p>
            <button className="btn btn--primary" onClick={handlePassReady}>
              Ready — {state.currentPlayer === 1 ? state.player1.name : state.player2.name}'s Turn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
