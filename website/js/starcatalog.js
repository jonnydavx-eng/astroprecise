'use strict';

// =============================================================================
// Astro Precise Star Catalog
// Real-star catalog powering the "light-cone" view (which stars your birth
// light has reached) and the "zenith star" lookup (nearest catalog star to a
// given RA/Dec).
//
// Sources: RECONS / Gaia nearest-star lists, Hipparcos/Gaia parallaxes,
// SIMBAD coordinates (J2000). Coordinates good to ~0.1 deg; distances to a
// few percent (supergiant distances such as Betelgeuse or Deneb carry
// intrinsically large uncertainties and use commonly cited modern values).
//
// Entry shape:
//   { name, bayer, con, ra (deg J2000), dec (deg), ly, spectral, mag, fact }
// =============================================================================

(function (global) {

  // Rows: [name, bayer, con, raDeg, decDeg, ly, spectral, Vmag, fact]
  const ROWS = [
    // -------------------------------------------------------------------
    // The solar neighborhood: systems within ~17 light-years.
    // These are the milestones a human light-cone crosses in a lifetime.
    // -------------------------------------------------------------------
    ["Proxima Centauri", "α Cen C", "Cen", 217.43, -62.68, 4.2, "M5.5Ve", 11.1, "Closest star to the Sun; hosts the temperate Earth-sized planet Proxima b"],
    ["Alpha Centauri", "α Cen", "Cen", 219.90, -60.83, 4.4, "G2V+K1V", -0.3, "Nearest star system bright to the eye — twin Sun-like stars orbiting every 80 years"],
    ["Barnard's Star", null, "Oph", 269.45, 4.69, 6.0, "M4V", 9.5, "Fastest proper motion of any star — it crosses a Moon-width every ~180 years"],
    ["Luhman 16", null, "Vel", 162.33, -53.32, 6.5, "L7.5+T0.5", 16.2, "Closest brown-dwarf pair to the Sun, discovered only in 2013"],
    ["WISE 0855-0714", null, "Hya", 133.80, -7.25, 7.4, "Y2", 25.0, "Coldest known brown dwarf — about the temperature of Earth's poles; invisible to optical telescopes"],
    ["Wolf 359", "CN Leo", "Leo", 164.12, 7.01, 7.9, "M6V", 13.5, "Tiny flare star, famous as a battle site in Star Trek lore"],
    ["Lalande 21185", null, "UMa", 165.83, 35.97, 8.3, "M2V", 7.5, "Brightest red dwarf of northern skies; hosts at least two planets"],
    ["Sirius", "α CMa", "CMa", 101.29, -16.72, 8.6, "A1V", -1.5, "Brightest star in Earth's night sky; orbited by the white dwarf Sirius B"],
    ["Luyten 726-8", null, "Cet", 24.76, -17.95, 8.7, "M5.5V+M6V", 12.6, "Binary red dwarf; component UV Ceti defined the 'flare star' class"],
    ["Ross 154", "V1216 Sgr", "Sgr", 282.46, -23.84, 9.7, "M3.5V", 10.4, "Flare star and the nearest star in Sagittarius"],
    ["Ross 248", "HH And", "And", 355.48, 44.18, 10.3, "M5.5V", 12.3, "Voyager 2 will drift within ~1.7 light-years of it in about 40,000 years"],
    ["Epsilon Eridani", "ε Eri", "Eri", 53.23, -9.46, 10.5, "K2V", 3.7, "Young Sun-like star with a dusty debris disk and a Jupiter-class planet"],
    ["Lacaille 9352", null, "PsA", 346.47, -35.85, 10.7, "M0.5V", 7.3, "Brightest red dwarf of far-southern skies; hosts super-Earth planets"],
    ["Ross 128", "FI Vir", "Vir", 176.93, 0.80, 11.0, "M4V", 11.1, "Unusually quiet red dwarf hosting the temperate planet Ross 128 b"],
    ["EZ Aquarii", null, "Aqr", 339.64, -15.29, 11.1, "M5V", 12.9, "Triple system of dim red dwarfs locked in tight orbits"],
    ["61 Cygni", "61 Cyg", "Cyg", 316.73, 38.75, 11.4, "K5V+K7V", 5.2, "First star ever to have its distance measured, by Bessel's parallax of 1838"],
    ["Procyon", "α CMi", "CMi", 114.83, 5.22, 11.5, "F5IV-V", 0.3, "Eighth-brightest star in the sky; circled by a faint white dwarf"],
    ["Struve 2398", null, "Dra", 280.70, 59.62, 11.5, "M3V+M3.5V", 9.0, "Binary pair of red dwarfs, both prone to flares"],
    ["Groombridge 34", null, "And", 4.60, 44.02, 11.6, "M1.5V+M3.5V", 8.1, "Nearby red dwarf binary; the primary hosts a super-Earth"],
    ["DX Cancri", null, "Cnc", 127.45, 26.78, 11.7, "M6.5V", 14.8, "One of the smallest, dimmest stars known — about 9% the Sun's mass"],
    ["Epsilon Indi", "ε Ind", "Ind", 330.84, -56.79, 11.9, "K5V", 4.7, "Orbited by a cold Jupiter imaged by JWST plus a pair of brown dwarfs"],
    ["Tau Ceti", "τ Cet", "Cet", 26.02, -15.94, 11.9, "G8V", 3.5, "Closest single Sun-like star; hosts a compact multi-planet system"],
    ["GJ 1061", null, "Hor", 54.00, -44.51, 12.0, "M5.5V", 13.0, "Dim red dwarf with three planets, one in the habitable zone"],
    ["YZ Ceti", null, "Cet", 18.13, -16.99, 12.1, "M4.5V", 12.1, "Hosts three rocky planets, all orbiting closer in than Mercury"],
    ["Luyten's Star", null, "CMi", 111.85, 5.23, 12.3, "M3.5V", 9.9, "Hosts habitable-zone super-Earth Luyten b; lies just 1.2 ly from Procyon"],
    ["Teegarden's Star", null, "Ari", 43.25, 16.88, 12.5, "M7V", 15.1, "Ultracool dwarf, found only in 2003, with Earth-mass habitable-zone planets"],
    ["SCR 1845-6357", null, "Pav", 281.27, -63.96, 12.6, "M8.5V", 17.4, "Tiny red dwarf paired with a methane brown-dwarf companion"],
    ["Kapteyn's Star", null, "Pic", 77.92, -45.02, 12.8, "sdM1", 8.9, "Halo star orbiting the Galaxy backwards — likely debris of a devoured dwarf galaxy"],
    ["Lacaille 8760", "AX Mic", "Mic", 319.31, -38.87, 13.0, "M0V", 6.7, "One of the brightest red dwarfs, hovering just below naked-eye visibility"],
    ["Kruger 60", null, "Cep", 337.00, 57.70, 13.1, "M3V+M4V", 9.6, "Close binary red dwarf; its companion DO Cephei flares every few hours"],
    ["DENIS J1048-3956", null, "Ant", 162.06, -39.94, 13.2, "M8.5V", 17.4, "One of the nearest ultracool dwarfs, discovered only in 2001"],
    ["Ross 614", "V577 Mon", "Mon", 97.35, -2.81, 13.3, "M4.5V+M5.5V", 11.1, "Flare-star binary sitting almost on the celestial equator"],
    ["Wolf 1061", null, "Oph", 247.58, -12.66, 14.1, "M3V", 10.1, "Hosts three super-Earths; Wolf 1061 c lies in the habitable zone"],
    ["Van Maanen's Star", null, "Psc", 12.29, 5.39, 14.1, "DZ7", 12.4, "Closest solitary white dwarf — the burned-out core of a Sun-like star"],
    ["Gliese 1", null, "Scl", 1.35, -37.36, 14.2, "M1.5V", 8.6, "First entry in the Gliese catalogue of nearby stars"],
    ["Wolf 424", "FL Vir", "Vir", 188.32, 9.02, 14.2, "M5.5V+M7V", 13.1, "Tight flare-star binary resolved only by large telescopes"],
    ["TZ Arietis", null, "Ari", 30.05, 13.05, 14.6, "M4.5V", 12.3, "Flare star with a candidate gas-giant planet on a wide orbit"],
    ["Gliese 674", null, "Ara", 262.17, -46.90, 14.8, "M3V", 9.4, "Red dwarf orbited by a hot Neptune found by radial velocity"],
    ["Gliese 687", null, "Dra", 264.11, 68.34, 14.8, "M3V", 9.2, "High-proper-motion red dwarf with a Neptune-mass planet"],
    ["GJ 1245", null, "Cyg", 298.48, 44.42, 14.8, "M5.5V", 13.4, "Triple system of very low-mass flare stars in Cygnus"],
    ["LHS 292", null, "Sex", 162.05, -11.33, 14.9, "M6.5V", 15.7, "Faint flare star visible only through sizable telescopes"],
    ["Gliese 440", null, "Mus", 176.43, -64.84, 15.1, "DQ6", 11.5, "Nearest lone white dwarf of the southern sky"],
    ["Gliese 876", "IL Aqr", "Aqr", 343.32, -14.26, 15.2, "M4V", 10.2, "First red dwarf found to host planets — four worlds, three locked in resonance"],
    ["GJ 1002", null, "Cet", 1.68, -7.54, 15.8, "M5.5V", 13.8, "Quiet red dwarf with two Earth-mass planets in its habitable zone"],
    ["LHS 288", null, "Car", 161.09, -61.20, 15.8, "M5.5V", 13.9, "Closest star in Carina, far too faint for the naked eye"],
    ["Gliese 412", null, "UMa", 166.37, 43.53, 15.8, "M1V+M5.5V", 8.8, "Wide binary; its faint companion WX UMa is a violent flare star"],
    ["Groombridge 1618", null, "UMa", 152.84, 49.45, 15.9, "K7V", 6.6, "Orange dwarf just below naked-eye brightness in the Great Bear"],
    ["AD Leonis", null, "Leo", 154.90, 19.87, 16.2, "M3.5V", 9.3, "One of the most intensively studied flare stars in the sky"],
    ["Gliese 832", null, "Gru", 323.39, -49.01, 16.2, "M2V", 8.7, "Red dwarf with a Jupiter analog on a decade-long orbit"],
    ["Gliese 682", null, "Sco", 264.27, -44.32, 16.3, "M3.5V", 10.9, "Dim red dwarf with candidate super-Earth planets"],
    ["40 Eridani", "ο² Eri", "Eri", 63.82, -7.65, 16.3, "K0.5V", 4.4, "Triple system; 40 Eri B was the first white dwarf identified — and Star Trek put Vulcan here"],
    ["EV Lacertae", null, "Lac", 341.71, 44.33, 16.5, "M3.5V", 10.2, "In 2008 it unleashed a flare thousands of times stronger than any solar flare"],
    ["70 Ophiuchi", "70 Oph", "Oph", 271.36, 2.50, 16.6, "K0V+K4V", 4.0, "Showpiece binary of orange dwarfs orbiting each other every 88 years"],
    ["Altair", "α Aql", "Aql", 297.70, 8.87, 16.7, "A7V", 0.8, "Spins in ~9 hours, flattening it visibly; a vertex of the Summer Triangle"],
    ["GJ 3379", null, "Ori", 90.02, 2.71, 17.0, "M3.5V", 11.3, "The nearest star in the constellation Orion"],

    // -------------------------------------------------------------------
    // Notable stars 17-120 light-years: every decade of a life crosses
    // several of these. All carry facts.
    // -------------------------------------------------------------------
    ["Sigma Draconis", "σ Dra", "Dra", 293.09, 69.66, 18.8, "G9V", 4.7, "One of the closest Sun-like stars; a long-time SETI and planet-hunt target"],
    ["Gliese 570", null, "Lib", 224.37, -21.42, 19.0, "K4V", 5.7, "Orange-dwarf triple with one of the first T-type brown dwarfs found"],
    ["Achird", "η Cas", "Cas", 12.28, 57.82, 19.3, "F9V+K7V", 3.4, "Sun-like star with an orange companion — a favorite small-telescope double"],
    ["36 Ophiuchi", "36 Oph", "Oph", 258.84, -26.60, 19.5, "K2V+K1V", 4.3, "Triple system of orange dwarfs resembling slightly cooler Suns"],
    ["82 G. Eridani", null, "Eri", 49.98, -43.07, 19.7, "G6V", 4.3, "Metal-poor Sun-like star hosting several super-Earths"],
    ["Delta Pavonis", "δ Pav", "Pav", 302.18, -66.18, 19.9, "G8IV", 3.6, "Aging Sun-like subgiant, ranked among the best SETI targets"],
    ["Gliese 581", null, "Lib", 229.86, -7.72, 20.5, "M3V", 10.6, "Its planets ignited the first great habitable-zone exoplanet debates"],
    ["HD 219134", null, "Cas", 348.32, 57.17, 21.3, "K3V", 5.6, "Hosts the closest known transiting rocky exoplanets"],
    ["Xi Bootis", "ξ Boo", "Boo", 222.85, 19.10, 21.9, "G8V+K4V", 4.6, "Young Sun-like binary easily split in small telescopes"],
    ["Gliese 667", null, "Sco", 259.74, -34.99, 23.6, "K3V+K5V+M1.5V", 5.9, "Triple system whose red-dwarf member C hosts habitable-zone super-Earths"],
    ["Beta Hydri", "β Hyi", "Hyi", 6.44, -77.25, 24.3, "G2IV", 2.8, "A glimpse of the Sun's future — a Sun-like star ~6 billion years old"],
    ["Mu Cassiopeiae", "μ Cas", "Cas", 17.07, 54.92, 24.6, "G5Vb", 5.2, "Ancient metal-poor halo star streaking through the solar neighborhood"],
    ["Vega", "α Lyr", "Lyr", 279.23, 38.78, 25.0, "A0V", 0.0, "The original magnitude-zero standard; a former and future pole star with a debris disk"],
    ["Fomalhaut", "α PsA", "PsA", 344.41, -29.62, 25.1, "A4V", 1.2, "Ringed by a vast debris belt imaged by Hubble and JWST"],
    ["Tabit", "π³ Ori", "Ori", 72.46, 6.96, 26.3, "F6V", 3.2, "The nearest naked-eye star in Orion, just west of the Hunter's shield"],
    ["Chi Draconis", "χ Dra", "Dra", 275.26, 72.73, 26.3, "F7V", 3.6, "Bright nearby binary circling high above the north celestial pole"],
    ["Mu Herculis", "μ Her", "Her", 266.61, 27.72, 27.1, "G5IV", 3.4, "Sun-like star just beginning to evolve into a subgiant"],
    ["Chara", "β CVn", "CVn", 188.44, 41.36, 27.5, "G0V", 4.3, "Often cited as the most Sun-like star visible to the naked eye"],
    ["61 Virginis", "61 Vir", "Vir", 199.60, -18.31, 27.8, "G7V", 4.7, "Sun-like star with three known low-mass planets"],
    ["Zeta Tucanae", "ζ Tuc", "Tuc", 5.02, -64.87, 28.0, "F9.5V", 4.2, "Solar-type star of the deep south, near the Small Magellanic Cloud"],
    ["Gamma Leporis", "γ Lep", "Lep", 86.12, -22.45, 29.0, "F6V", 3.6, "Nearby binary and outlying member of the Ursa Major moving group"],
    ["Kappa Ceti", "κ¹ Cet", "Cet", 49.84, 3.37, 29.9, "G5V", 4.8, "Young solar analog used to study what the early Sun was like"],
    ["Groombridge 1830", null, "UMa", 178.24, 37.72, 29.9, "G8Vp", 6.4, "Halo star with the third-highest proper motion known"],
    ["Beta Comae Berenices", "β Com", "Com", 197.97, 27.88, 29.9, "G0V", 4.3, "A slightly hotter, brighter twin of the Sun"],
    ["Gamma Pavonis", "γ Pav", "Pav", 321.61, -65.37, 30.2, "F9V", 4.2, "Metal-poor Sun-like star, a high-priority target for planet imaging"],
    ["Rana", "δ Eri", "Eri", 55.81, -9.76, 29.5, "K0IV", 3.5, "Orange subgiant whose name means 'the frog'"],
    ["AU Microscopii", null, "Mic", 311.29, -31.34, 31.7, "M1Ve", 8.6, "Young flaring red dwarf with an edge-on debris disk and transiting planets"],
    ["Alpha Mensae", "α Men", "Men", 92.56, -74.75, 33.3, "G7V", 5.1, "Brightest star of Mensa, the faintest of all 88 constellations"],
    ["Pollux", "β Gem", "Gem", 116.33, 28.03, 33.8, "K0III", 1.1, "Closest giant star to the Sun; hosts the planet Thestias"],
    ["Zeta Herculis", "ζ Her", "Her", 250.32, 31.60, 35.0, "G0IV", 2.8, "Nearby subgiant binary with a 34.5-year orbit"],
    ["Zavijava", "β Vir", "Vir", 177.67, 1.76, 35.7, "F9V", 3.6, "Sun-like star lying so near the ecliptic the Moon can occult it"],
    ["Denebola", "β Leo", "Leo", 177.26, 14.57, 35.9, "A3V", 2.1, "The Lion's tail, surrounded by a dusty debris disk"],
    ["Arcturus", "α Boo", "Boo", 213.92, 19.18, 36.7, "K1.5III", -0.1, "Brightest star of the northern celestial hemisphere — an old giant passing through"],
    ["Muphrid", "η Boo", "Boo", 208.67, 18.40, 37.2, "G0IV", 2.7, "Arcturus's neighbor in space — the two are barely 3 light-years apart"],
    ["Porrima", "γ Vir", "Vir", 190.42, -1.45, 38.1, "F0V+F0V", 2.7, "Twin-star binary whose components swing around each other every 169 years"],
    ["Deneb Algedi", "δ Cap", "Cap", 326.76, -16.13, 38.7, "A7mIII", 2.9, "Eclipsing binary near where Neptune was first spotted in 1846"],
    ["Zeta Reticuli", "ζ Ret", "Ret", 49.55, -62.51, 39.3, "G2V+G1V", 5.2, "Wide pair of solar twins, made famous by UFO folklore"],
    ["Beta Trianguli Australis", "β TrA", "TrA", 238.78, -63.43, 40.4, "F1V", 2.9, "Bright F-type star anchoring a corner of the Southern Triangle"],
    ["TRAPPIST-1", null, "Aqr", 346.62, -5.04, 40.7, "M8V", 18.8, "Seven Earth-sized planets, several in the habitable zone — a JWST favorite"],
    ["Capella", "α Aur", "Aur", 79.17, 46.00, 42.9, "G8III+G0III", 0.1, "Sixth-brightest star: a pair of giant suns circling each other every 104 days"],
    ["Upsilon Andromedae", "υ And", "And", 24.20, 41.41, 44.0, "F8V", 4.1, "First multi-planet system discovered around a Sun-like star (1999)"],
    ["Errai", "γ Cep", "Cep", 354.84, 77.63, 45.0, "K1IV", 3.2, "Its planet was tentatively detected in 1988 — years ahead of its time; a future pole star"],
    ["Chalawan", "47 UMa", "UMa", 164.87, 40.43, 45.9, "G1V", 5.0, "Hosts Jupiter-like planets on wide, circular, solar-system-style orbits"],
    ["Talitha", "ι UMa", "UMa", 134.80, 48.04, 47.3, "A7IV", 3.1, "A-type star leading the Great Bear's front paw, with low-mass companions"],
    ["GJ 1214", null, "Oph", 258.83, 4.96, 47.8, "M4.5V", 14.7, "Hosts GJ 1214 b, the archetypal steamy 'water-world' sub-Neptune"],
    ["Rasalhague", "α Oph", "Oph", 263.73, 12.56, 48.6, "A5IV", 2.1, "Rapid rotator seen nearly pole-on, marking the Serpent Bearer's head"],
    ["Alderamin", "α Cep", "Cep", 319.65, 62.59, 49.1, "A8V", 2.5, "Will take its turn as the North Star around the year 7500"],
    ["Mu Arae", "μ Ara", "Ara", 266.04, -51.83, 50.6, "G3IV-V", 5.1, "Hosts four planets, including one of the first super-Earths ever found"],
    ["51 Pegasi", "51 Peg", "Peg", 344.37, 20.77, 50.6, "G2IV", 5.5, "Home of 51 Peg b (1995), the first exoplanet found around a Sun-like star — a Nobel discovery"],
    ["Castor", "α Gem", "Gem", 113.65, 31.89, 51.0, "A1V+A2Vm", 1.6, "Sextuple star — three binaries bound in one system"],
    ["Tau Bootis", "τ Boo", "Boo", 206.82, 17.46, 51.0, "F7V", 4.5, "Hot-Jupiter host whose star flips its magnetic field like the Sun does"],
    ["Alpha Circini", "α Cir", "Cir", 220.63, -64.98, 54.0, "A7Vp", 3.2, "Brightest of the rapidly oscillating Ap stars, pulsing every 6.8 minutes"],
    ["Caph", "β Cas", "Cas", 2.29, 59.15, 54.7, "F2III", 2.3, "Delta Scuti pulsator at the western tip of Cassiopeia's W"],
    ["Iota Horologii", "ι Hor", "Hor", 40.64, -50.80, 56.5, "G0Vp", 5.4, "Planet-hosting Sun-like star thought to have drifted here from the Hyades cluster"],
    ["Rho Coronae Borealis", "ρ CrB", "CrB", 240.26, 33.30, 57.1, "G0V", 5.4, "Solar twin with four known planets"],
    ["Zosma", "δ Leo", "Leo", 168.53, 20.52, 58.4, "A4V", 2.6, "Fast-spinning star on the Lion's hindquarters"],
    ["Menkent", "θ Cen", "Cen", 211.67, -36.37, 58.8, "K0III", 2.1, "Orange giant marking the Centaur's shoulder"],
    ["Pi Mensae", "π Men", "Men", 84.29, -80.47, 59.6, "G0V", 5.7, "Hosted TESS's very first planet discovery, the super-Earth Pi Men c"],
    ["Sheratan", "β Ari", "Ari", 28.66, 20.81, 59.6, "A5V", 2.6, "Spectroscopic binary on a notably eccentric 107-day orbit"],
    ["Beta Pictoris", "β Pic", "Pic", 86.82, -51.07, 63.4, "A6V", 3.9, "Young star with an edge-on debris disk and two directly imaged giant planets"],
    ["Tureis", "ρ Pup", "Pup", 121.89, -24.30, 63.5, "F5IIkF2", 2.8, "One of the brightest Delta Scuti pulsating stars, varying every 3.4 hours"],
    ["Alpha Chamaeleontis", "α Cha", "Cha", 124.63, -76.92, 63.5, "F5III", 4.1, "Brightest star of the far-southern Chamaeleon"],
    ["Larawag", "ε Sco", "Sco", 252.54, -34.29, 63.7, "K1III", 2.3, "Orange giant in the Scorpion's body; its name comes from Australia's Wardaman people"],
    ["Aldebaran", "α Tau", "Tau", 68.98, 16.51, 65.3, "K5III", 0.9, "The Bull's orange eye, a foreground star to the Hyades; Pioneer 10 drifts roughly its way"],
    ["Hamal", "α Ari", "Ari", 31.79, 23.46, 65.8, "K1III", 2.0, "Brightest star of Aries; hosts a giant planet"],
    ["Gamma Doradus", "γ Dor", "Dor", 64.01, -51.49, 66.7, "F1V", 4.2, "Prototype of an entire class of gravity-wave pulsating stars"],
    ["16 Cygni", "16 Cyg", "Cyg", 295.47, 50.53, 69.8, "G3V+G3V", 6.0, "Pair of solar twins; 16 Cyg B's planet rides a wildly eccentric orbit"],
    ["Alpha Hydri", "α Hyi", "Hyi", 29.69, -61.57, 71.8, "F0V", 2.9, "Bright F-type star deep in southern skies, near Achernar"],
    ["Aljanah", "ε Cyg", "Cyg", 311.55, 33.97, 72.7, "K0III", 2.5, "Orange giant marking the Swan's eastern wing"],
    ["Unukalhai", "α Ser", "Ser", 236.07, 6.43, 74.0, "K2III", 2.6, "Orange giant marking the Serpent's heart"],
    ["Alphecca", "α CrB", "CrB", 233.67, 26.71, 75.0, "A1V", 2.2, "Eclipsing binary set like a gem in the Northern Crown"],
    ["Zubenelgenubi", "α Lib", "Lib", 222.72, -16.04, 75.8, "A3IV", 2.8, "Wide naked-eye double sitting almost exactly on the ecliptic"],
    ["Kaus Borealis", "λ Sgr", "Sgr", 276.99, -25.42, 78.2, "K1IIIb", 2.8, "Top of the Sagittarius Teapot; the Moon and planets pass close by"],
    ["Regulus", "α Leo", "Leo", 152.09, 11.97, 79.3, "B8IVn", 1.4, "Spins so fast it bulges into an egg shape; the Moon regularly occults it"],
    ["Merak", "β UMa", "UMa", 165.46, 56.38, 79.7, "A1V", 2.4, "Big Dipper pointer star that aims the way to Polaris"],
    ["Megrez", "δ UMa", "UMa", 183.86, 57.03, 80.5, "A3V", 3.3, "Faintest of the Big Dipper's seven stars"],
    ["Alsephina", "δ Vel", "Vel", 131.18, -54.71, 80.6, "A1V", 2.0, "Eclipsing triple system in the 'False Cross' of the southern sky"],
    ["Menkalinan", "β Aur", "Aur", 89.88, 44.95, 81.1, "A1IV", 1.9, "Eclipsing binary of two nearly identical subgiant stars"],
    ["Cebalrai", "β Oph", "Oph", 265.87, 4.57, 81.8, "K2III", 2.8, "Orange giant on the Serpent Bearer's shoulder"],
    ["Alioth", "ε UMa", "UMa", 193.51, 55.96, 82.6, "A1III-IVp", 1.8, "Brightest star of the Big Dipper; a magnetically peculiar star"],
    ["Mizar", "ζ UMa", "UMa", 200.98, 54.93, 82.9, "A2Vp", 2.2, "Famous naked-eye double with Alcor and the first telescopic binary discovered"],
    ["Phecda", "γ UMa", "UMa", 178.46, 53.69, 83.2, "A0Ve", 2.4, "Big Dipper bowl star spinning fast enough to shed a gaseous envelope"],
    ["Ankaa", "α Phe", "Phe", 6.57, -42.31, 85.0, "K0III", 2.4, "Orange giant whose name recalls the mythical phoenix"],
    ["Seginus", "γ Boo", "Boo", 218.02, 38.31, 86.8, "A7III", 3.0, "Delta Scuti variable on the Herdsman's shoulder"],
    ["Algorab", "δ Crv", "Crv", 187.47, -16.52, 86.9, "A0IV", 3.0, "Double star marking the Crow's wing"],
    ["Ascella", "ζ Sgr", "Sgr", 285.65, -29.88, 88.0, "A2IV", 2.6, "Close binary in the handle of the Sagittarius Teapot"],
    ["Sabik", "η Oph", "Oph", 257.59, -15.72, 88.0, "A2V", 2.4, "Tight binary whose stars trace unusually eccentric orbits"],
    ["Gacrux", "γ Cru", "Cru", 187.79, -57.11, 88.6, "M3.5III", 1.6, "Nearest red giant to the Sun, capping the Southern Cross"],
    ["Cursa", "β Eri", "Eri", 76.96, -5.09, 89.2, "A3IV", 2.8, "Marks the source of the river Eridanus beside Orion's foot"],
    ["Algol", "β Per", "Per", 47.04, 40.96, 90.0, "B8V", 2.1, "The 'Demon Star' — prototype eclipsing binary, dimming every 2.87 days"],
    ["Athebyne", "η Dra", "Dra", 246.00, 61.51, 92.1, "G8III", 2.7, "Yellow giant coiled in the Dragon's body"],
    ["Diphda", "β Cet", "Cet", 10.90, -17.99, 96.3, "K0III", 2.0, "Brightest star of Cetus and a surprisingly strong X-ray source"],
    ["Alpha Pictoris", "α Pic", "Pic", 102.05, -61.94, 97.0, "A8Vn", 3.3, "Fast-spinning star of the southern Painter's Easel"],
    ["Alpheratz", "α And", "And", 2.10, 29.09, 97.0, "B8IVpMnHg", 2.1, "Shares the Great Square of Pegasus; a mercury-manganese chemical oddball"],
    ["Alpha Indi", "α Ind", "Ind", 309.39, -47.29, 98.0, "K0III", 3.1, "Orange giant leading the southern constellation of the Indian"],
    ["Ruchbah", "δ Cas", "Cas", 21.45, 60.24, 99.4, "A5IV", 2.7, "Possible eclipsing system in Cassiopeia's W"],
    ["Alnair", "α Gru", "Gru", 332.06, -46.96, 101.0, "B6V", 1.7, "Brightest star of Grus the Crane; its name means 'the bright one'"],
    ["Edasich", "ι Dra", "Dra", 231.23, 58.97, 101.2, "K2III", 3.3, "First giant star found to host an exoplanet (2002)"],
    ["Alkaid", "η UMa", "UMa", 206.88, 49.31, 103.9, "B3V", 1.9, "Hot young star tipping the Dipper's handle — not a true member of the Ursa Major group"],
    ["Alhena", "γ Gem", "Gem", 99.43, 16.40, 109.3, "A1.5IV", 1.9, "Bright subgiant marking the twin Pollux's foot"],
    ["Vindemiatrix", "ε Vir", "Vir", 195.55, 10.96, 109.6, "G8III", 2.8, "The 'Grape Gatherer' — its dawn rising once signaled the harvest"],
    ["Miaplacidus", "β Car", "Car", 138.30, -69.72, 113.2, "A1III", 1.7, "Second-brightest star of Carina, in the Diamond Cross"],
    ["Cor Caroli", "α² CVn", "CVn", 194.01, 38.32, 115.0, "A0VpSiEu", 2.9, "Prototype of magnetically peculiar variable stars; named for King Charles"],

    // -------------------------------------------------------------------
    // Bright and famous stars beyond 120 ly — all-sky zenith coverage.
    // -------------------------------------------------------------------
    ["Dubhe", "α UMa", "UMa", 165.93, 61.75, 123, "K0III", 1.8, "Big Dipper pointer star — an orange giant unlike its blue-white neighbors"],
    ["Algieba", "γ Leo", "Leo", 154.99, 19.84, 130, "K1III+G7III", 2.0, "Golden double star in the Lion's mane; the primary hosts a planet"],
    ["Muhlifain", "γ Cen", "Cen", 190.38, -48.96, 130, "A1IV", 2.2, "Tight binary of twin white stars in Centaurus"],
    ["Kochab", "β UMi", "UMi", 222.68, 74.16, 131, "K4III", 2.1, "Served with Pherkad as twin pole stars in antiquity"],
    ["Markab", "α Peg", "Peg", 346.19, 15.21, 133, "B9III", 2.5, "Corner of the Great Square of Pegasus"],
    ["Elnath", "β Tau", "Tau", 81.57, 28.61, 134, "B7III", 1.7, "The Bull's northern horn, shared historically with Auriga"],
    ["Achernar", "α Eri", "Eri", 24.43, -57.24, 139, "B6Vep", 0.5, "Flattest star known — spinning near breakup, it bulges 35% wider at the equator"],
    ["Kornephoros", "β Her", "Her", 247.55, 21.49, 139, "G7III", 2.8, "Brightest star of Hercules despite its beta designation"],
    ["Kaus Australis", "ε Sgr", "Sgr", 276.04, -34.38, 143, "B9.5III", 1.9, "Brightest star of Sagittarius, at the Teapot's base"],
    ["Eltanin", "γ Dra", "Dra", 269.15, 51.49, 154, "K5III", 2.2, "The Dragon's eye; helped prove the aberration of starlight in 1728"],
    ["Gienah", "γ Crv", "Crv", 183.95, -17.54, 154, "B8III", 2.6, "Brightest star of Corvus the Crow"],
    ["HD 209458", null, "Peg", 330.80, 18.88, 158, "G0V", 7.7, "Its planet 'Osiris' was the first seen transiting and the first with a detected atmosphere"],
    ["Acamar", "θ Eri", "Eri", 44.57, -40.30, 160, "A4III", 2.9, "Striking white double; the ancient end of the river Eridanus"],
    ["Nihal", "β Lep", "Lep", 82.06, -20.76, 160, "G5II", 2.8, "Yellow bright giant beneath Orion, in the Hare"],
    ["Yed Prior", "δ Oph", "Oph", 243.59, -3.69, 171, "M0.5III", 2.7, "Red giant forming the Serpent Bearer's left hand"],
    ["Alphard", "α Hya", "Hya", 141.90, -8.66, 177, "K3III", 2.0, "'The solitary one' — lone bright heart of the sprawling Hydra"],
    ["Tiaki", "β Gru", "Gru", 340.67, -46.88, 177, "M5III", 2.1, "Pulsating red giant whose ruddy color contrasts with blue-white Alnair"],
    ["Peacock", "α Pav", "Pav", 306.41, -56.74, 179, "B2IV", 1.9, "Hot binary; one of the few stars named by a 20th-century almanac for navigators"],
    ["Zubeneschamali", "β Lib", "Lib", 229.25, -9.38, 185, "B8V", 2.6, "Reputedly the only naked-eye star observers call greenish"],
    ["Scheat", "β Peg", "Peg", 345.94, 28.08, 196, "M2.5II-III", 2.4, "Red giant corner of the Great Square, varying irregularly in brightness"],
    ["Mirach", "β And", "And", 17.43, 35.62, 197, "M0III", 2.1, "Red giant signpost used to find the Andromeda Galaxy"],
    ["Alpha Tucanae", "α Tuc", "Tuc", 334.62, -60.26, 199, "K3III", 2.9, "Brightest star of Tucana, near the Small Magellanic Cloud"],
    ["Izar", "ε Boo", "Boo", 221.25, 27.07, 203, "K0II-III+A2V", 2.4, "Orange-and-blue double nicknamed 'Pulcherrima' — the most beautiful"],
    ["Zaurak", "γ Eri", "Eri", 59.51, -13.51, 203, "M0.5III", 3.0, "Red giant bend in the river Eridanus"],
    ["Aldhanab", "γ Gru", "Gru", 328.48, -37.36, 211, "B8III", 3.0, "Blue-white giant at the Crane's head"],
    ["Nunki", "σ Sgr", "Sgr", 283.82, -26.30, 228, "B2.5V", 2.1, "Hot star of the Teapot's handle bearing an ancient Babylonian name"],
    ["Schedar", "α Cas", "Cas", 10.13, 56.54, 228, "K0IIIa", 2.2, "Orange giant anchoring Cassiopeia's W"],
    ["Tejat", "μ Gem", "Gem", 95.74, 22.51, 230, "M3III", 2.9, "Red giant at Castor's heel, often visited by the Moon"],
    ["Menkar", "α Cet", "Cet", 45.57, 4.09, 250, "M1.5IIIa", 2.5, "Red giant jaw of Cetus the sea monster"],
    ["Bellatrix", "γ Ori", "Ori", 81.28, 6.35, 250, "B2III", 1.6, "Orion's 'Amazon Star' shoulder — a hot blue giant"],
    ["Spica", "α Vir", "Vir", 201.30, -11.16, 250, "B1III-IV+B2V", 1.0, "Close pair of hot stars distorted into ellipsoids by mutual gravity"],
    ["Phact", "α Col", "Col", 84.91, -34.07, 261, "B7IV", 2.6, "Be star of Columba the Dove, ringed by a gaseous disk"],
    ["Sargas", "θ Sco", "Sco", 264.33, -43.00, 270, "F0II", 1.9, "Bright giant curling through the Scorpion's tail"],
    ["Mimosa", "β Cru", "Cru", 191.93, -59.69, 280, "B0.5III", 1.3, "Second star of the Southern Cross — a hot pulsating giant"],
    ["Sigma Octantis", "σ Oct", "Oct", 317.20, -88.96, 281, "F0III", 5.5, "The faint southern pole star, barely visible to the naked eye"],
    ["Mira", "ο Cet", "Cet", 34.84, -2.98, 300, "M7IIIe", 3.0, "'The Wonderful' — prototype pulsating variable, fading and returning every 332 days"],
    ["Thuban", "α Dra", "Dra", 211.10, 64.38, 303, "A0III", 3.7, "Egypt's pole star when the Great Pyramids were built"],
    ["Canopus", "α Car", "Car", 95.99, -52.70, 310, "A9II", -0.7, "Second-brightest star in the sky; long used by spacecraft for navigation"],
    ["Alpha Muscae", "α Mus", "Mus", 189.30, -69.14, 315, "B2IV", 2.7, "Hot pulsating star of the southern Fly, near the Coalsack"],
    ["Acrux", "α Cru", "Cru", 186.65, -63.10, 320, "B0.5IV+B1V", 0.8, "Foot of the Southern Cross — the most southerly first-magnitude star"],
    ["Dabih", "β Cap", "Cap", 305.25, -14.78, 330, "K0II+B8V", 3.1, "Complex multiple system at the Sea-Goat's head"],
    ["Imai", "δ Cru", "Cru", 183.79, -58.75, 345, "B2IV", 2.8, "Fourth star of the Southern Cross, a hot subgiant"],
    ["Kaus Media", "δ Sgr", "Sgr", 275.25, -29.83, 348, "K3III", 2.7, "Middle star of the Archer's bow"],
    ["Rasalgethi", "α Her", "Her", 258.66, 14.39, 360, "M5Ib-II", 3.1, "Variable red giant so large it would swallow the inner solar system"],
    ["Rastaban", "β Dra", "Dra", 262.61, 52.30, 380, "G2Ib-IIa", 2.8, "Yellow supergiant forming one of the Dragon's eyes"],
    ["Hadar", "β Cen", "Cen", 210.96, -60.37, 390, "B1III", 0.6, "Triple system of massive hot stars; a pointer to the Southern Cross"],
    ["Algenib", "γ Peg", "Peg", 3.31, 15.18, 390, "B2IV", 2.8, "Pulsating hot star at the Great Square's southeast corner"],
    ["Almach", "γ And", "And", 30.97, 42.33, 390, "K3IIb+B9V", 2.1, "Gold-and-blue showpiece double at Andromeda's foot"],
    ["Atria", "α TrA", "TrA", 252.17, -69.03, 391, "K2II-III", 1.9, "Bright orange giant of the Southern Triangle"],
    ["Tarazed", "γ Aql", "Aql", 296.57, 10.61, 395, "K3II", 2.7, "Orange bright giant perched beside Altair"],
    ["Acrab", "β Sco", "Sco", 241.36, -19.81, 400, "B1V", 2.6, "Multiple system of hot stars at the Scorpion's claw"],
    ["Dschubba", "δ Sco", "Sco", 240.08, -22.62, 400, "B0.3IV", 2.3, "Be star that abruptly doubled in brightness in 2000 and stayed bright"],
    ["Segin", "ε Cas", "Cas", 28.60, 63.67, 410, "B3III", 3.4, "Hot blue giant at the end of Cassiopeia's W"],
    ["Alpha Apodis", "α Aps", "Aps", 221.97, -79.04, 430, "K3III", 3.8, "Orange giant of Apus, the Bird-of-Paradise, near the south pole"],
    ["Adhara", "ε CMa", "CMa", 104.66, -28.97, 430, "B2II", 1.5, "Brightest extreme-ultraviolet source in Earth's sky"],
    ["Albireo", "β Cyg", "Cyg", 292.68, 27.96, 430, "K3II+B8V", 3.1, "Beloved gold-and-sapphire telescopic double at the Swan's beak"],
    ["Epsilon Centauri", "ε Cen", "Cen", 204.97, -53.47, 430, "B1III", 2.3, "Massive pulsating blue giant in the Centaur"],
    ["Alcyone", "η Tau", "Tau", 56.87, 24.11, 440, "B7III", 2.9, "Brightest star of the Pleiades cluster"],
    ["Polaris", "α UMi", "UMi", 37.95, 89.26, 446, "F7Ib", 2.0, "The North Star — a Cepheid variable sitting almost exactly over Earth's pole"],
    ["Alpha Lupi", "α Lup", "Lup", 220.48, -47.39, 460, "B1.5III", 2.3, "Hot pulsating giant of the southern Wolf"],
    ["Theta Carinae", "θ Car", "Car", 160.74, -64.39, 460, "B0Vp", 2.7, "Brightest member of the 'Southern Pleiades' cluster IC 2602"],
    ["Kappa Scorpii", "κ Sco", "Sco", 265.62, -39.03, 480, "B1.5III", 2.4, "Pulsating blue giant in the Scorpion's stinger"],
    ["Pherkad", "γ UMi", "UMi", 230.18, 71.83, 487, "A3II-III", 3.0, "Kochab's partner 'guardian of the pole' in the Little Dipper's bowl"],
    ["Hassaleh", "ι Aur", "Aur", 74.25, 33.17, 490, "K3II", 2.7, "Orange bright giant at the Charioteer's foot"],
    ["Mirzam", "β CMa", "CMa", 95.67, -17.96, 500, "B1II-III", 2.0, "'The Announcer' — rises just before Sirius; a Beta Cephei pulsator"],
    ["Mirfak", "α Per", "Per", 51.08, 49.86, 510, "F5Ib", 1.8, "Yellow-white supergiant heart of the Alpha Persei star cluster"],
    ["Sadalmelik", "α Aqr", "Aqr", 331.45, -0.32, 520, "G2Ib", 3.0, "Rare yellow supergiant sitting almost on the celestial equator"],
    ["Sadalsuud", "β Aqr", "Aqr", 322.89, -5.57, 540, "G0Ib", 2.9, "'Luckiest of the lucky' — yellow supergiant of Aquarius"],
    ["Suhail", "λ Vel", "Vel", 137.00, -43.43, 545, "K4Ib", 2.2, "Orange supergiant in the Ship's sails"],
    ["Betelgeuse", "α Ori", "Ori", 88.79, 7.41, 548, "M1-2Ia-Iab", 0.5, "Red supergiant that famously dimmed in 2019-20; destined to go supernova"],
    ["Antares", "α Sco", "Sco", 247.35, -26.43, 550, "M1.5Iab", 1.0, "'Rival of Mars' — a red supergiant that would engulf the asteroid belt"],
    ["Gamma Cassiopeiae", "γ Cas", "Cas", 14.18, 60.72, 550, "B0.5IVe", 2.4, "Prototype eruptive Be star; astronauts used it as the navigation star 'Navi'"],
    ["Markeb", "κ Vel", "Vel", 140.53, -55.01, 570, "B2IV", 2.5, "Hot subgiant in the False Cross of Vela"],
    ["Shaula", "λ Sco", "Sco", 263.40, -37.10, 570, "B2IV", 1.6, "The Scorpion's stinger — second-brightest star in Scorpius"],
    ["Avior", "ε Car", "Car", 125.63, -59.51, 610, "K3III+B2V", 1.9, "Orange giant and hot dwarf pair used in celestial navigation"],
    ["Saiph", "κ Ori", "Ori", 86.94, -9.67, 650, "B0.5Ia", 2.1, "Orion's southeastern knee, a hot blue supergiant"],
    ["Alfirk", "β Cep", "Cep", 322.16, 70.56, 690, "B2III", 3.2, "Prototype of the Beta Cephei class of pulsating hot stars"],
    ["Enif", "ε Peg", "Peg", 326.05, 9.88, 690, "K2Ib", 2.4, "Orange supergiant nose of Pegasus, prone to rare bright outbursts"],
    ["Aspidiske", "ι Car", "Car", 139.27, -59.28, 690, "A9Ib", 2.2, "White supergiant in the keel of the old ship Argo"],
    ["Mebsuta", "ε Gem", "Gem", 100.98, 25.13, 840, "G8Ib", 3.0, "Yellow supergiant at Castor's outstretched leg"],
    ["Rigel", "β Ori", "Ori", 78.63, -8.20, 863, "B8Ia", 0.1, "Blue supergiant shining with roughly 120,000 Suns' worth of light"],
    ["Delta Cephei", "δ Cep", "Cep", 337.29, 58.42, 887, "F5Ib-G1Ib", 4.1, "Prototype Cepheid variable — calibrator of the cosmic distance ladder"],
    ["Naos", "ζ Pup", "Pup", 120.90, -40.00, 1080, "O4If", 2.2, "One of the nearest O-type supergiants — among the hottest naked-eye stars"],
    ["Regor", "γ² Vel", "Vel", 122.38, -47.34, 1100, "WC8+O7.5III", 1.8, "Contains the nearest Wolf-Rayet star, a massive sun shedding its outer layers"],
    ["Meissa", "λ Ori", "Ori", 83.78, 9.93, 1100, "O8III", 3.4, "Orion's head — a hot O-type star ionizing a vast ring of gas"],
    ["Mintaka", "δ Ori", "Ori", 83.00, -0.30, 1200, "O9.5II", 2.2, "Western Belt star, sitting almost exactly on the celestial equator"],
    ["Alnitak", "ζ Ori", "Ori", 85.19, -1.94, 1260, "O9.5Ib", 1.8, "Eastern Belt star beside the Flame and Horsehead nebulae"],
    ["Deneb", "α Cyg", "Cyg", 310.36, 45.28, 1500, "A2Ia", 1.3, "One of the most luminous stars the eye can see — tens of thousands of Suns"],
    ["Wezen", "δ CMa", "CMa", 107.10, -26.39, 1600, "F8Ia", 1.8, "Yellow-white supergiant outshining 50,000 Suns in the Great Dog"],
    ["Sadr", "γ Cyg", "Cyg", 305.56, 40.26, 1800, "F8Ib", 2.2, "Supergiant heart of the Northern Cross, wrapped in the Gamma Cygni nebula"],
    ["Alnilam", "ε Ori", "Ori", 84.05, -1.20, 2000, "B0Ia", 1.7, "Central Belt star — a blue supergiant hundreds of thousands of times the Sun's power"],
    ["Aludra", "η CMa", "CMa", 111.02, -29.30, 2000, "B5Ia", 2.5, "Distant blue supergiant at the Great Dog's tail"],
    ["Arneb", "α Lep", "Lep", 83.18, -17.82, 2200, "F0Ib", 2.6, "Aging supergiant of Lepus the Hare, likely near the end of its life"],
    ["Mu Cephei", "μ Cep", "Cep", 325.88, 58.78, 2840, "M2Ia", 4.1, "Herschel's 'Garnet Star' — one of the largest stars known"],
    ["Eta Carinae", "η Car", "Car", 161.27, -59.68, 7500, "LBV", 4.3, "Erupting supermassive star that briefly became the sky's second-brightest in the 1840s"]
  ];

  const STARS = ROWS.map(function (r) {
    return {
      name: r[0],
      bayer: r[1],
      con: r[2],
      ra: r[3],
      dec: r[4],
      ly: r[5],
      spectral: r[6],
      mag: r[7],
      fact: r[8] || null
    };
  }).sort(function (a, b) { return a.ly - b.ly; });

  // ---------------------------------------------------------------------
  // Math helpers
  // ---------------------------------------------------------------------

  const DEG = Math.PI / 180;

  function mod360(x) {
    return ((x % 360) + 360) % 360;
  }

  // Angular separation between two sky positions (degrees).
  // cos(d) = sin(dec1)sin(dec2) + cos(dec1)cos(dec2)cos(ra1 - ra2)
  function angularSepDeg(ra1, dec1, ra2, dec2) {
    const c = Math.sin(dec1 * DEG) * Math.sin(dec2 * DEG) +
              Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.cos((ra1 - ra2) * DEG);
    return Math.acos(Math.min(1, Math.max(-1, c))) / DEG;
  }

  function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // Greenwich Mean Sidereal Time in degrees (Meeus, Astronomical
  // Algorithms 2nd ed., Eq. 12.4).
  function gmstDeg(date) {
    const jd = julianDay(date);
    const d = jd - 2451545.0;
    const T = d / 36525;
    return mod360(280.46061837 + 360.98564736629 * d +
                  0.000387933 * T * T - (T * T * T) / 38710000);
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  function byDistance() {
    return STARS;
  }

  // Stars whose light-distance is within `ly` — i.e. the stars a person's
  // birth-light has already reached after living `ly` years.
  function reachedBy(ly) {
    return STARS.filter(function (s) { return s.ly <= ly; });
  }

  // The next milestone: first star the birth-light has not yet reached.
  function nextAfter(ly) {
    for (let i = 0; i < STARS.length; i++) {
      if (STARS[i].ly > ly) return STARS[i];
    }
    return null;
  }

  // Nearest catalog stars to a sky position, by angular separation.
  // Returns [{ star, sepDeg }] sorted nearest-first.
  function nearestSky(raDeg, decDeg, maxResults) {
    if (maxResults === undefined) maxResults = 3;
    return STARS
      .map(function (star) {
        return { star: star, sepDeg: angularSepDeg(raDeg, decDeg, star.ra, star.dec) };
      })
      .sort(function (a, b) { return a.sepDeg - b.sepDeg; })
      .slice(0, maxResults);
  }

  // Altitude/azimuth of a star for an observer at lat/lon (degrees,
  // east-positive longitude) at `date` (defaults to now).
  // Azimuth is measured from north through east (N=0, E=90, S=180, W=270).
  function altAzNow(star, lat, lon, date) {
    const when = date instanceof Date ? date : new Date();
    const lst = mod360(gmstDeg(when) + lon);       // local sidereal time, deg
    const H = mod360(lst - star.ra) * DEG;          // hour angle, rad
    const phi = lat * DEG;
    const dec = star.dec * DEG;

    const sinAlt = Math.sin(phi) * Math.sin(dec) +
                   Math.cos(phi) * Math.cos(dec) * Math.cos(H);
    const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt))) / DEG;

    // Meeus measures azimuth from south, westward; rotate to from-north.
    const azFromSouth = Math.atan2(
      Math.sin(H),
      Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
    ) / DEG;
    const az = mod360(azFromSouth + 180);

    return { alt: alt, az: az, hourAngleDeg: mod360(H / DEG), lstDeg: lst };
  }

  const StarCatalog = {
    STARS: STARS,
    byDistance: byDistance,
    reachedBy: reachedBy,
    nextAfter: nextAfter,
    nearestSky: nearestSky,
    altAzNow: altAzNow,
    angularSepDeg: angularSepDeg,
    gmstDeg: gmstDeg
  };

  global.StarCatalog = StarCatalog;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StarCatalog;
  }

})(typeof window !== 'undefined' ? window : globalThis);
