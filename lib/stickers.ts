/*
  STICKER COLOURS — the real-object colours of the drawn stickers (the pencil
  on the Profile's edit button), kept as DATA per rule 1. The pencil's painted
  body is NOT here: it is the school colour, var(--primary), so it re-skins
  with the university.
*/
export const pencilColors = {
  outline: "#ffffff", // the white die-cut edge that makes it a sticker
  wood: "#f1c27d",
  woodShade: "#d9a35b",
  graphite: "#2b2b2e",
  ferrule: "#c9ccd1",
  ferruleShade: "#9097a1",
  eraser: "#f29bab",
  eraserShade: "#d97b8e",
  shine: "rgba(255,255,255,0.35)",
  shade: "rgba(0,0,0,0.22)",
  dropShadow: "rgba(0,0,0,0.28)", // lifts the sticker off the page
};
