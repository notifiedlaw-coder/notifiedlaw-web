import { Icon } from "@/components/icons";
import { Btn, Page, Title, cardCls } from "@/components/ui";

export const metadata = { title: "My Files" };

// Uploads are not built yet: the screen is in place, with every control disabled.
export default function Page_() {
  return (
    <Page>
      <Title
        title="My Files"
        sub="Lecture notes, past papers and your own answers, in one place."
        right={<div className="flex gap-2"><Btn tone="plain" disabled>New folder</Btn><Btn disabled>Upload PDF or Word</Btn></div>}
      />
      <div className="rounded-xl bg-surface px-4 py-3 shadow-card">
        <div className="flex justify-between text-xs"><span className="font-semibold">Storage</span><span className="text-muted">0 MB of 500 MB</span></div>
        <div className="mt-2 h-1 rounded-sm bg-track" />
      </div>
      <div className="flex flex-wrap items-center gap-2 opacity-50">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-[10px] bg-surface px-3 shadow-[0_0_0_0.5px_var(--hairline)]">
          <Icon name="search" size={14} className="text-faint" />
          <input disabled placeholder="Search your files" aria-label="Search your files" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
        {["All", "Folders", "PDF", "DOCX"].map((x, i) => (
          <button key={x} type="button" disabled className={`h-[26px] rounded-full px-3 text-xs font-medium ${i === 0 ? "bg-strong text-strong-fg" : "bg-surface text-ink shadow-[0_0_0_0.5px_var(--hairline)]"}`}>{x}</button>
        ))}
      </div>
      <div className={`${cardCls} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-blue/10 text-blue"><Icon name="folder" size={20} /></span>
        <div className="text-[15px] font-semibold">Coming soon</div>
        <div className="max-w-[420px] text-[13px] text-muted">Upload PDFs and Word documents and keep them organised in folders. This feature is on its way.</div>
      </div>
    </Page>
  );
}
