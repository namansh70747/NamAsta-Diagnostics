import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Undo, Redo, RemoveFormatting, Baseline, Highlighter,
  Table as TableIcon, Rows, Columns, Trash2, Save, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FONTS = ['Helvetica Neue', 'Arial', 'Times New Roman', 'Georgia', 'Calibri', 'Courier New', 'Verdana', 'Tahoma'];
const SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];

/** Convert inline <svg> (the CBC histograms) to <img> data-URIs so they survive ProseMirror
 *  parsing (which drops unknown SVG nodes). They become editable/movable images in the editor. */
function svgsToImages(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('svg').forEach(svg => {
    try {
      const clone = svg.cloneNode(true) as SVGElement;
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const xml = new XMLSerializer().serializeToString(clone);
      const img = doc.createElement('img');
      img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml))));
      img.setAttribute('style', 'width:230px;height:auto;display:block;');
      svg.replaceWith(img);
    } catch { /* leave as-is */ }
  });
  return doc.body.innerHTML;
}

/** A genuine rich-text editor (TipTap / ProseMirror) for the report. Unlike raw contentEditable
 *  + execCommand (which is unreliable in the WebView), ProseMirror owns its editing surface, so
 *  Ctrl/Cmd+A, typing, selection and every formatting command work consistently. */
export function ReportRichEditor({
  initialHtml, onSave, onCancel,
}: {
  initialHtml: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle, Color, FontFamily, FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true } }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: svgsToImages(initialHtml),
    editorProps: {
      attributes: { class: 'report-tiptap focus:outline-none' },
    },
  });

  if (!editor) return null;

  const chain = () => editor.chain().focus();
  const Sep = () => <span className="mx-1 h-5 w-px bg-[#e6e7ee]" />;
  const Btn = ({ onAction, active, title, children }: { onAction: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button" title={title}
      onMouseDown={e => { e.preventDefault(); onAction(); }}
      className={cn("h-7 min-w-7 px-1 inline-flex items-center justify-center rounded-md transition-colors select-none",
        active ? "bg-[#eef0fe] text-[#4f46e5]" : "text-[#34353f] hover:bg-[#eef0fe] hover:text-[#4f46e5]")}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div
        onMouseDown={e => e.preventDefault()}
        className="sticky top-0 z-30 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-[#e6e7ee] bg-white px-2 py-1.5 shadow-sm print:hidden"
      >
        <Btn title="Undo" onAction={() => chain().undo().run()}><Undo size={15} /></Btn>
        <Btn title="Redo" onAction={() => chain().redo().run()}><Redo size={15} /></Btn>
        <Sep />

        <select title="Font" defaultValue="" onMouseDown={e => e.stopPropagation()}
          onChange={e => { chain().setFontFamily(e.target.value).run(); e.currentTarget.value = ''; }}
          className="h-7 rounded-md border border-[#e6e7ee] bg-white px-1.5 text-[12px] cursor-pointer">
          <option value="" disabled>Font</option>
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select title="Size" defaultValue="" onMouseDown={e => e.stopPropagation()}
          onChange={e => { chain().setFontSize(`${e.target.value}px`).run(); e.currentTarget.value = ''; }}
          className="h-7 w-14 rounded-md border border-[#e6e7ee] bg-white px-1 text-[12px] cursor-pointer">
          <option value="" disabled>Size</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Sep />

        <Btn title="Bold" active={editor.isActive('bold')} onAction={() => chain().toggleBold().run()}><Bold size={15} /></Btn>
        <Btn title="Italic" active={editor.isActive('italic')} onAction={() => chain().toggleItalic().run()}><Italic size={15} /></Btn>
        <Btn title="Underline" active={editor.isActive('underline')} onAction={() => chain().toggleUnderline().run()}><UnderlineIcon size={15} /></Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')} onAction={() => chain().toggleStrike().run()}><Strikethrough size={15} /></Btn>
        <Sep />

        <label title="Text colour" onMouseDown={e => e.preventDefault()}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-[#eef0fe] cursor-pointer relative">
          <Baseline size={15} />
          <input type="color" defaultValue="#b91c1c" onMouseDown={e => e.stopPropagation()}
            onInput={e => chain().setColor((e.target as HTMLInputElement).value).run()}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>
        <label title="Highlight" onMouseDown={e => e.preventDefault()}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-[#eef0fe] cursor-pointer relative">
          <Highlighter size={15} />
          <input type="color" defaultValue="#fde047" onMouseDown={e => e.stopPropagation()}
            onInput={e => chain().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>
        <Sep />

        <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onAction={() => chain().setTextAlign('left').run()}><AlignLeft size={15} /></Btn>
        <Btn title="Align centre" active={editor.isActive({ textAlign: 'center' })} onAction={() => chain().setTextAlign('center').run()}><AlignCenter size={15} /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onAction={() => chain().setTextAlign('right').run()}><AlignRight size={15} /></Btn>
        <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onAction={() => chain().setTextAlign('justify').run()}><AlignJustify size={15} /></Btn>
        <Sep />

        <Btn title="Bullet list" active={editor.isActive('bulletList')} onAction={() => chain().toggleBulletList().run()}><List size={15} /></Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onAction={() => chain().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
        <Sep />

        {/* Table editing */}
        <Btn title="Insert table" onAction={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={15} /></Btn>
        <Btn title="Add row below" onAction={() => chain().addRowAfter().run()}><Rows size={15} /></Btn>
        <Btn title="Add column right" onAction={() => chain().addColumnAfter().run()}><Columns size={15} /></Btn>
        <Btn title="Delete row" onAction={() => chain().deleteRow().run()}><Trash2 size={14} /></Btn>
        <Sep />

        <Btn title="Clear formatting" onAction={() => chain().unsetAllMarks().run()}><RemoveFormatting size={15} /></Btn>

        <div className="ml-auto flex items-center gap-1.5">
          <button onMouseDown={e => e.preventDefault()} onClick={() => onSave(editor.getHTML())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white btn-success">
            <Save size={14} /> Save
          </button>
          <button onMouseDown={e => e.preventDefault()} onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#54555f] border border-[#e6e7ee] hover:bg-[#fafafe]">
            <X size={14} /> Cancel
          </button>
        </div>
      </div>

      {/* The editable document */}
      <EditorContent editor={editor} />
    </div>
  );
}
