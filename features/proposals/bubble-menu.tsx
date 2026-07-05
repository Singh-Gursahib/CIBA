"use client";

import { useState } from "react";
import { type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Italic, Strikethrough, Code, Heading2, Heading3, List, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const AI_ACTIONS = [
  { key: "rewrite", label: "Rewrite" },
  { key: "shorten", label: "Shorten" },
  { key: "expand", label: "Expand" },
  { key: "formal", label: "More formal" },
  { key: "simplify", label: "Simplify" },
];

function Btn({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-river-tint text-river-deep" : "text-ink-soft hover:bg-surface-tint hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

export function EditorBubbleMenu({
  editor,
  onAi,
  aiBusy,
}: {
  editor: Editor;
  onAi: (instruction: string) => void;
  aiBusy: boolean;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-3"
    >
      {aiOpen ? (
        <div className="flex items-center gap-1 px-1">
          {aiBusy ? (
            <span className="flex items-center gap-2 px-2 py-1 text-[13px] text-ink-soft">
              <Loader2 className="size-3.5 animate-spin text-river" /> Rewriting…
            </span>
          ) : (
            <>
              {AI_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => onAi(a.label)}
                  className="rounded-md px-2 py-1 text-[13px] text-ink-soft hover:bg-surface-tint hover:text-ink"
                >
                  {a.label}
                </button>
              ))}
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim()) {
                    onAi(custom.trim());
                    setCustom("");
                  }
                }}
                placeholder="Custom instruction…"
                className="w-40 rounded-md border border-line bg-surface px-2 py-1 text-[13px] focus:border-river focus:outline-none"
              />
            </>
          )}
        </div>
      ) : (
        <>
          <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="size-3.5" />
          </Btn>
          <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="size-3.5" />
          </Btn>
          <Btn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="size-3.5" />
          </Btn>
          <Btn label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="size-3.5" />
          </Btn>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="size-3.5" />
          </Btn>
          <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="size-3.5" />
          </Btn>
          <Btn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="size-3.5" />
          </Btn>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <button
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-1 rounded-md bg-river-tint px-2 py-1 text-[13px] font-medium text-river-deep hover:bg-river/15"
          >
            <Sparkles className="size-3.5" /> AI
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
