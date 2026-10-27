// Build public/models/names-es.json: a Spanish name for every concept and mesh name in the atlas.
//
// Sources, in priority order:
//   1. scripts/i18n/names-es-overrides.tsv  hand corrections keyed by English name
//   2. scripts/i18n/wikidata-fma-es.tsv     Wikidata labels matched by FMA ID (CC0)
//   3. "left/right X" composed from a translated X, with the side adjective agreeing in gender
//   4. scripts/i18n/names-es.tsv            hand translations of templates in which every
//      "left"/"right" is written {S}; the Spanish side placeholders {S:m} {S:f} {S:mp} {S:fp}
//      (or {S1:…} {S2:…} when there are several) give the position and agreement. A template
//      also covers the same name without sides.
//
// Usage: node scripts/build-names-es.mjs [--check]   (--check fails if the JSON is out of date)
import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = (path) => new URL(path, import.meta.url);
const atlas = JSON.parse(fs.readFileSync(file('../public/models/atlas.json')));
const output = file('../public/models/names-es.json');

function readTsv(path) {
  return fs
    .readFileSync(file(path), 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const [key, value, ...rest] = line.split('\t');
      assert.ok(value && rest.length === 0, `${path}: malformed line "${line}"`);
      return [key, value];
    });
}

// Wikidata labels are often title-cased ("Músculo sóleo"); store sentence case like the rest.
const lowerFirst = (s) => s.charAt(0).toLocaleLowerCase('es') + s.slice(1);

const overrides = new Map(readTsv('./i18n/names-es-overrides.tsv'));
const wikidata = new Map(readTsv('./i18n/wikidata-fma-es.tsv'));
const templates = new Map(readTsv('./i18n/names-es.tsv'));

const idByName = new Map(atlas.concepts.map((c) => [c.name.toLowerCase(), c.id]));
const names = new Set([
  ...atlas.concepts.map((c) => c.name.toLowerCase()),
  ...atlas.parts.map((p) => p.name.toLowerCase()),
]);

const ORDINALS = new Set(
  'primer primera segundo segunda tercer tercera cuarto cuarta quinto quinta sexto sexta séptimo séptima octavo octava noveno novena décimo décima undécimo undécima duodécimo duodécima'.split(
    ' ',
  ),
);
const FEMININE = new Set(
  'aorta apófisis arteria aurícula boca cabeza cadera cámara capa cápsula cara cavidad ceja cintilla cintura circunvolución clavícula córnea coroides corteza costilla encía epiglotis escápula esclerótica estría falange faringe fascia formación fosa glándula hipófisis ínsula lámina laringe lengua mandíbula mano médula membrana mejilla muñeca nariz órbita pared parte pelvis piel pierna porción próstata rama red región retina rodilla rótula sínfisis tenia tibia tráquea uretra úvula valva válvula vejiga vena vértebra vesícula zona'.split(
    ' ',
  ),
);
const PLURAL = { músculos: 'mp', huesos: 'mp', nervios: 'mp', venas: 'fp', arterias: 'fp' };
const defaulted = new Map();

/** Grammatical gender and number of a Spanish noun phrase, from its head noun. */
function genderOf(spanish) {
  const words = spanish.toLocaleLowerCase('es').split(' ');
  const head = words.find((w) => !ORDINALS.has(w)) ?? words[0];
  if (PLURAL[head]) return PLURAL[head];
  if (FEMININE.has(head)) return 'f';
  if (head.endsWith('a')) {
    defaulted.set(head, 'f');
    return 'f';
  }
  return 'm';
}

const SIDE = {
  left: { m: 'izquierdo', f: 'izquierda', mp: 'izquierdos', fp: 'izquierdas' },
  right: { m: 'derecho', f: 'derecha', mp: 'derechos', fp: 'derechas' },
};
const PLACEHOLDER = /\{S(\d?):(m|f|mp|fp)\}/g;

// Same-name variants without any side, derived from side templates.
const sideless = new Map();
for (const [english, spanish] of templates) {
  if (!english.includes('{S}')) continue;
  const key = english.replace(/\{S\} /g, '');
  if (!templates.has(key) && !sideless.has(key))
    sideless.set(key, spanish.replace(/ \{S\d?:(?:m|f|mp|fp)\}/g, ''));
}

const used = { overrides: new Set(), templates: new Set() };
function direct(name) {
  if (overrides.has(name)) {
    used.overrides.add(name);
    return lowerFirst(overrides.get(name));
  }
  const label = wikidata.get(idByName.get(name));
  return label && lowerFirst(label);
}

function translate(name) {
  const known = direct(name);
  if (known) return known;
  const leading = name.match(/^(left|right) (.*)$/);
  const base = leading && direct(leading[2]);
  if (base) return `${base} ${SIDE[leading[1]][genderOf(base)]}`;
  const sides = name.match(/\b(left|right)\b/g) ?? [];
  const template = name.replace(/\b(left|right)\b/g, '{S}');
  if (templates.has(template)) {
    used.templates.add(template);
    const spanish = templates.get(template);
    const found = [...spanish.matchAll(PLACEHOLDER)].length;
    assert.equal(found, sides.length, `side placeholders do not match: ${template}`);
    return spanish.replace(PLACEHOLDER, (_, n, g) => SIDE[sides[n ? Number(n) - 1 : 0]][g]);
  }
  if (sideless.has(name)) {
    used.templates.add([...templates.keys()].find((t) => t.replace(/\{S\} /g, '') === name));
    return sideless.get(name);
  }
  return null;
}

const result = {},
  missing = [];
for (const name of [...names].sort()) {
  const spanish = translate(name);
  if (spanish) result[name] = spanish;
  else missing.push(name);
}

assert.deepEqual(missing, [], `Missing Spanish names:\n${missing.join('\n')}`);
for (const [name, spanish] of Object.entries(result))
  assert.ok(!/[{}]/.test(spanish) && !/ {2}/.test(spanish), `bad output for ${name}: ${spanish}`);
const unusedOverrides = [...overrides.keys()].filter((k) => !used.overrides.has(k));
const unusedTemplates = [...templates.keys()].filter((k) => !used.templates.has(k));
assert.deepEqual(unusedOverrides, [], 'Overrides that match no atlas name');
assert.deepEqual(unusedTemplates, [], 'Templates that match no atlas name');
if (defaulted.size)
  console.warn(`Gender guessed as feminine for: ${[...defaulted.keys()].sort().join(', ')}`);

const json = `${JSON.stringify(result, null, 0)}\n`;
if (process.argv.includes('--check')) {
  assert.ok(
    fs.existsSync(output) && fs.readFileSync(output, 'utf8') === json,
    'public/models/names-es.json is out of date; run node scripts/build-names-es.mjs',
  );
  console.log(`names-es.json is up to date (${Object.keys(result).length} names).`);
} else {
  fs.writeFileSync(output, json);
  console.log(`Wrote ${Object.keys(result).length} Spanish names.`);
}
