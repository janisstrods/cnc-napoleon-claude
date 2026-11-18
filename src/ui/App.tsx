import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Side } from '../engine';
import {
  GameController, clearSaved, devRouteConfig, legResult, loadSaved, newSessionConfig, rematchConfig, type Difficulty,
  type SavedGame, type SessionConfig,
} from './game/controller';
import { GameScreen } from './game/GameScreen';
import { makeGeneral, makeOpponent } from './game/makeOpponent';
import { MainMenu, ScenarioSelect } from './screens/Menus';
import { ErrorBoundary } from './ErrorBoundary';
import './kit';

const ArtGallery = lazy(() => import('../dev/ArtGallery'));
const TerrainGallery = lazy(() => import('../dev/TerrainGallery'));
const KitGallery = lazy(() => import('../dev/KitGallery'));
const HistoryGallery = lazy(() => import('../dev/HistoryGallery'));
const FigureGallery = lazy(() => import('../dev/FigureGallery'));

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

type Screen = { kind: 'menu' } | { kind: 'select'; battle?: string } | { kind: 'game'; controller: GameController };

function startController(config: SessionConfig, answers: SavedGame['answers'] = [], check?: SavedGame['check']): GameController {
  const opponent = makeOpponent(config);
  const general = makeGeneral(config);
  try {
    return new GameController(config, opponent, answers, check, general);
  } catch (e) {
    opponent.dispose();
    general.dispose();
    throw e;
  }
}

export function App() {
  const hash = useHash();
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const devStarted = useRef(false);
  useEffect(() => {
    // Dev shortcut: #/play/<scenario>/<top|bottom>/<difficulty>[/<seed>] starts a battle directly (000 for now).
    if (devStarted.current) return;
    const cfg = devRouteConfig(window.location.hash);
    if (!cfg) return;
    devStarted.current = true;
    setScreen({ kind: 'game', controller: startController(cfg) });
  }, []);
  const [saved, setSaved] = useState<SavedGame | null>(() => loadSaved());
  const [notice, setNotice] = useState<string | null>(null);


  if (hash.startsWith('#/gallery/art')) return <Suspense fallback={null}><ArtGallery /></Suspense>;
  if (hash.startsWith('#/gallery/terrain')) return <Suspense fallback={null}><TerrainGallery /></Suspense>;
  if (hash.startsWith('#/gallery/kit')) return <Suspense fallback={null}><KitGallery /></Suspense>;
  if (hash.startsWith('#/gallery/figures')) return <Suspense fallback={null}><FigureGallery route={hash} /></Suspense>;
  if (hash.startsWith('#/gallery/history')) return <Suspense fallback={null}><HistoryGallery key={hash} /></Suspense>;

  const toMenu = () => {
    if (screen.kind === 'game') screen.controller.dispose();
    setSaved(loadSaved());
    setScreen({ kind: 'menu' });
  };

  if (screen.kind === 'game') {
    const rematch = (switchSides: boolean) => {
      const { config } = screen.controller;
      const { over, display } = screen.controller.getView();
      const cfg = rematchConfig(config, switchSides, over ? legResult(display, config.humanSide, over.winner) : undefined);
      screen.controller.dispose();
      clearSaved();
      setScreen({ kind: 'game', controller: startController(cfg) });
    };
    return (
      <ErrorBoundary onReset={toMenu}>
        <GameScreen key={screen.controller.config.seed} controller={screen.controller} onExit={toMenu} onRematch={rematch} />
      </ErrorBoundary>
    );
  }
  // the picker's failure is no reason to touch the saved game; only the main menu's boundary clears it (a bad save may be its cause)
  const resetMenus = () => {
    clearSaved();
    setSaved(null);
    setScreen({ kind: 'menu' });
  };
  if (screen.kind === 'select') {
    return (
      <ErrorBoundary onReset={toMenu} message="Something went wrong while drawing the battle picker. Any saved game is untouched; you can return to the menu.">
      <ScenarioSelect
        initialBattle={screen.battle}
        onBack={toMenu}
        onStart={(id: string, side: Side, diff: Difficulty, personality?: string) => {
          clearSaved();
          const cfg = newSessionConfig(id, side, diff);
          if (personality) cfg.personality = personality;
          setScreen({ kind: 'game', controller: startController(cfg) });
        }}
      />
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary
      onReset={resetMenus}
      message="Something went wrong while drawing the menu. The button below discards any saved game and starts the menu afresh."
      buttonLabel="Discard the saved game and restart the menu"
    >
    <MainMenu
      notice={notice}
      saved={saved}
      onNew={(battle) => setScreen({ kind: 'select', battle })}
      onContinue={() => {
        if (!saved) return;
        try {
          setScreen({ kind: 'game', controller: startController(saved.config, saved.answers, saved.check) });
        } catch (e) {
          console.error('Could not resume', e);
          clearSaved();
          setSaved(null);
          setNotice('That saved battle could not be restored (it was made with an older version). Please start a new battle.');
        }
      }}
    />
    </ErrorBoundary>
  );
}
