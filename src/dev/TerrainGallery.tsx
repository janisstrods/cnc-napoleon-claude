// Dev gallery for the battlefield art: the drill battle's board (normal and flipped), a sampler with every terrain row and the
// tricky joins (river junction, ford, brook, bridge, merged hills, works edges, 2- and 4-sided works, the Walled Farm), the
// objective markers (base and Expansion #1), the terrain legend and the Guerrilla counter glyph.
// URL options (hash query): ?units=1 (mock units on the drill board), ?only=large|sampler|objectives|exp1|legend.
import { useMemo, useState } from 'react';
import { UnitToken } from '../art';
import { TERRAIN_STATS } from '../engine/terrain';
import { boardFromTerrain, createGame, type TerrainSetup } from '../engine/setup';
import type { Nation } from '../engine/codes';
import { TERRAIN_TYPES, type ObjectiveDef, type ObjectiveState, type TerrainType } from '../engine/types';
import { hexId } from '../engine/hex';
import { scenarioById } from '../scenarios';
import { BOARD_H, BOARD_W, hexCenterId } from '../ui/geometry';
import { unitTokenProps } from '../ui/game/boardProps';
import { Icon } from '../ui/kit/Icon';
import { BoardArt, ObjectiveMarkers, TerrainIcon, terrainName } from '../ui/terrain';

const SAMPLER: TerrainSetup[] = [
  { r: 0, c: 1, t: 'river' }, { r: 1, c: 1, t: 'river', crossing: 'ford' }, { r: 2, c: 1, t: 'river' }, { r: 3, c: 1, t: 'river' },
  { r: 3, c: 2, t: 'river', crossing: 'bridge' }, { r: 3, c: 3, t: 'river' }, { r: 4, c: 1, t: 'river' }, { r: 5, c: 1, t: 'river' },
  { r: 0, c: 4, t: 'hill' }, { r: 0, c: 5, t: 'hill' }, { r: 1, c: 5, t: 'hill' }, { r: 1, c: 7, t: 'forest' }, { r: 1, c: 8, t: 'forest' },
  { r: 2, c: 8, t: 'forest' }, { r: 3, c: 6, t: 'rugged' }, { r: 3, c: 7, t: 'rugged' }, { r: 4, c: 7, t: 'rugged' },
  { r: 6, c: 4, t: 'sandQuarry' }, { r: 6, c: 5, t: 'sandQuarry' }, { r: 7, c: 5, t: 'sandQuarry' },
  { r: 1, c: 10, t: 'town' }, { r: 2, c: 10, t: 'windmill' }, { r: 4, c: 10, t: 'fortress' },
  { r: 7, c: 8, t: 'fieldworks', on: 'plain', sides: ['SW', 'SE'] }, { r: 7, c: 9, t: 'fieldworks', on: 'plain', sides: ['SW', 'SE'] },
  { r: 6, c: 10, t: 'fieldworks', on: 'hill', sides: ['NW', 'NE', 'E'] }, { r: 2, c: 3, t: 'fieldworks', on: 'plain', sides: ['W', 'SW', 'SE'] },
  // Expansion #1: a 4-sided redoubt (105), a lone 2-sided work, a Walled Farm
  { r: 5, c: 3, t: 'fieldworks', on: 'plain', sides: ['E', 'SE', 'SW', 'W'] }, { r: 8, c: 6, t: 'fieldworks', on: 'plain', sides: ['NW', 'NE'] },
  { r: 8, c: 10, t: 'walledFarm' },
];

/** The sampler's arrays, then a brook run over a few more hexes (a setup names only one river rule for the whole board). */
function samplerBoard() {
  const b = boardFromTerrain(SAMPLER, 'impassable');
  for (const [r, c] of [[5, 7], [6, 7], [7, 6]] as const) b.terrain[hexId(r, c)] = 'brook';
  b.terrain[hexId(8, 3)] = 'fordNoStop';
  return b;
}

const OBJECTIVES: ObjectiveDef[] = [
  { kind: 'tempHex', side: 'top', hex: hexId(4, 6), timing: 'turnStart', banners: 1, text: '' },
  { kind: 'tempGroup', side: 'bottom', hexes: [hexId(2, 2), hexId(2, 3), hexId(3, 2)], timing: 'turnStart', banners: 1, text: '' },
  { kind: 'exit', side: 'bottom', hex: hexId(0, 9), banners: 1, leadersScore: false, retreatOff: false, text: '' },
  { kind: 'exit', side: 'top', hex: hexId(8, 3), banners: 1, leadersScore: true, retreatOff: false, text: '' },
];

/** Expansion #1 markers: a tempAny pair, a contested majority group (one record per side), an exit edge, a sudden death. */
const EXP1_OBJECTIVES: ObjectiveDef[] = [
  { kind: 'tempAny', side: 'bottom', hexes: [hexId(4, 9), hexId(4, 10)], timing: 'turnStart', banners: 1, text: 'tempAny' },
  { kind: 'majority', side: 'top', hexes: [hexId(2, 2), hexId(2, 3), hexId(3, 2), hexId(3, 3), hexId(4, 2)], banners: 1, startHeld: true, text: 'majority (top)' },
  { kind: 'majority', side: 'bottom', hexes: [hexId(2, 2), hexId(2, 3), hexId(3, 2), hexId(3, 3), hexId(4, 2)], banners: 1, startHeld: false, text: 'majority (bottom)' },
  { kind: 'exitEdge', side: 'top', row: 0, free: 3, banners: 1, text: 'exitEdge' },
  { kind: 'suddenDeath', side: 'bottom', keys: ['SP/FA'], need: 1, text: 'suddenDeath' },
];
/** Not held; tempAny and the majority held by the top side; the majority held by the bottom side. */
const EXP1_STATES: ObjectiveState[][] = [[false, false, false], [true, true, false], [false, false, true]].map(([a, t, b]) =>
  [a, t, b, false, false].map((held) => ({ held, count: 0 })),
);

