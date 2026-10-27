// Snapshot Spanish Wikidata labels for the FMA concepts used by the atlas.
// Wikidata content is CC0. Run occasionally; the snapshot is committed so builds stay offline.
import fs from 'node:fs';

const atlas = JSON.parse(fs.readFileSync(new URL('../public/models/atlas.json', import.meta.url)));
const ids = new Set(atlas.concepts.map((c) => c.id));
const query =
  'SELECT ?fma ?es WHERE { ?item wdt:P1402 ?fma . ?item rdfs:label ?es . FILTER(LANG(?es) = "es") }';
const response = await fetch(
  `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`,
  { headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'human-atlas-i18n/0.1' } },
);
if (!response.ok) throw new Error(`Wikidata query failed: ${response.status}`);
const { results } = await response.json();
const labels = new Map();
for (const row of results.bindings) {
  const id = `FMA${row.fma.value}`;
  // Several items can share an FMA ID; keep the alphabetically first label for a stable snapshot.
  if (ids.has(id) && (!labels.has(id) || row.es.value < labels.get(id)))
    labels.set(id, row.es.value);
}
const lines = [...labels].sort(([a], [b]) => a.localeCompare(b)).map(([id, es]) => `${id}\t${es}`);
fs.writeFileSync(
  new URL('./i18n/wikidata-fma-es.tsv', import.meta.url),
  `# Spanish labels from Wikidata (CC0), matched by FMA ID (P1402).\n${lines.join('\n')}\n`,
);
console.log(`Saved ${lines.length} labels.`);
