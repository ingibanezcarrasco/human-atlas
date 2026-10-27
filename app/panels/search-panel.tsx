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
import { fold, useI18n } from '../i18n';

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
  'uterus',
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
  const { t, name } = useI18n();
  const results = useMemo(() => {
    if (!atlas) return [];
    const term = fold(query.trim());
    if (!term)
      return MAJOR_ORGANS.map((organ) =>
        atlas.concepts.find((c) => c.name.toLowerCase() === organ),
      ).filter((x): x is Concept => !!x);
    // Match the source (English) name, the displayed name and the atlas ID.
    return atlas.concepts
      .filter(
        (c) =>
          fold(c.name).includes(term) ||
          fold(name(c.name)).includes(term) ||
          c.id.toLowerCase().includes(term),
      )
      .sort((a, b) => name(a.name).length - name(b.name).length)
      .slice(0, MAX_RESULTS);
  }, [atlas, query, name]);
  return (
    <section className="search-panel glass" aria-label={t.search.region}>
      <div className="panel-heading">
        <span>{t.search.heading}</span>
        <Button
          variant="ghost"
          className="icon-button"
          onClick={onClose}
          aria-label={t.search.close}
        >
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
        itemToStringLabel={(c) => name(c.name)}
        filter={null}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ComboboxInput
          autoFocus
          placeholder={t.search.placeholder}
          aria-label={t.search.input}
          showTrigger={false}
        />
        <ComboboxContent className="anatomy-search-results">
          <ComboboxEmpty>{t.search.empty}</ComboboxEmpty>
          <ComboboxList>
            {(c: Concept) => (
              <ComboboxItem key={c.id} value={c}>
                <span className="search-result-name">{name(c.name)}</span>
                <span className="small-number">{t.search.pieces(c.elements.length)}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="search-note">{query ? t.search.limited(MAX_RESULTS) : t.search.hint}</p>
    </section>
  );
}
