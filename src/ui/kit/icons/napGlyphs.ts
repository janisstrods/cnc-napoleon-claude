// Card glyphs drawn for this project (512x512 box, one filled path each, no external source). Cut-outs wind the other way.
export const NAP_GLYPHS = {
  /** A bicorne worn fore-and-aft: one low, wide half-moon with upturned horn tips and a rosette cockade cut into the right side. */
  bicorne:
    'M14 104Q40 240 96 288Q256 318 416 288Q472 240 498 104Q430 192 352 170Q256 128 160 170Q82 192 14 104Z' +
    'M388 214a24 24 0 1 1 0 48a24 24 0 1 1 0-48Z' +
    'M388 226a12 12 0 1 0 0 24a12 12 0 1 0 0-24Z',
  /** A drawn telescope on the slant: eyepiece, two tubes and the flared object end. */
  spyglass:
    'M66 338L144 293L172 342L94 387ZM129 281L259 206L305 285L175 360ZM244 191L365 121L431 236L310 306ZM351 109L396 83L480 228L435 254Z',
  /** A soldier's haversack: the bag with its flap seam, a buckle frame cut into the flap and the strap running off up-right. */
  breadBag:
    'M110 190H370Q392 190 392 212V420Q392 442 370 442H110Q88 442 88 420V212Q88 190 110 190Z' +
    'M88 290L88 308L256 363L392 308L392 290L256 345Z' +
    'M234 262v62h44v-62Z' +
    'M246 274h20v38h-20Z' +
    'M300 192L460 32H512L352 192Z',
} as const;

export type NapGlyph = keyof typeof NAP_GLYPHS;
