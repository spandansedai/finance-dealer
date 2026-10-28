/**
 * @file components/DocPage.tsx
 * @description Shared layout for long-form pages (privacy, terms, disclaimer):
 * the standard masthead, an optional highlighted summary, a sticky table of
 * contents, and numbered sections set in the `.doc` prose style. Keeps every
 * policy page on the same design as the rest of the app.
 */

import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Notice,
  PageHeader,
  PageShell,
  Stamp,
} from '@/components/ui';

export interface DocSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface DocPageProps {
  title: string;
  note: string;
  /** Human-readable "last updated" date shown in the masthead stamp. */
  updated: string;
  /** Short highlighted summary shown above the sections. */
  summary?: { title: string; body: React.ReactNode };
  sections: DocSection[];
}

export function DocPage({ title, note, updated, summary, sections }: DocPageProps) {
  return (
    <PageShell>
      <PageHeader
        title={title}
        back={{ href: '/', label: 'Dashboard' }}
        description={note}
        actions={<Stamp label="Updated" value={updated} />}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card as="nav" className="hidden lg:sticky lg:top-24 lg:block" aria-label="On this page">
          <CardHeader>
            <CardTitle>On this page</CardTitle>
          </CardHeader>
          <div className="toc p-2">
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span className="doc-num">{String(index + 1).padStart(2, '0')}</span>
                <span>{section.title}</span>
              </a>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          {summary && (
            <Notice tone="warn" className="block">
              <p className="font-semibold">{summary.title}</p>
              <div className="mt-1 text-ink-soft">{summary.body}</div>
            </Notice>
          )}

          {sections.map((section, index) => (
            <Card as="section" key={section.id} id={section.id} className="scroll-mt-24">
              <CardBody className="doc">
                <h2>
                  <span className="doc-num">{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </h2>
                {section.body}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

    </PageShell>
  );
}
