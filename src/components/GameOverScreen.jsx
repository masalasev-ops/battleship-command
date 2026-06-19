import { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_MODE, CELL_STATUS } from '../logic/constants';
import { useGameAudio } from './AudioManager';
import BoardCanvas from './BoardCanvas';
import './GameOverScreen.css';

export default function GameOverScreen() {
  const { state, resetGame } = useGame();
  const { playSound } = useGameAudio();
  const [showReveal, setShowReveal] = useState(false);
  const hasPlayedRef = useRef(false);

  const isPlayer1Winner = state.winner === 1;
  const winnerName = isPlayer1Winner ? state.player1.name : state.player2.name;
  const isAIWinner = state.mode === GAME_MODE.AI && state.winner === 2;
  const isLocalMode = state.mode === GAME_MODE.LOCAL;

  // Play victory/defeat sound once on mount
  useEffect(() => {
    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      if (isAIWinner) {
        playSound('defeat');
      } else {
        playSound('victory');
      }
    }
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const winnerShots = isPlayer1Winner ? state.player1.shots : state.player2.shots;
    const hits = winnerShots.filter((s) => {
      const defenderBoard = isPlayer1Winner ? state.player2.board : state.player1.board;
      return defenderBoard[s.row]?.[s.col]?.status === CELL_STATUS.HIT;
    }).length;
    const misses = winnerShots.length - hits;
    const accuracy = winnerShots.length > 0 ? Math.round((hits / winnerShots.length) * 100) : 0;

    return {
      totalShots: winnerShots.length,
      hits,
      misses,
      accuracy,
    };
  }, [state, isPlayer1Winner]);

  const isVictory = isPlayer1Winner || (isLocalMode && state.winner === 2);

  return (
    <div className="gameover">
      <div className={`gameover__content ${isVictory ? 'gameover--victory' : 'gameover--defeat'}`}>
        {/* Title */}
        <h1 className={`gameover__title ${isVictory ? 'gameover__title--win' : 'gameover__title--lose'}`}>
          {isAIWinner ? 'DEFEAT' : 'VICTORY!'}
        </h1>
        <p className="gameover__subtitle">
          {isAIWinner
            ? `${state.player2.name} has destroyed your fleet.`
            : `${winnerName} stands victorious!`}
        </p>

        {/* Stats */}
        <div className="gameover__stats">
          <div className="gameover__stat">
            <span className="gameover__stat-value">{stats.totalShots}</span>
            <span className="gameover__stat-label">Shots Fired</span>
          </div>
          <div className="gameover__stat">
            <span className="gameover__stat-value gameover__stat-value--hit">{stats.hits}</span>
            <span className="gameover__stat-label">Hits</span>
          </div>
          <div className="gameover__stat">
            <span className="gameover__stat-value gameover__stat-value--miss">{stats.misses}</span>
            <span className="gameover__stat-label">Misses</span>
          </div>
          <div className="gameover__stat">
            <span className="gameover__stat-value">{stats.accuracy}%</span>
            <span className="gameover__stat-label">Accuracy</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="gameover__actions">
          <button className="btn btn--primary" onClick={resetGame}>
            ⚓ Play Again
          </button>
          {!showReveal && (
            <button className="btn" onClick={() => setShowReveal(true)}>
              🔍 Reveal Boards
            </button>
          )}
        </div>

        {/* Revealed Boards */}
        {showReveal && (
          <div className="gameover__reveal">
            <h3 className="gameover__reveal-title">FINAL FLEET POSITIONS</h3>
            <div className="gameover__reveal-boards">
              <div>
                <BoardCanvas
                  board={state.player1.board}
                  ships={state.player1.ships}
                  isEnemy={false}
                  isInteractive={false}
                  label={`${state.player1.name}'s Fleet`}
                />
              </div>
              <div>
                <BoardCanvas
                  board={state.player2.board}
                  ships={state.player2.ships}
                  isEnemy={false}
                  isInteractive={false}
                  label={`${state.player2.name}'s Fleet`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
