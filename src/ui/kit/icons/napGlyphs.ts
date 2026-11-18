// Card glyphs drawn for this project (512x512 box, one filled path each, no external source). Cut-outs wind the other way.
export const NAP_GLYPHS = {
  /** A bicorne hat seen from the front: the crown, the turned-up brim and a cockade cut out of the crown. */
  bicorne:
    'M40 330C90 190 170 130 256 130C342 130 422 190 472 330C420 300 340 285 256 285C172 285 92 300 40 330Z' +
    'M40 330C100 380 180 400 256 400C332 400 412 380 472 330C420 345 340 360 256 360C172 360 92 345 40 330Z' +
    'M256 192a28 28 0 1 0 0 56a28 28 0 1 0 0-56Z',
  /** A drawn telescope on the slant: eyepiece, two tubes and the flared object end. */
  spyglass:
    'M66 338L144 293L172 342L94 387ZM129 281L259 206L305 285L175 360ZM244 191L365 121L431 236L310 306ZM351 109L396 83L480 228L435 254Z',
  /** A haversack: the bag, its flap cut out as a wedge, and the strap looped over it. */
  breadBag:
    'M120 200H392Q412 200 416 220L440 400Q442 430 412 430H100Q70 430 72 400L96 220Q100 200 120 200Z' +
    'M118 240L256 340L394 240Z' +
    'M150 200C150 90 362 90 362 200H330C330 130 182 130 182 200Z',
} as const;

export type NapGlyph = keyof typeof NAP_GLYPHS;
