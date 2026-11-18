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
    blurb: "On 19 July 1808 Dupont's French corps of raw conscripts, with Swiss and Guard detachments, marched at night to break through at Bailén. Reding and Coupigny held the hills on either side of the road with Spanish regulars, militia and guns. Dupont's attacks failed one after another, and the Swiss changed sides or surrendered. A few days later his army laid down its arms, a shock to the French.",
    specialText: [
      "The Rumblar is fordable everywhere.",
      "Guerrilla Action: the Spanish start with no counters.",
      "Swiss infantry has 5 blocks, retreats 1 hex per flag and fires half its blocks, rounded down, after moving.",
      "Once two French Swiss units are destroyed, the other French Swiss leave the field; their removal scores no banners.",
    ],
    hint: "Hold the hills and watch the Swiss: they will not stand for long.",
  },
  '102': {
    blurb: "On 31 October 1808 Lefebvre's French IV Corps attacked Blake's Army of Galicia as it stood at Zornoza on the road from Bilbao, against King Joseph's orders according to Oman. The Spanish gave ground rather than be cut off and fell back along the road. The French won the field, but Blake got his army away to fight again.",
    specialText: [
      "A Spanish unit may leave the board from the Spanish baseline; from the fourth on, each scores 1 permanent banner. Leaders may leave but score nothing.",
      "Guerrilla Action: the Spanish start with no counters.",
      "The river is fordable everywhere.",
    ],
    hint: "Win the field, or save the army: Blake must slip away down the road.",
  },
  '103': {
    blurb: "On 10 November 1808 Soult, newly arrived to command the French 2nd Corps, found the Army of Estremadura drawn up in the open before Gamonal. Its young commander, Belvedere, had no battlefield experience and had left the defences of Burgos behind him. Lasalle's and Milhaud's cavalry rode down the Spanish line, and the army broke.",
    specialText: [
      "The Pico is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Break the untried Spanish line early; the horse will help.",
  },
  '104': {
    blurb: "After Zornoza, Blake's Army of the Left, hungry, ragged and thinned by desertion, turned to bay on 10 November 1808 before Espinosa de los Monteros. Victor's French 1st Corps, urged on by Napoleon after a rebuke, pressed the pursuit while Lefebvre swung inland to cut the retreat. The fighting ran into the next day, and the Spanish army was routed.",
    specialText: [
      "The Trueba is impassable; the Shallow Stream is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Blake's tired army must stand two days against Victor's pursuit.",
  },
  '105': {
    blurb: "On 30 November 1808 Napoleon marched on Madrid by the northern pass of the Somosierra. San Juan, with an improvised force, had put sixteen guns across the crest, with a shallow earthwork in front. The Emperor sent his troops straight up the road to carry the battery, and the Spanish defence gave way, opening the way to the capital.",
    specialText: [
      "The French win at once when all three Spanish batteries are destroyed.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Storm up the pass and silence the guns before they wear you down.",
  },
  '106': {
    blurb: "On 28 March 1809 Cuesta turned back on Victor's French 1st Corps with fresh reinforcements. Victor met him on the open plain at Medellín, between the Guadiana and the Hortiga ravine, with the town and its long bridge behind him. The Spanish infantry was caught on open ground and destroyed, while Cuesta himself escaped.",
    specialText: [
      "Each banner the French gain costs the Spanish a random card from their hand, until their hand is down to 3.",
      "Only two Spanish units may ever form square in this battle.",
      "The Guadiana and the Hortiga are impassable except at the bridge.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "On open ground the Spanish infantry will melt; strike fast.",
  },
  '107': {
    blurb: "On 23 May 1809 Suchet, who had just taken over the French III Corps in Aragon, found Blake and his Army of the Right on three hills beside Alcañiz, with the Guadalope at their back. Suchet attacked, but the Spanish held their ground. His corps fell back on Híjar, and Blake claimed the day.",
    specialText: [
      "The Guadalope is impassable except at the bridge.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Hold the three hills and let Suchet's attack wear itself out.",
  },
  '108': {
    blurb: "On 15 June 1809 Blake's army, strengthened with Valencian reinforcements, marched down the Huerba valley to threaten Zaragoza. Suchet, who had made the Abbey of Santa Fe his headquarters, learnt that Blake had divided his force and struck the main body at María. The Spaniards were driven from the field.",
    specialText: [
      "The Abbey of Santa Fe counts as a town.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Strike Blake's main body while the rest of his army is far off.",
  },
  '109': {
    blurb: "At Talavera on 28 July 1809, while Wellesley fought on the Cerro de Medellín, Cuesta's Army of Estremadura held the town and the enclosed ground north of it as far as the Pajar de Vergara. There it joined Campbell's British 4th Division. A night panic had already thinned the Spanish ranks. Leval's French division attacked the line and was shattered.",
    specialText: [
      "The Portina Brook stops movement but gives no battle penalties; a unit that entered it this turn may not take ground.",
      "Spanish and British units share one hand of cards.",
      "Guerrilla Action: the Anglo-Spanish start with 1 counter.",
    ],
    hint: "Spaniards and British share one hand; hold the line between them.",
  },
  '110': {
    blurb: "On 17 October 1809 Marchand marched his French 6th Corps out of Salamanca and found Del Parque's Galician divisions drawn up on the heights above Tamames. The Spanish held the ground and repulsed the attack. It was one of the rare Spanish field victories of the war, though little came of it.",
    specialText: [
      "The stream is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Stand on the heights and beat off Marchand's attack.",
  },
  '111': {
    blurb: "On 18 November 1809 the French horse crossed the Tagus at Aranjuez to cut off Areizaga's retreating column. Milhaud's dragoons and Paris's light cavalry met Freire's Spanish cavalry at the head of the column, on the road to Ocaña. The Spanish horse was routed, and the army behind it was left without its cavalry screen.",
    specialText: [
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "A cavalry duel on the road: ride down Freire's horse.",
  },
  '112': {
    blurb: "On 19 November 1809 Areizaga offered battle on the open plateau at Ocaña, his trains far behind and his men too tired to march on. Soult and King Joseph, outnumbered in infantry, chose to attack at once rather than wait for Victor. The Spanish army was destroyed, and the road to Andalusia lay open.",
    specialText: [
      "Guerrilla Action: the Spanish start with no counters.",
    ],
    hint: "Crush Areizaga on the plateau before his army can slip away.",
  },
  '113': {
    blurb: "On 28 November 1809 Del Parque, retreating after the disaster at Ocaña, fell back towards the hills by way of Alba de Tormes. Kellermann, commanding in Old Castile, pursued with the cavalry, with Marchand's infantry and guns coming up behind. The French caught the Army of the Left at the bridge, and it was scattered.",
    specialText: [
      "The bridge gives the French a temporary banner while held at the start of their turn.",
      "The Tormes cannot be forded.",
      "Guerrilla Action: the Spanish start with no counters.",
    ],
    hint: "Catch the retreating Spaniards and take the bridge.",
  },
  '114': {
    blurb: "On 5 March 1811 the Allied army landed at Tarifa and marched to relieve Cadiz, reaching the coast near the Cerro del Puerco after night marches through flooded country. La Peña commanded the combined force, with Graham in second place. Victor's French 1st Corps attacked the British division on the ridge, and the British won the field, though the siege went on.",
    specialText: [
      "Barrosa Ridge: the side holding more of its 11 hexes at the start of its turn gains a temporary banner, lost the moment it no longer holds more; the Anglo-Spanish start with it.",
      "The river cannot be forded.",
      "No Guerrilla Action in this battle.",
    ],
    hint: "Win the ridge, and keep more of it than Victor does.",
  },
  '115': {
    blurb: "On 16 May 1811 Beresford drew up his Anglo-Portuguese and Spanish army on the low ridge above the Albuera brook, across the Badajoz road. Soult hid most of his army behind the woods and struck the Allied right. The fighting was bloody and close, but Soult drew off, leaving Beresford with a costly victory.",
    specialText: [
      "Albuera gives the French a temporary banner while a French unit holds either of its hexes from the start of their turn.",
      "The river is fordable everywhere; crossing at a ford does not stop movement.",
      "Stewart's Folly: on a French Cavalry Charge turn not cancelled by a counter, the Allies may not form square or play First Strike.",
      "Guerrilla Action: the Allies start with no counters.",
    ],
    hint: "Hold the ridge and guard the right from Soult's cavalry.",
  },
  '116': {
    blurb: "On 21 June 1813 King Joseph's three French armies stood in the basin of Vitoria with the winding Zadorra across their front. Wellington sent four columns converging on the river and the road to France, with Hill and Graham on the flanks, and turned the French position. The French lost nearly all their guns in the rout.",
    specialText: [
      "Before the battle each side picks the card it will open with; the card ordering fewer units moves first, the Allies on a tie.",
      "The Zadorra cannot be forded.",
      "No Guerrilla Action in this battle.",
    ],
    hint: "Pick your opening card well: moving first wins the bridges.",
  },
  '117': {
    blurb: "On 31 August 1813 Soult tried once more to save the garrison of San Sebastián. Reille's divisions were to storm the San Marcial heights, held by Freire's Army of Galicia above the fords of the lower Bidassoa, while Clausel crossed higher up. A storm of rain broke over the field, and the Spanish held the heights.",
    specialText: [
      "Each of the three hill groups gives a temporary banner to the side holding more of its hexes at the start of its turn; the Spanish start with all three.",
      "The Bidassoa is fordable.",
      "Guerrilla Action: the Spanish start with 1 counter.",
    ],
    hint: "Keep the heights and throw Soult back into the river.",
  },
  '118': {
    blurb: "On the night of 12 September 1813 Suchet resolved to retake the Ordal pass by surprise, while Decaen marched by another valley to turn the flank. Colonel Adam's advanced guard, sent ten miles forward by Bentinck, held the pass with a Spanish brigade that had joined it that evening. The French struck in the dark and routed it.",
    specialText: [
      "The river cannot be forded.",
      "Guerrilla Action: the Anglo-Spanish start with 1 counter.",
    ],
    hint: "Hold the pass in the dark against Suchet's surprise attack.",
  },
};
