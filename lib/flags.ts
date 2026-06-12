// Maps football-data.org 3-letter codes → ISO 3166-1 alpha-2 for flagcdn.com
const FIFA_TO_ISO: Record<string, string> = {
  // South America
  ARG: "ar", BRA: "br", COL: "co", URU: "uy", ECU: "ec",
  CHI: "cl", PAR: "py", BOL: "bo", PER: "pe", VEN: "ve",
  // North/Central America & Caribbean
  USA: "us", MEX: "mx", CAN: "ca", PAN: "pa", HON: "hn",
  JAM: "jm", CRC: "cr", GTM: "gt", TRI: "tt", CUB: "cu",
  SLV: "sv", NCA: "ni",
  // Europe
  ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de", POR: "pt",
  NED: "nl", BEL: "be", CRO: "hr", SUI: "ch", AUT: "at",
  TUR: "tr", SCO: "gb-sct", DEN: "dk", POL: "pl", SRB: "rs",
  ALB: "al", SVK: "sk", SVN: "si", HUN: "hu", CZE: "cz",
  ROU: "ro", UKR: "ua", GRE: "gr", NOR: "no", ISL: "is",
  WAL: "gb-wls", IRL: "ie", FIN: "fi", ITA: "it",
  GEO: "ge", MKD: "mk", MNE: "me", BIH: "ba", LUX: "lu",
  // Africa
  MAR: "ma", SEN: "sn", EGY: "eg", NGA: "ng", CMR: "cm",
  MLI: "ml", ALG: "dz", TUN: "tn", GHA: "gh", CIV: "ci",
  COM: "km", BEN: "bj", TAN: "tz", GAB: "ga", ZAM: "zm",
  CPV: "cv", GUI: "gn", MOZ: "mz", ZIM: "zw",
  // Asia
  JPN: "jp", KOR: "kr", AUS: "au", IRN: "ir", SAU: "sa",
  QAT: "qa", IDN: "id", UZB: "uz", IRQ: "iq", JOR: "jo",
  UAE: "ae", OMN: "om", BHR: "bh", KUW: "kw", CHN: "cn",
  TJK: "tj",
  // Oceania
  NZL: "nz",
};

// Fallback by common alternate names football-data.org might use
const NAME_TO_ISO: Record<string, string> = {
  "United States": "us",
  "Korea Republic": "kr", "South Korea": "kr",
  "Ivory Coast": "ci", "Côte d'Ivoire": "ci",
  "Trinidad & Tobago": "tt", "Trinidad and Tobago": "tt",
  "Bosnia and Herzegovina": "ba",
  "North Macedonia": "mk",
  "Czech Republic": "cz", "Czechia": "cz",
  "DR Congo": "cd", "Congo DR": "cd",
  "New Zealand": "nz",
};

export function flagUrl(code: string | null | undefined, name?: string | null): string | null {
  const iso =
    (code ? FIFA_TO_ISO[code.toUpperCase()] : undefined) ??
    (name ? NAME_TO_ISO[name] : undefined) ??
    null;
  return iso ? `https://flagcdn.com/w20/${iso}.png` : null;
}
