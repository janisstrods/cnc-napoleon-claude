import { useEffect, useState, type ReactNode } from 'react';
import { CARD_DEFS } from '../engine/cards';
import type { CardGroup, CardKind, DieFace } from '../engine/types';
import {
  ALL_DIE_FACES,
  BannerTrack,
  Button,
  CardBack,
  CardView,
  DiceTray,
  DieView,
  Modal,
  Panel,
  SectionMiniMap,
  Tabletop,
  Tooltip,
  bannerCloth,
} from '../ui/kit';

const GROUPS: { group: CardGroup; title: string; blurb: string }[] = [
  { group: 'section', title: 'Section cards', blurb: 'Scout, Probe, Attack and Assault — order units in one battlefield section.' },
  { group: 'tactic', title: 'Tactic cards', blurb: 'Special manoeuvres and gambits.' },
];

const KINDS = Object.keys(CARD_DEFS) as CardKind[];

function rollFaces(n: number): DieFace[] {
  return Array.from({ length: n }, () => ALL_DIE_FACES[Math.floor(Math.random() * ALL_DIE_FACES.length)]);
}

function Heading({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div style={{ margin: '44px 0 18px' }}>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--kit-font-title)',
          fontWeight: 400,
          fontSize: 22,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: 'var(--kit-ink)',
        }}
      >
        {children}
      </h2>
      {sub ? <div style={{ fontStyle: 'italic', color: 'var(--kit-ink-soft)', fontSize: 16, marginTop: 2 }}>{sub}</div> : null}
      <div style={{ height: 1, marginTop: 10, background: 'linear-gradient(90deg, rgba(59,49,39,.55), rgba(59,49,39,0) 70%)' }} />
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--kit-font-title)',
        fontSize: 11,
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        color: 'var(--kit-ink-soft)',
        textAlign: 'center',
        marginTop: 10,
      }}
    >
      {children}
    </div>
  );
}

