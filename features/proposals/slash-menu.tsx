"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  Text,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Command {
  title: string;
  icon: React.ReactNode;
  keywords: string;
  run: (editor: Editor) => void;
}

const COMMANDS: Command[] = [
  { title: "Text", icon: <Text className="size-4" />, keywords: "paragraph body", run: (e) => e.chain().focus().setParagraph().run() },
  { title: "Heading 1", icon: <Heading1 className="size-4" />, keywords: "title h1", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "Heading 2", icon: <Heading2 className="size-4" />, keywords: "section h2", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "Heading 3", icon: <Heading3 className="size-4" />, keywords: "subsection h3", run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: "Bulleted list", icon: <List className="size-4" />, keywords: "unordered bullet", run: (e) => e.chain().focus().toggleBulletList().run() },
  { title: "Numbered list", icon: <ListOrdered className="size-4" />, keywords: "ordered numbered", run: (e) => e.chain().focus().toggleOrderedList().run() },
  { title: "Quote", icon: <Quote className="size-4" />, keywords: "blockquote", run: (e) => e.chain().focus().toggleBlockquote().run() },
  { title: "Code block", icon: <Code className="size-4" />, keywords: "code pre", run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { title: "Divider", icon: <Minus className="size-4" />, keywords: "hr rule separator", run: (e) => e.chain().focus().setHorizontalRule().run() },
];

/** Lightweight slash menu: opens when the line is just "/", filters as you type. */
export function SlashMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => c.title.toLowerCase().includes(q) || c.keywords.includes(q));
  }, [query]);

  useEffect(() => {
    const update = () => {
      const { state, view } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent;
      const match = /(?:^|\s)\/(\w*)$/.exec(textBefore.slice(0, $from.parentOffset));

      if (match && $from.parent.type.name === "paragraph") {
        const c = view.coordsAtPos($from.pos);
        const wrap = view.dom.getBoundingClientRect();
        setCoords({ top: c.bottom - wrap.top + 6, left: c.left - wrap.left });
        setQuery(match[1]);
        setOpen(true);
        setActive(0);
      } else {
        setOpen(false);
      }
    };
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const choose = useCallback(
    (cmd?: Command) => {
      if (!cmd) return;
      const { state } = editor;
      const { $from } = state.selection;
      const from = $from.pos - (query.length + 1);
      editor.chain().focus().deleteRange({ from, to: $from.pos }).run();
      cmd.run(editor);
      setOpen(false);
    },
    [editor, query]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); choose(filtered[active]); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  if (!open || !coords || filtered.length === 0) return null;

  return (
    <div
      className="absolute z-30 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-3 animate-scale-in"
      style={{ top: coords.top, left: coords.left }}
    >
      <ul className="max-h-72 overflow-y-auto p-1.5">
        {filtered.map((cmd, i) => (
          <li key={cmd.title}>
            <button
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(cmd)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px]",
                i === active ? "bg-river-tint text-ink" : "text-ink-soft hover:bg-surface-tint"
              )}
            >
              <span className="text-ink-faint">{cmd.icon}</span>
              {cmd.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