const frame: React.CSSProperties = { flex: '1 1 640px', maxWidth: 1200 };
const h2: React.CSSProperties = { fontFamily: "'IM Fell English SC', serif", fontSize: 20, margin: '26px 0 8px' };

function Board({ terrain, works, flipped, tokens, objectives, nations = { top: 'BR', bottom: 'FR' } }: {
  terrain: readonly TerrainType[];
  works: readonly number[];
  flipped: boolean;
  tokens?: ReturnType<typeof createGame>['units'];
  objectives?: { defs: ObjectiveDef[]; state: ObjectiveState[] };
  nations?: Record<'top' | 'bottom', Nation>;
}) {
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} style={{ width: '100%', display: 'block' }}>
      <BoardArt terrain={terrain} works={works} flipped={flipped} topLabel="British" bottomLabel="French" />
      {objectives && <ObjectiveMarkers objectives={objectives.defs} objState={objectives.state} flipped={flipped} nations={nations} />}
      {tokens?.map((u) => {
        const { x, y } = hexCenterId(u.hex, flipped);
        return (
          <g key={u.id} transform={`translate(${x}, ${y})`}>
            <UnitToken {...unitTokenProps(u, flipped ? 'top' : 'bottom')} />
          </g>
        );
      })}
    </svg>
  );
}

export default function TerrainGallery() {
  const query = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [units, setUnits] = useState(query.get('units') === '1');
  const only = query.get('only');
  const show = (k: string) => !only || only === k;
  const drill = useMemo(() => createGame(scenarioById('000').setup, 1), []);
  const sampler = useMemo(samplerBoard, []);
  const states: ObjectiveState[][] = [OBJECTIVES.map(() => ({ held: false, count: 0 })), OBJECTIVES.map(() => ({ held: true, count: 0 }))];
  return (
    <div style={{ minHeight: '100vh', background: '#e9e0c8', color: '#2a2418', padding: 20, boxSizing: 'border-box', overflow: 'auto' }}>
      <h1 style={{ fontFamily: "'IM Fell English SC', serif", margin: 0 }}>Terrain gallery</h1>
      <button style={{ margin: '8px 0' }} onClick={() => setUnits((u) => !u)}>{units ? 'hide' : 'show'} units</button>

      {show('legend') && (
        <>
          <div style={h2}>Every terrain row (swatch and name from TERRAIN_STATS)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {TERRAIN_TYPES.map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TerrainIcon t={t} size={64} />
                <span style={{ fontSize: 15 }}>{terrainName(t)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TerrainIcon t="plain" works size={64} />
              <span style={{ fontSize: 15 }}>Field works</span>
            </div>
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{TERRAIN_TYPES.length} rows, {Object.keys(TERRAIN_STATS).length} in the table</div>
          <div style={h2}>Guerrilla counter glyph (16, 32, 64 px; on a counter)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {[16, 32, 64].map((sz) => <Icon key={sz} name="guerrilla" size={sz} color="#2a2418" title="Guerrilla counter" />)}
            {[28, 44].map((sz) => (
              <span key={sz} style={{ display: 'inline-flex', width: sz, height: sz, borderRadius: '50%', background: '#efe5c9', border: '2px solid #3b3127', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="guerrilla" size={sz * 0.72} color="#3b3127" title="Guerrilla counter" />
              </span>
            ))}
          </div>
        </>
      )}

      {show('large') && (
        <>
          <div style={h2}>000 Drill (normal | flipped)</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {[false, true].map((f) => (
              <div key={String(f)} style={frame}>
                <Board terrain={drill.terrain} works={drill.works} flipped={f} tokens={units ? drill.units : undefined} />
              </div>
            ))}
          </div>
        </>
      )}

      {show('sampler') && (
        <>
          <div style={h2}>Sampler: river with ford, bridge, brook and no-stop ford; hills and rugged hills; forest; quarry; town, windmill, fortress; works (normal | flipped)</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {[false, true].map((f) => (
              <div key={String(f)} style={frame}>
                <Board terrain={sampler.terrain} works={sampler.works} flipped={f} />
              </div>
            ))}
          </div>
        </>
      )}

      {show('objectives') && (
        <>
          <div style={h2}>Objective markers: temporary hex, temporary group, two exits (not held | held)</div>
          {states.map((state, k) => (
            <div key={k} style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
              {[false, true].map((f) => (
                <div key={String(f)} style={frame}>
                  <Board terrain={drill.terrain} works={drill.works} flipped={f} objectives={{ defs: OBJECTIVES, state }} />
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {show('exp1') && (
        <>
          <div style={h2}>Expansion #1 markers (Spain top, France bottom): tempAny, contested majority, exit edge on row 0, sudden death (nothing) - not held | top holds | bottom holds</div>
          {EXP1_STATES.map((state, k) => (
            <div key={k} style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
              {[false, true].map((f) => (
                <div key={String(f)} style={frame}>
                  <Board terrain={drill.terrain} works={drill.works} flipped={f} objectives={{ defs: EXP1_OBJECTIVES, state }} nations={{ top: 'SP', bottom: 'FR' }} />
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
