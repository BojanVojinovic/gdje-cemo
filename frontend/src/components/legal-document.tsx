import type { LegalDoc } from "@/lib/legal/types";

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl text-ink">{doc.title}</h1>
      <p className="mt-3 text-sm text-muted">{doc.updated}</p>
      <div className="mt-10 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="font-serif text-2xl text-ink">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-ink/85">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
