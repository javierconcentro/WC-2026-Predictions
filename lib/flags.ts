const CODE_TO_FLAG: Record<string, string> = {
  // CONMEBOL
  ARG: "🇦🇷", BRA: "🇧🇷", COL: "🇨🇴", URU: "🇺🇾", ECU: "🇪🇨",
  CHI: "🇨🇱", PAR: "🇵🇾", BOL: "🇧🇴", PER: "🇵🇪", VEN: "🇻🇪",
  // CONCACAF
  USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", PAN: "🇵🇦", HON: "🇭🇳",
  JAM: "🇯🇲", CRC: "🇨🇷", GTM: "🇬🇹", TRI: "🇹🇹", CUB: "🇨🇺",
  SLV: "🇸🇻", NCA: "🇳🇮",
  // UEFA
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ESP: "🇪🇸", FRA: "🇫🇷", GER: "🇩🇪", POR: "🇵🇹",
  NED: "🇳🇱", BEL: "🇧🇪", CRO: "🇭🇷", SUI: "🇨🇭", AUT: "🇦🇹",
  TUR: "🇹🇷", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", DEN: "🇩🇰", POL: "🇵🇱", SRB: "🇷🇸",
  ALB: "🇦🇱", SVK: "🇸🇰", SVN: "🇸🇮", HUN: "🇭🇺", CZE: "🇨🇿",
  ROU: "🇷🇴", UKR: "🇺🇦", GRE: "🇬🇷", NOR: "🇳🇴", ISL: "🇮🇸",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", IRL: "🇮🇪", FIN: "🇫🇮", BUL: "🇧🇬", ITA: "🇮🇹",
  GEO: "🇬🇪", MKD: "🇲🇰", MNE: "🇲🇪", BIH: "🇧🇦", LUX: "🇱🇺",
  // CAF
  MAR: "🇲🇦", SEN: "🇸🇳", EGY: "🇪🇬", NGA: "🇳🇬", CMR: "🇨🇲",
  MLI: "🇲🇱", ALG: "🇩🇿", TUN: "🇹🇳", GHA: "🇬🇭", CIV: "🇨🇮",
  COM: "🇰🇲", GAB: "🇬🇦", BEN: "🇧🇯", TAN: "🇹🇿", ZAM: "🇿🇲",
  CPV: "🇨🇻", GUI: "🇬🇳", MOZ: "🇲🇿", ZIM: "🇿🇼", SUD: "🇸🇩",
  // AFC
  JPN: "🇯🇵", KOR: "🇰🇷", AUS: "🇦🇺", IRN: "🇮🇷", SAU: "🇸🇦",
  QAT: "🇶🇦", IDN: "🇮🇩", UZB: "🇺🇿", IRQ: "🇮🇶", JOR: "🇯🇴",
  UAE: "🇦🇪", OMN: "🇴🇲", BHR: "🇧🇭", KUW: "🇰🇼", CHN: "🇨🇳",
  TJK: "🇹🇯", SYR: "🇸🇾", PAL: "🇵🇸", YEM: "🇾🇪", LBN: "🇱🇧",
  // OFC
  NZL: "🇳🇿",
};

export function teamFlag(code: string | null | undefined): string {
  if (!code) return "";
  return CODE_TO_FLAG[code.toUpperCase()] ?? "";
}
