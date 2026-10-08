// Copied from the Stockpile design system (light theme).
export const tokens = {
  color: {
    cream: '#fbf6e9', paper: '#fffdf7', sunken: '#f3ecd9',
    ink: '#17151f', inkMuted: '#55506a', lineSoft: '#ddd4bd',
    lavender: '#d9ccff', lavenderSoft: '#efe9ff',
    butter: '#ffe066', butterSoft: '#fff4c2',
    mint: '#b8f0d0', mintSoft: '#e3f8ec',
    sky: '#bfe0ff', pink: '#ffc2d6', pinkSoft: '#ffe6ee',
    onPastel: '#17151f', success: '#1d6b43', danger: '#b0154a', info: '#2455a4',
    focus: '#2f5bea', overlay: 'rgba(23, 21, 31, 0.55)',
  },
  space: { 4: 4, 8: 8, 12: 12, 16: 16, 24: 24, 32: 32, 48: 48, 64: 64 },
  radius: { none: 0, sm: 2, md: 4, lg: 6 },
  border: { 1: 1, 2: 2, 3: 3 },
  shadow: { sm: 3, md: 4, lg: 6 }, // hard offsets in px, colour = ink
  font: {
    pixel: 'Press Start 2P', mono: 'IBM Plex Mono', sans: 'DM Sans',
  },
} as const;
