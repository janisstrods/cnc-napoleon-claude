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
    blurb: "On 16 January 1809 Soult attacked at Corunna while Sir John Moore's army was embarking after its winter retreat across Galicia. Moore posted his divisions on Monte Moro, shielding the ships. The British beat off the French columns, though Moore himself fell to a cannon ball. The army sailed within days.",
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
    blurb: "On 24 July 1810 Ney's 6th Corps attacked Craufurd's Light Division, which Craufurd had kept east of the Côa against Wellington's wishes, with one narrow bridge behind it. Turned on his left, Craufurd fell back to the bridge, where French attacks failed under riflemen's fire. The French then invested the nearby fortress of Almeida, which fell a month later.",
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
    blurb: "Ney ordered two VI Corps divisions up the slopes near Sula on 27 September 1810, believing Reynier had already gained the heights. Craufurd's 43rd and 52nd lay concealed beyond the crest, with skirmishers out in front; as the French columns neared the top the hidden regiments fired a volley at close range and charged. Loison's men broke, Pack's Portuguese and the guns held Marchand, and Ney called off the attack.",
    hint: "Hold your best troops back until the columns reach the crest.",
  },
  '009': {
    blurb: "On 12 March 1811 Ney held a plateau before Redinha with Mermet's division, covering the one bridge at his back as Masséna's army retreated. Erskine's Light Division and Picton worked through the woods on either flank, and Wellington then advanced in line. Ney crossed the river in good order, having delayed Wellington for a day.",
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
  '101': {
    blurb: "Dupont's French corps, mostly raw conscripts with Swiss and Guard detachments, set out in the night of 18 July 1808 to force the road through Bailén. Reding and Coupigny barred it from the hills with regulars, militia and guns. Attack after attack failed, and the Swiss went over or gave up. Within days the whole French army had surrendered.",
    specialText: [
      "The Rumblar is fordable everywhere.",
      "Guerrilla Action: the Spanish start with no counters.",
      "Swiss infantry has 5 blocks, retreats 1 hex per flag and fires half its blocks, rounded down, after moving.",
      "Once two French Swiss units are destroyed, the other French Swiss leave the field; their removal scores no banners.",
    ],
    hint: "Hold the hills and watch the Swiss: they will not stand for long.",
  },
  '102': {
    blurb: "Blake's Army of Galicia had advanced from Bilbao and halted at Zornoza. On 31 October Lefebvre's IV Corps fell upon it, against King Joseph's wishes. The Spanish gave way along the road rather than risk encirclement. The field went to the French, yet Blake kept his army in being.",
    specialText: [
      "A Spanish unit may leave the board from the Spanish baseline; from the fourth on, each scores 1 permanent banner. Leaders may leave but score nothing.",
      "Guerrilla Action: the Spanish start with no counters.",
      "The river is fordable everywhere.",
    ],
    hint: "Win the field, or save the army: Blake must slip away down the road.",
  },
  '103': {
    blurb: "Soult took over the French 2nd Corps on 9 November 1808 and next day met the Army of Estremadura in the open outside Gamonal. Its young general, Belveder, had never commanded in battle and had abandoned the defences of Burgos. Lasalle's and Milhaud's horsemen swept over the Spanish line, which fell apart.",
    specialText: [
      "The Pico is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Break the untried Spanish line early; the horse will help.",
  },
  '104': {
    blurb: "Blake's Army of the Left, starving, in rags and depleted by desertion, made a stand at Espinosa de los Monteros on 10 November 1808. Victor's 1st Corps, spurred by an imperial reproach, chased it hard, and Lefebvre marched inland to block its escape. The fighting lasted into the second day and ended with the Spanish routed.",
    specialText: [
      "The Trueba is impassable; the Shallow Stream is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Blake's army is spent; make Victor pay for every hex.",
  },
  '105': {
    blurb: "Napoleon took the northern road to Madrid on 30 November 1808, over the Somosierra pass. San Juan, with a hastily gathered force, had lined the crest with sixteen guns behind a low earthwork. The French drove straight up the road at the battery, and the defence collapsed, leaving the capital exposed.",
    specialText: [
      "The French win at once when all three Spanish batteries are destroyed.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Storm up the pass and silence the guns before they wear you down.",
  },
  '106': {
    blurb: "Cuesta, newly reinforced, turned on Victor's 1st Corps and on 28 March 1809 attacked it at Medellín, a plain bounded by the Guadiana and a ravine, with a long bridge at the town. Cavalry charges broke the Spanish horse and exposed the infantry, which was cut to pieces. Cuesta himself got away.",
    specialText: [
      "Each banner the French gain costs the Spanish a random card from their hand, until their hand is down to 3.",
      "Only two Spanish units may ever form square in this battle.",
      "The Guadiana and the Hortiga are impassable except at the bridge.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "On open ground the Spanish infantry will melt; strike fast.",
  },
  '107': {
    blurb: "Suchet had barely taken charge of the French III Corps in Aragon when, on 23 May 1809, he came upon Blake's Army of the Right holding three hills by Alcañiz with the Guadalope behind. His attack did not dislodge the Spanish. The French retired on Híjar, and Blake could claim a win.",
    specialText: [
      "The Guadalope is impassable except at the bridge.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Hold the three hills and let Suchet's attack wear itself out.",
  },
  '108': {
    blurb: "Blake marched his army, swollen by Valencian troops, down the Huerba valley in June 1809 to threaten Suchet's communications with Zaragoza. Suchet set up at the Abbey of Santa Fe and, learning that Areizaga's division stood apart on the far bank at Botorrita, struck the main body at María on 15 June and drove it away.",
    specialText: [
      "The Abbey of Santa Fe counts as a town.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Strike Blake's main body while Areizaga is across the river.",
  },
  '109': {
    blurb: "At Talavera on 28 July 1809 Cuesta's Spaniards held the town and the enclosed groves to its north, joining Campbell's British 4th Division near the Pajar de Vergara, while Wellesley fought on the Cerro de Medellín. Leval's German division (Baden, Nassau, Hessian and Dutch troops) attacked the Pajar twice and was broken by canister, Campbell's charge and Spanish cavalry.",
    specialText: [
      "The Portina Brook stops movement but gives no battle penalties; a unit that entered it this turn may not take ground.",
      "Spanish and British units share one hand of cards.",
      "Guerrilla Action: the Anglo-Spanish start with 1 counter.",
    ],
    hint: "Spaniards and British share one hand; hold the line between them.",
  },
  '110': {
    blurb: "Marchand brought the French 6th Corps out of Salamanca and on 18 October 1809 found Del Parque's Galician divisions posted on the heights over Tamames. The Spaniards stood firm and beat the attack back. It was a rare Spanish success in the open field, although it led to little.",
    specialText: [
      "The stream is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Stand on the heights and beat off Marchand's attack.",
  },
  '111': {
    blurb: "Areizaga's column was retreating towards Ocaña, and on 18 November 1809 French cavalry crossed the Tagus at Aranjuez to intercept it. Milhaud's dragoons and Paris's light horse found Freire's Spanish cavalry heading the column. In a hard clash the Spanish horsemen were broken and fled, and they were shaken for the next day's battle.",
    specialText: [
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "A cavalry duel on the road: ride down Freire's horse.",
  },
  '112': {
    blurb: "Areizaga's Spaniards stood on the open plateau of Ocaña on 19 November 1809, tired and without their baggage trains. Soult and King Joseph had fewer infantry, but attacked straight away instead of waiting for Victor, afraid the enemy would escape. The Army of La Mancha was wrecked, and Andalusia was open to the French.",
    specialText: [
      "Guerrilla Action: the Spanish start with no counters.",
    ],
    hint: "Crush Areizaga on the plateau before his army can slip away.",
  },
  '113': {
    blurb: "Del Parque was falling back through Alba de Tormes on 28 November 1809, after learning of the defeat at Ocaña. Kellermann, in command in Old Castile, chased him with cavalry while Marchand's infantry and guns trailed behind. The Army of the Left was overtaken near the bridge and dispersed.",
    specialText: [
      "The bridge gives the French a temporary banner while held at the start of their turn.",
      "The Tormes cannot be forded.",
      "Guerrilla Action: the Spanish start with no counters.",
    ],
    hint: "Catch the retreating Spaniards and take the bridge.",
  },
  '114': {
    blurb: "Marching at night over flooded ground to relieve Cadiz, the Anglo-Spanish force came out on the coast by the Cerro del Puerco on 5 March 1811, La Peña commanding and Graham his deputy. Once Graham was told to leave the ridge, Victor attacked it. The British wheeled about and stormed it back, yet Cadiz stayed besieged.",
    specialText: [
      "Barrosa Ridge: the side holding more of its 11 hexes at the start of its turn gains a temporary banner, lost the moment it no longer holds more; the Anglo-Spanish start with it.",
      "The river cannot be forded.",
      "No Guerrilla Action in this battle.",
    ],
    hint: "Win the ridge, and keep more of it than Victor does.",
  },
  '115': {
    blurb: "Beresford, besieging Badajoz with Anglo-Portuguese troops, broke off in May 1811 to meet Soult's relief army. On 16 May he held the ridge above the Albuera stream, with Blake's Spaniards on his right. Soult feinted at the village, then sent his main force round the right from behind the woods. After a savage struggle Soult withdrew, and Beresford had a bloody win.",
    specialText: [
      "Albuera gives the French a temporary banner while a French unit holds either of its hexes from the start of their turn.",
      "The river is fordable everywhere; crossing at a ford does not stop movement.",
      "Stewart's Folly: on a French Cavalry Charge turn not cancelled by a counter, the Allies may not form square or play First Strike.",
      "Guerrilla Action: the Allies start with no counters.",
    ],
    hint: "Hold the ridge and guard the right from Soult's cavalry.",
  },
  '116': {
    blurb: "King Joseph's three French armies had halted in the Vitoria basin on 21 June 1813, the twisting Zadorra before them. Wellington came on in four columns aimed at the river crossings and the road to France, Hill and Graham on the outer wings. The French position was turned and the army fled, abandoning almost its whole artillery.",
    specialText: [
      "Before the battle each side picks the card it will open with; the card ordering fewer units moves first, the Allies on a tie.",
      "The Zadorra cannot be forded.",
      "No Guerrilla Action in this battle.",
    ],
    hint: "Choose your opening card with care; moving first matters.",
  },
  '117': {
    blurb: "Soult made a fresh effort on 31 August 1813 to relieve San Sebastián. Reille was to assault the heights of San Marcial, which Freire's Galician army held above the lower Bidassoa fords, as Clausel crossed upstream. Rain fell heavily in the afternoon. The Spanish kept the heights and the relief failed.",
    specialText: [
      "Each of the three hill groups gives a temporary banner to the side holding more of its hexes at the start of its turn; the Spanish start with all three.",
      "The Bidassoa is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Keep the heights and throw Soult back into the river.",
  },
  '118': {
    blurb: "Suchet planned a surprise attack by night on the Ordal pass, while Decaen came by another valley to outflank it. The pass was held by Colonel Adam's advanced guard, pushed forward by Bentinck on 12 September 1813 and joined that evening by a Spanish brigade. The French fell on it in the dark and drove it off in rout.",
    specialText: [
      "The river cannot be forded.",
      "Guerrilla Action: the Anglo-Spanish start with 1 counter.",
    ],
    hint: "Hold the pass in the dark against Suchet's surprise attack.",
  },
};
