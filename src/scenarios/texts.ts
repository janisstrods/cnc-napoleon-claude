// Briefing texts by battle id; the loader reads this table.

export interface ScenarioTexts {
  /** Short original summary of the historical battle. */
  blurb: string;
  /** Plain-language special rules shown in the briefing. */
  specialText?: string[];
  /** One-line hint shown in the battle list. */
  hint: string;
}

export const TEXTS: Record<string, ScenarioTexts> = {
  '001': {
    blurb: "On 17 August 1808 Wellesley's British and Portuguese left Óbidos in three columns, meaning to wrap both flanks of Delaborde's small French force on the hill of Roliça. Delaborde, who had warned his men, pulled back only as the flank columns came into view, and the encircling movement found only bare hillside. The French settled on a stronger line at Columbeira.",
    specialText: [
      "Each hill at either end of the French baseline gives the Anglo-Portuguese a temporary banner while one of their units holds it at the start of their turn.",
      "The river is fordable everywhere.",
    ],
    hint: "Close on Delaborde from both flanks and take the hills.",
  },
  '002': {
    blurb: "Wellesley followed Delaborde to the ridge above Columbeira, a scrubby slope furrowed by four ravines. Trant and Ferguson marched wide on the flanks while the centre brigades deployed, but the 29th climbed a ravine too soon and lost its colonel. The British took the crest after about two hours, and Delaborde retired in good order.",
    hint: "Work up the gullies together; lone attacks on the crest fail.",
  },
  '003': {
    blurb: "Junot marched through the night of 20 August 1808 to strike the British camped around Vimiero before more of them landed. Wellesley, still in command in the field, shifted brigades north to meet the French sweep round his left. The French assaults on Vimiero hill and at Ventosa were all beaten off, and Junot retreated. No pursuit followed.",
    specialText: [
      "Vimiero: the French gain 2 temporary banners while they hold both town hexes at the start of their turn, and lose both the moment either hex is empty.",
      "The river is fordable everywhere.",
    ],
    hint: "Hold Vimiero hill and shift your line to meet the flank attack.",
  },
  '004': {
    blurb: "On 16 January 1809 Soult attacked at Corunna while Sir John Moore's army was embarking after its winter retreat from Spain. Moore posted his divisions on Monte Moro, shielding the ships. The British beat off the French columns, though Moore himself fell to a cannon ball. The army sailed within days.",
    specialText: [
      "All streams are fordable.",
    ],
    hint: "Hold the ridge and beat off Soult's columns.",
  },
  '005': {
    blurb: "In July 1809 Wellesley and the Spanish general Cuesta stood at Talavera against King Joseph's army. Victor attacked the Cerro de Medellín by night and again at dawn, and the afternoon assault of eighty French guns and infantry broke on the British line. The French withdrew to the Alberche, but the allies gained no ground by it.",
    specialText: [
      "The Portina Brook stops movement but gives no battle penalties; a unit that entered it this turn may not take ground.",
      "A British battery starts behind field works on a hill.",
    ],
    hint: "Hold the line and the hill; the French must come to you.",
  },
  '006': {
    blurb: "On 24 July 1810 Ney's 6th Corps attacked Craufurd's Light Division, which Craufurd had kept east of the Côa against Wellington's wishes, with one narrow bridge behind it. Turned on his left, Craufurd fell back to the bridge, where French attacks failed under riflemen's fire. The French then invested Almeida, which fell a month later.",
    specialText: [
      "An Anglo-Portuguese unit that leaves the board by the Côa bridge on its own baseline scores 1 permanent banner; leaders may leave but score nothing.",
      "No retreat leads off the bridge: a unit that cannot complete its retreat loses blocks instead.",
      "The river is impassable except at the bridge.",
      "The Fortress of Almeida counts as a town; an Anglo-Portuguese unit there may ignore 1 flag.",
      "Each side holds 4 cards.",
    ],
    hint: "Get the Light Division back over the bridge in good order.",
  },
  '007': {
    blurb: "On 27 September 1810 Masséna sent Reynier's II Corps up the Serra do Bussaco against the ridge's right-centre, where Wellington's men lay hidden behind the crest. In the fog Merle's columns were charged by the 88th and part of the 45th, and Foy's later climb was thrown back by Leith's reserves. In all Reynier lost over 2,000 men.",
    specialText: [
      "The stream is fordable everywhere.",
    ],
    hint: "Hold the crest from behind it, then counter-charge the columns.",
  },
  '008': {
    blurb: "Ney ordered two VI Corps divisions up the slopes near Sula on 27 September 1810, believing Reynier had already gained the heights. Craufurd's 43rd and 52nd lay concealed beyond the crest, with skirmishers out in front; as the French columns neared the top they fired a volley at close range and charged. Loison's men broke, Pack's Portuguese and the guns held Marchand, and Ney called off the attack.",
    hint: "Hold your best troops back until the columns reach the crest.",
  },
  '009': {
    blurb: "On 12 March 1811 Ney held a plateau before Redinha with Mermet's division, covering the one bridge at his back as Masséna's army retreated. Erskine's Light Division and Picton worked through the woods on either flank, and Wellington then advanced in line. Ney crossed the river in good order, though he had delayed Wellington for a day.",
    specialText: [
      "The Ancos is impassable except at the bridge.",
    ],
    hint: "Turn Ney's flanks through the woods, then break his line.",
  },
  '010': {
    blurb: "At Salamanca on 22 July 1812 Marmont thought Wellington was pulling back and let his left wing straggle along a plateau. Wellington struck instead: Pakenham's 3rd Division and D'Urban's Portuguese horse fell on Thomières' division while it was strung out in column. Thomières was killed, and the French left was soon a broken mob.",
    specialText: [
      "The Azan is impassable except at the bridge.",
    ],
    hint: "Hit the strung-out French column hard and fast.",
  },
  '011': {
    blurb: "On the allied left at Salamanca, the Light and 1st Divisions lay behind the crest facing Foy and Ferey, who held the French right. In the evening Clausel and Bonnet pushed the 4th Division back down its slope, but Clinton's 6th Division beat Bonnet's in a close musketry duel. Ferey and Foy then covered the French army's retreat.",
    specialText: [
      "The stream is fordable everywhere, and entering it does not stop movement.",
    ],
    hint: "Win the musketry duel and break the French counterstroke.",
  },
  '012': {
    blurb: "On 23 July 1812, the day after Salamanca, Wellington's cavalry caught Foy's rearguard at García Hernández. The German heavy dragoons, who had never charged before, broke a square of the 76th at the gallop and took a whole battalion. Foy marched on with the rest of his division, and the pursuit slackened.",
    specialText: [
      "Two French light infantry units start in square, so 2 French cards begin on the square track.",
      "The first French infantry unit destroyed gives the British 1 banner; each later one gives 2.",
    ],
    hint: "Ride down the infantry squares and catch Foy's rearguard.",
  },
  '013': {
    blurb: "On 2 March 1814, after Orthez, Sir Rowland Hill marched on Aire to seize Soult's magazines. Clausel held a steep ridge above the river Grave with two divisions, many of them raw conscripts. Da Costa's Portuguese were flung back, but Barnes struck along the crest into the French flank. The French were driven through the town and Aire fell.",
    specialText: [
      "Nauzeilles and the Seminary each give the Anglo-Portuguese a temporary banner while held at the start of their turn.",
      "The river is fordable; crossing at the ford does not stop movement.",
    ],
    hint: "Storm the ridge above the river and take the town of Aire.",
  },
  '014': {
    blurb: "On 16 June 1815 Ney's wing attacked the crossroads of Quatre Bras, the link between Wellington's and Blücher's armies, with Reille's corps and Kellermann's cuirassiers. The Prince of Orange's Dutch-Belgians held on until Picton's division, the Brunswickers and the Guards came up. A cuirassier charge reached the crossroads but was shot down, and by nightfall neither side had gained ground.",
    specialText: [
      "Quatre Bras gives the French a temporary banner while held at the start of their turn.",
      "The stream is fordable everywhere, and entering it does not stop movement.",
      "Allied line infantry retreats 2 hexes per flag.",
    ],
    hint: "Keep Quatre Bras out of French hands; it feeds them a banner.",
  },
  '015': {
    blurb: "On 18 June 1815 Wellington stood on the ridge south of Mont-Saint-Jean while Napoleon attacked from Hougoumont to Papelotte. D'Erlon's columns were ridden down, Ney's cavalry could not break the squares, and Bülow's Prussians struck the French right from about 4.30. The Middle Guard climbed the ridge at evening and was shattered; Napoleon's army dissolved.",
    specialText: [
      "La Haye Sainte, Hougoumont and Papelotte each give the French a temporary banner while held at the start of their turn.",
      "British cavalry is impetuous: after a successful attack it must break through and press on 1 hex towards the French.",
      "Allied line infantry retreats 2 hexes per flag.",
    ],
    hint: "Hold the ridge and the farms; let the French break on your squares.",
  },
};
