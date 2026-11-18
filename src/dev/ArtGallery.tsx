// Dev gallery for the unit art: the placeholder token of every unit row (`UNIT_KEYS`) at full strength and wounded, both
// facings, its icon, and a leader per nation (alone and attached). The public tokens now draw the Napoleonic art for art keys
// (see `#/gallery/figures`); this page shows what the public components produce.
import { LEADER_ATTACH_OFFSET, LeaderToken, UnitIcon, UnitToken, blockColors, figureKind } from '../art';
import { NATIONS, NATION_NAMES, UNIT_KEYS, UNIT_STATS, nationOf } from '../engine';

const page: React.CSSProperties = { minHeight: '100vh', background: '#4a3a28', color: '#f3e7c8', padding: 20, boxSizing: 'border-box', overflow: 'auto' };
const h2: React.CSSProperties = { fontFamily: "'IM Fell English SC', serif", fontSize: 20, margin: '24px 0 8px' };
const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 12 };

export default function ArtGallery() {
  return (
    <div style={page}>
      <h1 style={{ fontFamily: "'IM Fell English SC', serif", margin: 0 }}>Art gallery</h1>
      <div style={{ opacity: 0.8 }}>Placeholder tokens: one per unit row ({UNIT_KEYS.length}), one leader per nation.</div>

      {NATIONS.map((n) => {
        const keys = UNIT_KEYS.filter((k) => nationOf(k) === n);
        return keys.length ? (
          <section key={n}>
            <div style={h2}>{NATION_NAMES[n]}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {keys.map((k) => {
                const full = UNIT_STATS[k].blocks;
                return (
                  <div key={k} style={cell} data-key={k}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <svg width={130} height={130} viewBox="-65 -65 130 130">
                        <UnitToken unitKey={k} nation={n} blocks={full} maxBlocks={full} facing="right" />
                      </svg>
                      <svg width={130} height={130} viewBox="-65 -65 130 130">
                        <UnitToken unitKey={k} nation={n} blocks={Math.max(1, full - 2)} maxBlocks={full} facing="left" />
                      </svg>
                      <svg width={44} height={44} viewBox="-30 -30 60 60">
                        <UnitIcon unitKey={k} size={54} />
                      </svg>
                    </div>
                    <b>{k}</b> {UNIT_STATS[k].name} ({figureKind(k)}, {full} blocks)
                  </div>
                );
              })}
            </div>
          </section>
        ) : null;
      })}

      <div style={h2}>Leaders</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {NATIONS.map((n) => (
          <div key={n} style={cell}>
            <svg width={200} height={150} viewBox="-100 -75 200 150">
              <g transform="translate(-45, 0)">
                <LeaderToken name={`${NATION_NAMES[n]} leader`} nation={n} attached={false} />
              </g>
              <g transform="translate(30, 10)">
                <UnitToken unitKey={`${n}/LN`} nation={n} blocks={4} maxBlocks={4} facing="right" />
                <g transform={`translate(${LEADER_ATTACH_OFFSET.x}, ${LEADER_ATTACH_OFFSET.y})`}>
                  <LeaderToken name="Leader" nation={n} attached />
                </g>
              </g>
            </svg>
            <span style={{ background: blockColors(n).edge, padding: '0 8px' }}>{NATION_NAMES[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
