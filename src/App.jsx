import { useEffect, useRef } from 'react';
import { useGame, PHASE } from './context/GameContext';
import { useGameAudio } from './components/AudioManager';
import LandingScreen from './components/LandingScreen';
import PlacementScreen from './components/PlacementScreen';
import BattleScreen from './components/BattleScreen';
import GameOverScreen from './components/GameOverScreen';
import AudioManager from './components/AudioManager';
import './App.css';

export default function App() {
  return (
    <AudioManager>
      <AppContent />
    </AudioManager>
  );
}

function AppContent() {
  const { state, resetGame } = useGame();
  const { startAmbient, stopAmbient, playSound } = useGameAudio();
  const prevPhaseRef = useRef(state.phase);

  // Ambient sonar during landing & placement, stop during battle & gameover
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;

    if (state.phase === PHASE.LANDING || state.phase === PHASE.PLACEMENT) {
      startAmbient();
    } else if (state.phase === PHASE.BATTLE) {
      stopAmbient();
      if (prev === PHASE.PLACEMENT) {
        playSound('cannon'); // battle start!
      }
    } else if (state.phase === PHASE.GAMEOVER) {
      stopAmbient();
    }
  }, [state.phase, startAmbient, stopAmbient, playSound]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">
          ⚓ BATTLESHIP COMMAND
        </h1>
        <div className="app-header__controls">
          {state.phase !== PHASE.LANDING && (
            <button className="btn btn--small btn--danger" onClick={resetGame}>
              ✕ Quit
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {state.phase === PHASE.LANDING && <LandingScreen />}
        {state.phase === PHASE.PLACEMENT && <PlacementScreen />}
        {state.phase === PHASE.BATTLE && <BattleScreen />}
        {state.phase === PHASE.GAMEOVER && <GameOverScreen />}
      </main>
    </div>
  );
}
