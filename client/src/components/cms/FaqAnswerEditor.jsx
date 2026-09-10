import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";

export default function FaqAnswerEditor({
    value,
    onChange,
    disabled = false,
}) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Sesuaikan dengan format yang diizinkan backend.
                heading: false,
                blockquote: false,
                code: false,
                codeBlock: false,
                horizontalRule: false,
                strike: false,
                underline: false,
                link: {
                    openOnClick: false,
                    HTMLAttributes: {
                        target: "_blank",
                        rel: "noopener noreferrer",
                    },
                },
            }),
            TableKit,
        ],
        content: value || "",
        editable: !disabled,
        shouldRerenderOnTransaction: true,
        editorProps: {
            attributes: {
                class: "faq-answer-content",
                role: "textbox",
                "aria-label": "Jawaban FAQ",
                "aria-multiline": "true",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.isEmpty ? "" : editor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;

        const nextValue = value || "";

        if (editor.getHTML() !== nextValue) {
            editor.commands.setContent(nextValue, {
                emitUpdate: false,
            });
        }
    }, [editor, value]);

    useEffect(() => {
        if (editor) editor.setEditable(!disabled);
    }, [editor, disabled]);

    if (!editor) {
        return <p className="text-slate-500">Memuat editor...</p>;
    }

    function handleLink() {
        const previousUrl = editor.getAttributes("link").href || "";
        const input = window.prompt(
            "Masukkan tautan https:// atau mailto:. Kosongkan untuk menghapus tautan.",
            previousUrl
        );

        if (input === null) return;

        const url = input.trim();

        if (!url) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        if (!/^(https?:\/\/|mailto:)/i.test(url)) {
            window.alert("Gunakan tautan berawalan https://, http://, atau mailto:.");
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    }

    function toolbarButton(label, action, active = false) {
        return (
            <button
                key={label}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={action}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition
                    disabled:cursor-not-allowed disabled:opacity-50 ${active
                        ? "bg-blue-100 text-blue-700"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
            >
                {label}
            </button>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
                {toolbarButton(
                    "Tebal",
                    () => editor.chain().focus().toggleBold().run(),
                    editor.isActive("bold")
                )}

                {toolbarButton(
                    "Miring",
                    () => editor.chain().focus().toggleItalic().run(),
                    editor.isActive("italic")
                )}

                {toolbarButton(
                    "• Daftar",
                    () => editor.chain().focus().toggleBulletList().run(),
                    editor.isActive("bulletList")
                )}

                {toolbarButton(
                    "1. Daftar",
                    () => editor.chain().focus().toggleOrderedList().run(),
                    editor.isActive("orderedList")
                )}

                {toolbarButton("Tautan", handleLink, editor.isActive("link"))}

                {toolbarButton(
                    "Urungkan",
                    () => editor.chain().focus().undo().run()
                )}

                {toolbarButton(
                    "Ulangi",
                    () => editor.chain().focus().redo().run()
                )}
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}