// Battle catalogue: ids, names and dates of every battle of the game, whether or not it is transcribed yet.
// Base battles 001-015: names and dates from design/survey.md.
// Expansion #1 (The Spanish Army) 101-118: official list at
// https://www.commandsandcolors.net/napoleonics/the-game/game-boxes/expansion-1/expansion-1-official-scenarios.html
// (the site writes two-part battles as 'Talavera - Spanish Flank'; here they take the survey's parenthesised form).
export interface CatalogueEntry { id: string; name: string; date: string; box: 'base' | 'exp1' }

export const CATALOGUE: readonly CatalogueEntry[] = [
  { id: '001', name: 'Roliça (French First Position)', date: '17 August 1808', box: 'base' },
  { id: '002', name: 'Roliça (French Second Position)', date: '17 August 1808', box: 'base' },
  { id: '003', name: 'Vimiero', date: '21 August 1808', box: 'base' },
  { id: '004', name: 'Corunna', date: '16 January 1809', box: 'base' },
  { id: '005', name: 'Talavera', date: '28 July 1809', box: 'base' },
  { id: '006', name: 'River Côa', date: '24 July 1810', box: 'base' },
  { id: '007', name: "Bussaco (Reynier's Assault)", date: '27 September 1810', box: 'base' },
  { id: '008', name: "Bussaco (Ney's Assault)", date: '27 September 1810', box: 'base' },
  { id: '009', name: 'Combat at Redinha', date: '12 March 1811', box: 'base' },
  { id: '010', name: 'Salamanca (Attack on the French Left)', date: '22 July 1812', box: 'base' },
  { id: '011', name: 'Salamanca (Attack on the French Right)', date: '22 July 1812', box: 'base' },
  { id: '012', name: 'García Hernández', date: '23 July 1812', box: 'base' },
  { id: '013', name: 'Combat at Aire', date: '2 March 1814', box: 'base' },
  { id: '014', name: 'Quatre Bras', date: '16 June 1815', box: 'base' },
  { id: '015', name: 'Waterloo', date: '18 June 1815', box: 'base' },
  { id: '101', name: 'Bailén', date: '19 July 1808', box: 'exp1' },
  { id: '102', name: 'Zornoza', date: '31 October 1808', box: 'exp1' },
  { id: '103', name: 'Gamonal', date: '10 November 1808', box: 'exp1' },
  { id: '104', name: 'Espinosa de los Monteros', date: '10-11 November 1808', box: 'exp1' },
  { id: '105', name: 'Somosierra', date: '30 November 1808', box: 'exp1' },
  { id: '106', name: 'Medellín', date: '28 March 1809', box: 'exp1' },
  { id: '107', name: 'Alcañiz', date: '23 May 1809', box: 'exp1' },
  { id: '108', name: 'María', date: '15 June 1809', box: 'exp1' },
  { id: '109', name: 'Talavera (Spanish Flank)', date: '28 July 1809', box: 'exp1' },
  { id: '110', name: 'Tamames', date: '18 October 1809', box: 'exp1' },
  { id: '111', name: 'Ocaña (Cavalry Action)', date: '18 November 1809', box: 'exp1' },
  { id: '112', name: 'Ocaña', date: '19 November 1809', box: 'exp1' },
  { id: '113', name: 'Alba de Tormes', date: '28 November 1809', box: 'exp1' },
  { id: '114', name: 'Barrosa', date: '5 March 1811', box: 'exp1' },
  { id: '115', name: 'Albuera', date: '16 May 1811', box: 'exp1' },
  { id: '116', name: 'Vitoria', date: '21 June 1813', box: 'exp1' },
  { id: '117', name: 'San Marcial', date: '31 August 1813', box: 'exp1' },
  { id: '118', name: 'Ordal Cross', date: '13 September 1813', box: 'exp1' },
];

export function catalogueEntry(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((b) => b.id === id);
}
