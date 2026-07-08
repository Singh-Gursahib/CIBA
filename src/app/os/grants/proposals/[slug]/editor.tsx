"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  ArrowLeft,
  Download,
  FileDown,
  History,
  Wand2,
  Loader2,
  Check,
  Eye,
  Pencil,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { ProposalMeta } from "@/lib/os/grants/types";

type SaveState = "idle" | "saving" | "saved";

/** tiptap-markdown augments editor.storage but ships no types; read it safely. */
function getMarkdown(editor: Editor): string {
  return (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() ?? "";
}

/** Shared prose styling so the editor surface matches the old preview pane. */
const PROSE =
  "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[70vh] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-ink [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:text-sm [&_p]:text-ink/85 [&_p]:my-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:space-y-1 [&_li]:text-ink/85 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink/70 [&_blockquote]:italic [&_pre]:bg-bg [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_pre]:overflow-auto [&_code]:text-xs [&_table]:w-full [&_table]:text-xs [&_table]:my-3 [&_th]:border [&_th]:border-line [&_th]:bg-bg [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-line [&_td]:p-2 [&_strong]:font-semibold [&_.is-editor-empty:first-child::before]:text-muted/60 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]";

export function ProposalEditor({ slug, meta, initial }: { slug: string; meta: ProposalMeta; initial: string }) {
  const toast = useToast();
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [save, setSave] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<{ id: string; savedAt: string }[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (text: string) => {
    setSave("saving");
    await fetch(`/api/os/proposals/${slug}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    }).catch(() => {});
    setSave("saved");
  }, [slug]);

  const scheduleSave = useCallback((text: string) => {
    setSave("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(text), 1200);
  }, [persist]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing your proposal…  Use the toolbar for headings, lists and formatting." }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: initial,
    editorProps: { attributes: { class: "prose-ciba max-w-none" } },
    onUpdate: ({ editor }) => scheduleSave(getMarkdown(editor)),
  });

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { editor?.setEditable(view === "edit"); }, [editor, view]);

  const rewrite = async (scope: "selection" | "document", instruction: string) => {
    if (!editor) return;
    let target: string;
    let range: { from: number; to: number } | null = null;
    if (scope === "selection") {
      const { from, to } = editor.state.selection;
      if (from === to) { toast("info", "Select some text first to rewrite it."); return; }
      range = { from, to };
      target = editor.state.doc.textBetween(from, to, "\n");
    } else {
      target = getMarkdown(editor);
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/os/proposals/${slug}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, text: target, instruction }),
      });
      const data = await res.json();
      if (!data.text) { toast("error", data.error ?? "Rewrite failed"); return; }
      if (range) {
        editor.chain().focus().insertContentAt(range, data.text).run();
      } else {
        editor.commands.setContent(data.text);
      }
      await persist(getMarkdown(editor));
      toast("success", "Rewritten.");
    } finally {
      setBusy(false);
    }
  };

  const loadVersions = async () => {
    const res = await fetch(`/api/os/proposals/${slug}/versions`);
    setVersions((await res.json()).versions ?? []);
  };
  const restore = async (id: string) => {
    const res = await fetch(`/api/os/proposals/${slug}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", id }),
    });
    const data = await res.json();
    if (data.content && editor) {
      editor.commands.setContent(data.content);
      await persist(getMarkdown(editor));
      setVersions(null);
      toast("success", "Version restored.");
    }
  };

  const canEdit = view === "edit" && !!editor;
  const btn = (active: boolean) => `btn btn-ghost !py-1 !px-2 text-xs ${active ? "!bg-bg !text-brand" : ""}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/os/grants" className="btn btn-ghost !py-1.5 !px-3 text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Grants</Link>
        <div className="min-w-0">
          <p className="font-semibold truncate">{meta.title}</p>
          <p className="text-[11px] text-muted">{meta.orgName ? `Proposal to ${meta.orgName}` : "Proposal"}</p>
        </div>
        <span className="text-[11px] text-muted flex items-center gap-1 ml-1">
          {save === "saving" ? <><Loader2 className="w-3 h-3 animate-spin" /> saving</> : save === "saved" ? <><Check className="w-3 h-3 text-brand" /> saved</> : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setView((v) => (v === "edit" ? "preview" : "edit"))}>
            {view === "edit" ? <><Eye className="w-3.5 h-3.5" /> Preview</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
          </button>
          <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={loadVersions}><History className="w-3.5 h-3.5" /> History</button>
          <a className="btn btn-ghost !py-1.5 !px-3 text-xs" href={`/api/os/proposals/${slug}/export/pdf`}><FileDown className="w-3.5 h-3.5" /> Export PDF</a>
          <a className="btn btn-primary !py-1.5 !px-3 text-xs" href={`/api/os/proposals/${slug}/export/docx`}><Download className="w-3.5 h-3.5" /> Export Word</a>
        </div>
      </div>

      {/* Formatting toolbar */}
      {canEdit && editor && (
        <div className="card p-1.5 flex items-center gap-0.5 flex-wrap">
          <button className={btn(editor.isActive("heading", { level: 1 }))} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-3.5 h-3.5" /></button>
          <button className={btn(editor.isActive("heading", { level: 2 }))} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-3.5 h-3.5" /></button>
          <button className={btn(editor.isActive("heading", { level: 3 }))} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-3.5 h-3.5" /></button>
          <span className="w-px h-4 bg-line mx-1" />
          <button className={btn(editor.isActive("bold"))} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><BoldIcon className="w-3.5 h-3.5" /></button>
          <button className={btn(editor.isActive("italic"))} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><ItalicIcon className="w-3.5 h-3.5" /></button>
          <button className={btn(editor.isActive("code"))} title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}><Code2 className="w-3.5 h-3.5" /></button>
          <span className="w-px h-4 bg-line mx-1" />
          <button className={btn(editor.isActive("bulletList"))} title="Bulleted list" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></button>
          <button className={btn(editor.isActive("orderedList"))} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></button>
          <button className={btn(editor.isActive("blockquote"))} title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* AI toolbar */}
      <div className="card p-2.5 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted flex items-center gap-1 font-medium"><Wand2 className="w-3.5 h-3.5 text-brand" /> AI:</span>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />}
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("selection", "Shorten and tighten this passage")}>Shorten selection</button>
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("selection", "Make this more formal and funder-appropriate")}>Formalize selection</button>
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("selection", "Expand this with concrete detail")}>Expand selection</button>
        <span className="w-px h-4 bg-line mx-1" />
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("document", "Tighten the whole proposal and strengthen weak sections, preserving structure")}>Polish whole document</button>
      </div>

      {/* Editor */}
      <div className={`card p-6 ${PROSE}`}>
        {editor && (
          <BubbleMenu editor={editor} className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-lg">
            <button className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><BoldIcon className="w-3.5 h-3.5" /></button>
            <button className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><ItalicIcon className="w-3.5 h-3.5" /></button>
            <button className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-3.5 h-3.5" /></button>
            <span className="w-px h-4 bg-line mx-1" />
            <button className="btn btn-ghost !py-1 !px-2 text-xs" disabled={busy} onClick={() => rewrite("selection", "Make this more formal and funder-appropriate")}><Wand2 className="w-3.5 h-3.5 text-brand" /></button>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Versions modal */}
      {versions && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setVersions(null)}>
          <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-3">Version history</p>
            {versions.length === 0 ? (
              <p className="text-sm text-muted">No saved versions yet. Versions are captured on export and restore.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="text-muted text-xs">{new Date(v.savedAt).toLocaleString("en-CA")}</span>
                    <button className="btn btn-ghost !py-1 !px-2.5 text-xs" onClick={() => restore(v.id)}>Restore</button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-right"><button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setVersions(null)}>Close</button></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge tone={meta.status === "exported" ? "green" : "gray"}>{meta.status}</Badge>
        <span className="text-[11px] text-muted">Autosaves as you type. Export captures a version snapshot.</span>
      </div>
    </div>
  );
}