export default function KitGallery() {
  const [selected, setSelected] = useState<CardKind | null>('attackC');
  const [hover, setHover] = useState<{ kind: CardKind; x: number; y: number } | null>(null);
  const [modal, setModal] = useState(() => window.location.hash.includes('modal'));
  const [rolling, setRolling] = useState(true);
  const [faces, setFaces] = useState<DieFace[]>(['infantry', 'sabre', 'flag', 'artillery', 'infantry']);
  const [banners, setBanners] = useState(3);
  const [hand, setHand] = useState<number | null>(2);

  useEffect(() => {
    if (!rolling) return;
    const t = window.setTimeout(() => {
      setFaces(rollFaces(5));
      setRolling(false);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [rolling]);

  const scoring = faces.map((f) => f === 'infantry' || f === 'sabre');
  const handKinds: CardKind[] = ['probeL', 'attackC', 'assaultR', 'bayonetCharge', 'bombard', 'elan'];

  return (
    <Tabletop style={{ position: 'fixed', inset: 0, overflow: 'auto', padding: '36px 48px 80px', boxSizing: 'border-box' }}>
      <header style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--kit-font-title)', fontSize: 13, letterSpacing: '.4em', color: 'var(--kit-ink-soft)', textTransform: 'uppercase' }}>
          Commands &amp; Colours · Napoleonics
        </div>
        <h1
          style={{
            margin: '6px 0 4px',
            fontFamily: 'var(--kit-font-title)',
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: '.08em',
            color: 'var(--kit-ink)',
          }}
        >
          UI Kit
        </h1>
        <div style={{ fontStyle: 'italic', fontSize: 18, color: 'var(--kit-ink-soft)' }}>Cards, dice, banners and furniture for the war table</div>
      </header>

      {GROUPS.map(({ group, title, blurb }) => (
        <div key={group}>
          <Heading sub={blurb}>{title}</Heading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {KINDS.filter((k) => CARD_DEFS[k].group === group).map((k) => (
              <CardView
                key={k}
                kind={k}
                selected={selected === k}
                onClick={() => setSelected(selected === k ? null : k)}
              />
            ))}
          </div>
        </div>
      ))}

      <Heading sub="sm (hand) · md · lg (tooltip / detail) · card back">Sizes</Heading>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap' }}>
        <div>
          <CardView kind="scoutL" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardView kind="probeC" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardView kind="attackR" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardView kind="cavalryCharge" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardBack size="sm" />
          <Label>back sm</Label>
        </div>
        <div>
          <CardView kind="grandManoeuvre" size="md" />
          <Label>md</Label>
        </div>
        <div>
          <CardBack size="md" />
          <Label>back md</Label>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap', marginTop: 26 }}>
        <div>
          <CardView kind="firstStrike" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardView kind="assaultC" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardView kind="leadership" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardView kind="rally" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardBack size="lg" />
          <Label>back lg</Label>
        </div>
      </div>

      <Heading sub="selected · disabled · highlight · mirrored (Counter Attack view) · hover lifts">States</Heading>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap', paddingTop: 16 }}>
        <div>
          <CardView kind="attackL" />
          <Label>normal</Label>
        </div>
        <div>
          <CardView kind="attackL" selected />
          <Label>selected</Label>
        </div>
        <div>
          <CardView kind="attackL" disabled />
          <Label>disabled</Label>
        </div>
        <div>
          <CardView kind="attackL" highlight />
          <Label>highlight</Label>
        </div>
        <div>
          <CardView kind="attackL" mirrored />
          <Label>mirrored</Label>
        </div>
        <div>
          <CardView kind="flankAttack" mirrored />
          <Label>mirrored</Label>
        </div>
        <div style={{ marginLeft: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 196, padding: '0 30px 34px' }}>
            {handKinds.map((k, i) => {
              const n = handKinds.length;
              const a = (i - (n - 1) / 2) * 6;
              return (
                <div
                  key={k}
                  onMouseMove={(e) => setHover({ kind: k, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    marginLeft: i === 0 ? 0 : -38,
                    transform: `rotate(${a}deg) translateY(${Math.abs(a) * 1.4}px)`,
                    transformOrigin: '50% 120%',
                    zIndex: hand === i ? 10 : i,
                  }}
                >
                  <CardView
                    kind={k}
                    size="sm"
                    selected={hand === i}
                    disabled={k === 'elan'}
                    onClick={() => setHand(hand === i ? null : i)}
                  />
                </div>
              );
            })}
          </div>
          <Label>a hand of sm cards (click to select, hover for detail)</Label>
        </div>
      </div>

      <Heading sub="ivory battle dice — plain · hit · flag · miss · rolling">Dice</Heading>
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 64px)', gap: '14px 10px', alignItems: 'center' }}>
          <div />
          {ALL_DIE_FACES.map((f) => (
            <Label key={f}>{f}</Label>
          ))}
          {([null, 'hit', 'flag', 'miss', 'rolling'] as const).map((st) => (
            <RowDice key={String(st)} st={st} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <DiceTray
            title="French Line Infantry attack — 4 dice"
            faces={faces}
            scoring={rolling ? undefined : scoring}
            rolling={rolling}
            style={{ width: 430 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={() => setRolling(true)} disabled={rolling}>
              Roll the dice
            </Button>
          </div>
          <DiceTray
            title="British Rifles fire — 3 dice"
            subtitle="1 hit — the French lose a block"
            faces={['infantry', 'flag', 'cavalry']}
            scoring={[true, false, false]}
            dieSize={40}
            style={{ width: 430 }}
          />
          <DiceTray title="Rally — roll Command (4)" faces={['infantry', 'cavalry', 'artillery', 'sabre']} rolling style={{ width: 430 }} />
        </div>
      </div>

      <Heading sub="captured banners in the opponent's colours; slots up to the scenario target">Banner tracks</Heading>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <BannerTrack label="British" count={banners} target={6} nation="FR" />
        <BannerTrack label="French" count={2} target={6} nation="BR" />
        <BannerTrack label="Portuguese" count={4} target={5} nation="BR" />
        <BannerTrack label="Spanish" count={5} target={5} nation="SP" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => setBanners((b) => Math.min(6, b + 1))}>
            Capture
          </Button>
          <Button variant="ghost" onClick={() => setBanners(0)}>
            Reset
          </Button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 18 }}>
        {(
          [
            ['french', 'FR'],
            ['british', 'BR'],
            ['spanish', 'SP'],
          ] as const
        ).map(([f, nation]) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(['light', 'main', 'dark'] as const).map((t) => (
              <span
                key={t}
                style={{ width: 22, height: 22, borderRadius: 4, background: bannerCloth(nation)[t], boxShadow: '0 0 0 1px rgba(0,0,0,.5)' }}
              />
            ))}
            <span style={{ fontFamily: 'var(--kit-font-title)', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--kit-ink-soft)' }}>{f}</span>
          </div>
        ))}
      </div>

      <Heading sub="buttons · panels · modal · tooltip · section mini-map">Furniture</Heading>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Button>Play card</Button>
            <Button variant="secondary">End movement</Button>
            <Button variant="ghost">Undo</Button>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Button disabled>Battle</Button>
            <Button variant="secondary" disabled>
              Retreat
            </Button>
            <Button variant="ghost" disabled>
              Skip
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Button onClick={() => setModal(true)}>Open modal</Button>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 6 }}>
            <SectionMiniMap sections={['left']} size={60} />
            <SectionMiniMap sections={['center']} size={60} />
            <SectionMiniMap sections={['left', 'right']} size={60} />
            <SectionMiniMap sections={['left', 'center', 'right']} counts={{ left: 1, center: 1, right: 1 }} size={90} />
          </div>
        </div>
        <Panel title="Battle Log" style={{ width: 340 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <b style={{ color: 'var(--kit-crimson)' }}>The British</b> play <i>Attack Centre</i>.
            </div>
            <div>Line Infantry melee — 4 dice: 2 hits, 1 flag.</div>
            <div>French Line Infantry retreats 1 hex.</div>
            <div style={{ color: 'var(--kit-crimson)' }}>The British capture a banner (3 / 6).</div>
          </div>
        </Panel>
        <Panel title="Orders" variant="parchment" style={{ width: 300 }}>
          Select up to <b>3 units</b> in the <b>centre</b> section. Leaders may be ordered separately.
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button>Confirm</Button>
            <Button variant="ghost" style={{ color: 'var(--kit-crimson)', boxShadow: 'inset 0 0 0 1px var(--kit-crimson)' }}>
              Clear
            </Button>
          </div>
        </Panel>
        <div style={{ position: 'relative', width: 380, height: 170, borderRadius: 10, background: 'rgba(59,49,39,.05)', boxShadow: 'inset 0 0 0 1px rgba(59,49,39,.25)' }}>
          <div style={{ position: 'absolute', left: 28, top: 30, width: 14, height: 14, borderRadius: '50%', background: '#f0c46a' }} />
          <Tooltip x={35} y={37} position="absolute" offset={14}>
            <div className="kit-tooltip__title">French Line Infantry</div>
            4 blocks · melee by its blocks
            <br />
            <i style={{ color: 'var(--kit-parchment-dark)' }}>vs British Line Infantry: 1.3 expected hits</i>
          </Tooltip>
        </div>
      </div>

      {hover ? (
        <Tooltip x={hover.x} y={hover.y} variant="bare">
          <CardView kind={hover.kind} size="lg" />
        </Tooltip>
      ) : null}

      <Modal open={modal} title="Counter Attack" onClose={() => setModal(false)}>
        <p style={{ marginTop: 0 }}>
          Your opponent played <b>Probe Left</b>. Counter Attack issues the same order from your side of the field, with left and right swapped.
        </p>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', margin: '14px 0 18px' }}>
          <CardView kind="counterAttack" size="sm" />
          <CardView kind="probeL" size="sm" mirrored />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button onClick={() => setModal(false)}>Play it</Button>
          <Button variant="secondary" onClick={() => setModal(false)}>
            Keep in hand
          </Button>
        </div>
      </Modal>
    </Tabletop>
  );
}

function RowDice({ st }: { st: null | 'hit' | 'flag' | 'miss' | 'rolling' }) {
  return (
    <>
      <Label>{st ?? 'plain'}</Label>
      {ALL_DIE_FACES.map((f, i) => (
        <div key={f} style={{ display: 'grid', placeItems: 'center' }}>
          <DieView face={f} size={48} rolling={st === 'rolling'} delay={-i * 0.13} state={st === 'rolling' ? null : st} />
        </div>
      ))}
    </>
  );
}
