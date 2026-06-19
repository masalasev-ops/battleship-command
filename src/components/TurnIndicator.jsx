import { memo } from 'react';
import './TurnIndicator.css';

const TurnIndicator = memo(function TurnIndicator({
  currentPlayer,
  player1Name,
  player2Name,
  isAIThinking = false,
  mode = 'ai',
}) {
  const playerName = currentPlayer === 1 ? player1Name : player2Name;
  const isPlayer1 = currentPlayer === 1;

  if (isAIThinking) {
    return (
      <div className="turn-indicator turn-indicator--thinking">
        <div className="turn-indicator__pulse" />
        <span className="turn-indicator__text">Enemy is analyzing…</span>
      </div>
    );
  }

  return (
    <div className={`turn-indicator ${isPlayer1 ? 'turn-indicator--p1' : 'turn-indicator--p2'}`}>
      <div className="turn-indicator__dot" />
      <span className="turn-indicator__text">
        {playerName}'s Turn
      </span>
    </div>
  );
});

export default TurnIndicator;
