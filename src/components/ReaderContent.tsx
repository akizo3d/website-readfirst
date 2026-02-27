interface ReaderContentProps {
  html: string;
}

export function ReaderContent({ html }: ReaderContentProps) {
  return (
    <main className="reader-content" aria-label="Document content">
      <article dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
