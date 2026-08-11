import { readFileSync } from 'node:fs';

const interpretations = readFileSync('website/js/interpretations.js', 'utf8');
const window = {};
new Function('window', interpretations)(window);
window.AstroEphemeris = {
  signName(lon) {
    return ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'][Math.floor((((lon % 360) + 360) % 360) / 30)];
  },
};

const detectChartPatterns = window.AstroInterpretations?.detectChartPatterns;
const failures = [];
const ok = (name, condition) => {
  if (!condition) failures.push(name);
};
const position = (sign, lon) => ({ sign, lon });
const aspect = (planet1, planet2, name, orb = 1) => ({ planet1, planet2, aspect: name, orb });
const patternsOf = (positions, aspects = []) => detectChartPatterns(positions, aspects);

ok('detectChartPatterns is exposed', typeof detectChartPatterns === 'function');
const detailed = window.AstroInterpretations?.analyzeChartDetailed({
  positions: {
    Sun: position('Taurus', 40),
    Moon: position('Cancer', 100),
    Venus: position('Gemini', 70),
    Saturn: position('Capricorn', 280),
    NNode: position('Aries', 15),
  },
  risingSign: 'Virgo',
  asc: 150,
  mc: 60,
  chartRuler: 'Mercury',
  planetHouses: { Sun: 9, Moon: 11, Venus: 10, Saturn: 5 },
  aspects: [],
});
ok('detailed chart analysis renders all five reading sections',
  ['personality','love','career','challenges','lifePurpose'].every(key => detailed && detailed[key]));


ok('detailed reading prose has no doubled full stops',
  !['personality','love','career','challenges','lifePurpose'].some(key => /\.\./.test(detailed?.[key] || '')));
const falseStellium = patternsOf({
  Moon: position('Taurus', 45),
  Midheaven: position('Taurus', 46),
  MC: position('Taurus', 46),
});
ok('angles do not invent a stellium', !falseStellium.some(p => p.type === 'stellium'));

const duplicatePoint = patternsOf({
  Moon: position('Taurus', 45),
  NorthNode: position('Taurus', 46),
  NNode: position('Taurus', 46),
});
ok('alias keys do not count the same point twice', !duplicatePoint.some(p => p.type === 'stellium'));

const pointInflatedStellium = patternsOf({
  Sun: position('Cancer', 100),
  Mercury: position('Cancer', 102),
  Lilith: position('Cancer', 104),
  NorthNode: position('Cancer', 106),
});
ok('nodes and calculated points do not invent a stellium', !pointInflatedStellium.some(p => p.type === 'stellium'));

const genuineStellium = patternsOf({
  Sun: position('Taurus', 40),
  Mercury: position('Taurus', 42),
  Venus: position('Taurus', 44),
  Midheaven: position('Taurus', 46),
  MC: position('Taurus', 46),
});
const stellium = genuineStellium.find(p => p.type === 'stellium');
ok('three real planets still form a stellium', stellium && stellium.planets.join('|') === 'Sun|Mercury|Venus');
ok('stellium copy names only real planets', stellium && stellium.description.includes('Sun, Mercury, Venus'));

const angleTSquare = patternsOf(
  {
    Sun: position('Aries', 10),
    Moon: position('Libra', 190),
    Midheaven: position('Cancer', 100),
    MC: position('Cancer', 100),
  },
  [
    aspect('Sun', 'Moon', 'opposition'),
    aspect('Sun', 'Midheaven', 'square'),
    aspect('Moon', 'Midheaven', 'square'),
  ],
);
ok('an angle cannot be the T-square focal point', !angleTSquare.some(p => p.type === 't-square'));
const nodeTSquare = patternsOf(
  {
    Sun: position('Aries', 10),
    Moon: position('Libra', 190),
    NorthNode: position('Cancer', 100),
  },
  [
    aspect('Sun', 'Moon', 'opposition'),
    aspect('Sun', 'NorthNode', 'square'),
    aspect('Moon', 'NorthNode', 'square'),
  ],
);
ok('a calculated node cannot form a T-square', !nodeTSquare.some(p => p.type === 't-square'));

const nodeYod = patternsOf(
  {
    Sun: position('Aries', 10),
    Moon: position('Gemini', 70),
    NorthNode: position('Virgo', 160),
  },
  [
    aspect('Sun', 'Moon', 'sextile'),
    aspect('Sun', 'NorthNode', 'quincunx'),
    aspect('Moon', 'NorthNode', 'quincunx'),
  ],
);
ok('a calculated node cannot form a Yod', !nodeYod.some(p => p.type === 'yod'));

const genuineKite = patternsOf(
  {
    Sun: position('Aries', 10),
    Moon: position('Leo', 130),
    Venus: position('Sagittarius', 250),
    Mars: position('Libra', 190),
  },
  [
    aspect('Sun', 'Moon', 'trine'),
    aspect('Moon', 'Venus', 'trine'),
    aspect('Sun', 'Venus', 'trine'),
    aspect('Sun', 'Mars', 'opposition'),
  ],
);
ok('a genuine Grand Trine plus outside opposition forms a Kite', genuineKite.some(p => p.type === 'kite'));


const genuineTSquare = patternsOf(
  {
    Sun: position('Aries', 10),
    Moon: position('Libra', 190),
    Venus: position('Cancer', 100),
  },
  [
    aspect('Sun', 'Moon', 'opposition'),
    aspect('Sun', 'Venus', 'square'),
    aspect('Moon', 'Venus', 'square'),
  ],
);
const tSquare = genuineTSquare.find(p => p.type === 't-square');
ok('a genuine T-square remains', tSquare && tSquare.description.includes('Venus as the focal planet'));

for (const file of ['website/img/plate-enhanced.svg', 'website/img/design/plate-enhanced.svg']) {
  const svg = readFileSync(file, 'utf8');
  ok(`${file} has no birth-data URL`, !svg.includes('astroprecise.app/#b='));
  ok(`${file} points to the verify page`, svg.includes('astroprecise.app/verify.html'));
}

const chart = readFileSync('website/chart.html', 'utf8');
ok('chart copy keeps the accuracy hedge', chart.includes('typically place the supported major-planet positions'));
ok('chart copy uses the supported singular figure', chart.includes('within about a sixtieth of a degree'));
ok('chart copy does not claim every body', !chart.includes('placing every body'));

if (failures.length) {
  console.error('FAIL', failures);
  process.exit(1);
}
console.log('PASS interpretation pattern, plate, and accuracy regression checks');
