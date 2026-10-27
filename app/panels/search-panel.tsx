import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import type { Atlas, Concept } from '../anatomy';

/** Suggestions shown before the user types anything. */
const MAJOR_ORGANS = [
  'heart',
  'brain',
  'liver',
  'stomach',
  'spleen',
  'pancreas',
  'urinary bladder',
  'trachea',
];
const MAX_RESULTS = 80;

interface Props {
  atlas: Atlas | null;
  query: string;
  onQueryChange: (query: string) => void;
  onChoose: (concept: Concept) => void;
  onClose: () => void;
}

export function SearchPanel({ atlas, query, onQueryChange, onChoose, onClose }: Props) {
  const results = useMemo(() => {
    if (!atlas) return [];
    const term = query.toLowerCase().trim();
    if (!term)
      return MAJOR_ORGANS.map((name) =>
        atlas.concepts.find((c) => c.name.toLowerCase() === name),
      ).filter((x): x is Concept => !!x);
    return atlas.concepts
      .filter((c) => c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term))
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, MAX_RESULTS);
  }, [atlas, query]);
  return (
    <section className="search-panel glass" aria-label="Find anatomy">
      <div className="panel-heading">
        <span>Find a structure</span>
        <Button variant="ghost" className="icon-button" onClick={onClose} aria-label="Close search">
          <X size={18} />
        </Button>
      </div>
      <Combobox<Concept>
        items={results}
        value={null}
        onValueChange={(value) => {
          if (value) onChoose(value);
        }}
        inputValue={query}
        onInputValueChange={onQueryChange}
        itemToStringLabel={(c) => c.name}
        filter={null}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ComboboxInput
          autoFocus
          placeholder="Heart, femur, cranial nerve…"
          aria-label="Search named anatomical structures"
          showTrigger={false}
        />
        <ComboboxContent className="anatomy-search-results">
          <ComboboxEmpty>No structures match your search.</ComboboxEmpty>
          <ComboboxList>
            {(c: Concept) => (
              <ComboboxItem key={c.id} value={c}>
                <span className="search-result-name">{c.name}</span>
                <span className="small-number">
                  {c.elements.length} {c.elements.length === 1 ? 'piece' : 'pieces'}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="search-note">
        {query
          ? `Showing up to ${MAX_RESULTS} matches. Refine your search to find smaller structures.`
          : 'Start with a major organ, or search every named structure.'}
      </p>
    </section>
  );
}
