// Shared constants for WURM Online

export const WURM_SERVERS = [
  "Xanadu",
  "Deliverance",
  "Exodus",
  "Celebration",
  "Pristine",
  "Release",
  "Independence",
  "Chaos",
  "Harmony",
  "Melody",
  "Cadence",
  "Defiance",
] as const;

export type WurmServer = (typeof WURM_SERVERS)[number];

export const WURM_RELIGIONS = ["Fo", "Vynora", "Magranon", "Libila", "None"] as const;
export type WurmReligion = (typeof WURM_RELIGIONS)[number];

export const PLAYSTYLES = ["pve", "pvp", "both", "casual", "hardcore"] as const;
export type Playstyle = (typeof PLAYSTYLES)[number];
