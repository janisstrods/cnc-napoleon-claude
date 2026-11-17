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
    hint: "Swing the wings wide and pin Delaborde before he slips away.",
  },
  '002': {
    blurb: "Having missed Delaborde at Roliça that morning, Wellesley followed him to the steep, ravine-cut heights above Columbeira. The British sent Trant and Ferguson on long flank marches while the centre deployed, but the 29th went up a ravine too early and lost its colonel. After about two hours the crest was won and Delaborde retired in good order.",
    hint: "Win the ridge before the flank columns arrive, or lose men trying.",
  },
  '003': {
    blurb: "Junot marched through the night of 20 August 1808 to strike the British camped around Vimeiro before more of them landed. Wellesley, still in command in the field, shifted brigades north to meet the French sweep round his left. The French assaults on Vimeiro hill and at Ventosa were all beaten off, and Junot retreated. No pursuit followed.",
    specialText: [
      "Vimiero: the French gain 2 temporary banners while they hold both town hexes at the start of their turn, and lose both the moment either hex is empty.",
      "The river is fordable everywhere.",
    ],
    hint: "Hold Vimeiro hill and shift your line to meet the flank attack.",
  },
  '004': {
    blurb: "Soult attacked on 16 January 1809 while Sir John Moore's army, in its last days at Corunna, waited for its transports to carry it home. Moore held the ridge of Monte Moro with his divisions, and the British beat off Soult's attacks. Moore himself was struck down by a cannon ball, but the army embarked and sailed.",
    specialText: [
      "All streams are fordable.",
    ],
    hint: "Hold the ridge until dark so the army can embark.",
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
    blurb: "On 24 July 1810 Ney's 6th Corps attacked Craufurd's Light Division, left east of the Côa near Almeida with one narrow bridge behind it, against Wellington's wishes. Turned on his left, Craufurd fell back to the bridge, where French attacks failed under riflemen's fire. The French then invested Almeida, which fell a month later.",
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
    blurb: "On 27 September 1810 Masséna opened his attack on the Serra do Bussaco with Reynier's II Corps against the ridge's right-centre. Wellington had hidden his men behind the crest, and fog covered the French climb. the 88th and part of the 45th charged Merle's columns, and Foy's later climb was thrown back by Leith's reserves, so Reynier lost over 2,000 men.",
    specialText: [
      "The stream is fordable everywhere.",
    ],
    hint: "Hold the crest from behind it, then counter-charge the columns.",
  },
  '008': {
    blurb: "Ney, thinking Reynier had reached the crest, sent two divisions of VI Corps up the Coimbra road and against the spur above Sula on 27 September 1810. The Light Division, held out of sight behind the crest, rose, fired at close range and charged, while Pack's Portuguese and the guns stopped Marchand. Ney broke off after about an hour.",
    hint: "Keep the Light Division hidden until the columns near the top.",
  },
  '009': {
    blurb: "On 12 March 1811 Ney made a stand with Mermet's division on the plateau before Redinha, covering the single bridge behind him while Masséna's army fell back. Erskine's Light Division and Picton cleared the woods on his flanks, and Wellington advanced in line. Ney withdrew over the bridge in good order, having cost Wellington a day.",
    specialText: [
      "The Ancos is impassable except at the bridge.",
    ],
    hint: "Push Ney off the plateau before he can cross the bridge.",
  },
  '010': {
    blurb: "At Salamanca on 22 July 1812 Marmont stretched his left wing west along a plateau, believing Wellington was about to retire. Wellington struck instead: Pakenham's 3rd Division and D'Urban's Portuguese horse caught Thomières' division strung out in column. Thomières fell, and within the hour the French left was a broken mob.",
    specialText: [
      "The Azan is impassable except at the bridge.",
    ],
    hint: "Strike the strung-out French column before it can deploy.",
  },
  '011': {
    blurb: "On the allied left at Salamanca, Foy and Ferey held the French right while Wellington's Light and 1st Divisions waited behind the crest. In the evening Clausel and Bonnet drove the 4th Division back, but Clinton's 6th Division beat Bonnet's in a close musketry duel. Ferey and Foy then covered the French army's escape into the night.",
    specialText: [
      "The stream is fordable everywhere, and entering it does not stop movement.",
    ],
    hint: "Break the French counterstroke before night lets the army escape.",
  },
  '012': {
    blurb: "On 23 July 1812, the day after Salamanca, Wellington's cavalry caught Foy's rearguard at García Hernández. The German heavy dragoons, who had never charged before, broke a square of the 76th at the gallop and took a whole battalion. Foy marched on with the rest of his division, and the pursuit slackened.",
    specialText: [
      "Two French light infantry units start in square, so 2 French cards begin on the square track.",
      "The first French infantry unit destroyed gives the British 1 banner; each later one gives 2.",
    ],
    hint: "Ride down the infantry squares before the French march off.",
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
    blurb: "On 16 June 1815 Ney attacked the crossroads of Quatre Bras, which linked Wellington and Blücher, with Reille's corps and Kellermann's cuirassiers. The Prince of Orange's Dutch-Belgians held until Picton, the Brunswickers and the Guards arrived. A cuirassier charge reached the crossroads but was shot down, and by nightfall both armies stood where they had begun.",
    specialText: [
      "Quatre Bras gives the French a temporary banner while held at the start of their turn.",
      "The stream is fordable everywhere, and entering it does not stop movement.",
      "Allied line infantry retreats 2 hexes per flag.",
    ],
    hint: "Seize Quatre Bras before the Allied reinforcements arrive.",
  },
  '015': {
    blurb: "On 18 June 1815 Wellington stood on the ridge south of Mont-Saint-Jean while Napoleon attacked from Hougoumont to Papelotte. D'Erlon's columns were ridden down, Ney's cavalry could not break the squares, and Bülow's Prussians struck the French right from about 4.30. The Middle Guard climbed the ridge at evening and was shattered; Napoleon's army dissolved.",
    specialText: [
      "La Haye Sainte, Hougoumont and Papelotte each give the French a temporary banner while held at the start of their turn.",
      "British cavalry is impetuous: after a successful attack it must break through and press on 1 hex towards the French.",
      "Allied line infantry retreats 2 hexes per flag.",
    ],
    hint: "Hold the ridge until the Prussians arrive.",
  },
};
