import { readFileSync } from 'node:fs';

const interpretations = readFileSync('website/js/interpretations.js', 'utf8');
const window = {};
new Function('window', interpretations)(window);

const detectChartPatterns = window.AstroInterpretations?.detectChartPatterns;
const failures = [];
const ok = (name, condition) => {
  if (!condition) failures.push(name);
};
const position = (sign, lon) => ({ sign, lon });
const aspect = (planet1, planet2, name, orb = 1) => ({ planet1, planet2, aspect: name, orb });
const patternsOf = (positions, aspects = []) => detectChartPatterns(positions, aspects);

ok('detectChartPatterns is exposed', typeof detectChartPatterns === 'function');

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
