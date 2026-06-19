import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_MODE, AI_DIFFICULTY } from '../logic/constants';
import './LandingScreen.css';

export default function LandingScreen() {
  const { state, startGame, setMode, setAiDifficulty, setPlayerName } = useGame();
  const [player1Name, setPlayer1Name] = useState('Admiral');
  const [player2Name, setPlayer2Name] = useState('Captain');
  const [selectedMode, setSelectedMode] = useState(state.mode);
  const [selectedDifficulty, setSelectedDifficulty] = useState(state.aiDifficulty);
  const radarRef = useRef(null);

  // Radar animation
  useEffect(() => {
    const canvas = radarRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;
    let animId;

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.45;

      // Radar circles
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (i / 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshair lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      // Sweep line
      const sweepAngle = angle + Math.PI * 0.3; // wedge angle
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, sweepAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
      gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      // Center dot
      ctx.fillStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Random dots (targets)
      ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
      for (let i = 0; i < 6; i++) {
        const dotAngle = (angle * 0.3 + i * 1.05) % (Math.PI * 2);
        const dist = radius * (0.3 + ((i * 0.17) % 0.7));
        const dx = cx + Math.cos(dotAngle) * dist;
        const dy = cy + Math.sin(dotAngle) * dist;
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      angle = (angle + 0.015) % (Math.PI * 2);
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  function handleStart() {
    setMode(selectedMode);
    setAiDifficulty(selectedDifficulty);
    setPlayerName(1, player1Name || 'Admiral');
    if (selectedMode === GAME_MODE.LOCAL) {
      setPlayerName(2, player2Name || 'Captain');
    }
    startGame(selectedMode, player1Name || 'Admiral', player2Name || 'Captain', selectedDifficulty);
  }

  return (
    <div className="landing">
      <div className="landing__radar">
        <canvas ref={radarRef} width={300} height={300} />
      </div>

      <div className="landing__content">
        {/* Title */}
        <div className="landing__title-block">
          <h1 className="landing__title">
            BATTLESHIP
            <span className="landing__title-accent"> COMMAND</span>
          </h1>
          <div className="landing__scan-line" />
          <p className="landing__subtitle">NAVAL COMBAT TERMINAL</p>
        </div>

        {/* Mode Selection */}
        <div className="landing__section">
          <h3 className="landing__section-title">SELECT MISSION</h3>
          <div className="radio-group">
            <label
              className={`radio-label ${selectedMode === GAME_MODE.AI ? 'radio-label--selected' : ''}`}
              onClick={() => setSelectedMode(GAME_MODE.AI)}
            >
              <input
                type="radio"
                name="mode"
                value={GAME_MODE.AI}
                checked={selectedMode === GAME_MODE.AI}
                onChange={() => setSelectedMode(GAME_MODE.AI)}
              />
              1 Player vs AI
            </label>
            <label
              className={`radio-label ${selectedMode === GAME_MODE.LOCAL ? 'radio-label--selected' : ''}`}
              onClick={() => setSelectedMode(GAME_MODE.LOCAL)}
            >
              <input
                type="radio"
                name="mode"
                value={GAME_MODE.LOCAL}
                checked={selectedMode === GAME_MODE.LOCAL}
                onChange={() => setSelectedMode(GAME_MODE.LOCAL)}
              />
              2 Players (Local)
            </label>
          </div>
        </div>

        {/* AI Difficulty */}
        {selectedMode === GAME_MODE.AI && (
          <div className="landing__section">
            <h3 className="landing__section-title">ENEMY INTELLIGENCE</h3>
            <div className="radio-group">
              {[
                { val: AI_DIFFICULTY.EASY, label: 'Easy' },
                { val: AI_DIFFICULTY.MEDIUM, label: 'Medium' },
                { val: AI_DIFFICULTY.HARD, label: 'Hard' },
              ].map(({ val, label }) => (
                <label
                  key={val}
                  className={`radio-label ${selectedDifficulty === val ? 'radio-label--selected' : ''}`}
                  onClick={() => setSelectedDifficulty(val)}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={val}
                    checked={selectedDifficulty === val}
                    onChange={() => setSelectedDifficulty(val)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Names */}
        <div className="landing__section">
          <h3 className="landing__section-title">COMMANDER IDENT</h3>
          <div className="landing__names">
            <div className="landing__name-field">
              <label>Player 1</label>
              <input
                className="input-field"
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                placeholder="Admiral"
                maxLength={20}
              />
            </div>
            {selectedMode === GAME_MODE.LOCAL && (
              <div className="landing__name-field">
                <label>Player 2</label>
                <input
                  className="input-field"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  placeholder="Captain"
                  maxLength={20}
                />
              </div>
            )}
          </div>
        </div>

        {/* Start */}
        <button className="btn btn--primary landing__start-btn" onClick={handleStart}>
          ⚓ ENGAGE
        </button>
      </div>
    </div>
  );
}
