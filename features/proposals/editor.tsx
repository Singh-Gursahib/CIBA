"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import { SlashMenu } from "./slash-menu";
import { EditorBubbleMenu } from "./bubble-menu";
import { useToast } from "@/components/ui/toast";

/** tiptap-markdown augments editor.storage but ships no types; read it safely. */
function getMarkdown(editor: Editor): string {
  return (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() ?? "";
}

export function ProposalEditor({
  slug,
  initialMarkdown,
  onMarkdownChange,
  registerGetMarkdown,
}: {
  slug: string;
  initialMarkdown: string;
  onMarkdownChange: (md: string) => void;
  registerGetMarkdown?: (fn: () => string) => void;
}) {
  const toast = useToast();
  const [aiBusy, setAiBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing, or press / for blocks…" }),
      Typography,
      TableKit.configure({ table: { resizable: false } }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: initialMarkdown,
    editorProps: {
      attributes: { class: "prose-ciba max-w-none focus:outline-none min-h-[60vh]" },
    },
    onUpdate: ({ editor }) => {
      onMarkdownChange(getMarkdown(editor));
    },
  });

  useEffect(() => {
    if (editor && registerGetMarkdown) {
      registerGetMarkdown(() => getMarkdown(editor));
    }
  }, [editor, registerGetMarkdown]);

  // Load markdown into the editor (round-trip).
  useEffect(() => {
    if (editor && initialMarkdown && editor.isEmpty) {
      editor.commands.setContent(initialMarkdown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const runSelectionAi = async (instruction: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, "\n");
    if (!text.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch(`/api/proposals/${slug}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "selection", text, instruction }),
      });
      const data = await res.json();
      if (data.text) {
        editor.chain().focus().insertContentAt({ from, to }, data.text).run();
        toast("success", "Rewrote selection");
      } else {
        toast("error", "Rewrite failed");
      }
    } catch {
      toast("error", "Rewrite failed");
    } finally {
      setAiBusy(false);
    }
  };

  if (!editor) return null;

  return (
    <div ref={containerRef} className="relative">
      <EditorBubbleMenu editor={editor} onAi={runSelectionAi} aiBusy={aiBusy} />
      <SlashMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
