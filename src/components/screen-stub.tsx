// Placeholder for screens whose design is in the handoff but not yet ported.
export function ScreenStub({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-4 px-5 py-8 lg:px-10">
      <h1 className="text-3xl font-bold tracking-[-0.02em]">{title}</h1>
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-muted">
        Not ported yet. Design reference: <code>{source}</code>
      </div>
      {children}
    </div>
  );
}
