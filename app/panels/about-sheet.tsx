import { ArrowUpRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useI18n } from '../i18n';

export function AboutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const links = [
    { href: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html', label: t.about.license },
    {
      href: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
      label: t.about.original,
    },
    {
      href: 'https://academic.oup.com/nar/article/37/suppl_1/D782/1000752',
      label: t.about.publication,
    },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="about-sheet glass" closeLabel={t.detail.close}>
        <div className="eyebrow">{t.about.eyebrow}</div>
        <SheetTitle className="structure-title">{t.about.title}</SheetTitle>
        <SheetDescription>{t.about.description}</SheetDescription>
        <div className="about-copy">
          <p>
            <strong>{t.about.datasetTitle}</strong>
            <br />
            {t.about.dataset}
          </p>
          <p>{t.about.scope}</p>
          <p>{t.about.disclaimer}</p>
          <h3>{t.about.sourceHeading}</h3>
          <p>{t.about.source}</p>
          {links.map(({ href, label }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer">
              {label} <ArrowUpRight size={14} />
            </a>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
