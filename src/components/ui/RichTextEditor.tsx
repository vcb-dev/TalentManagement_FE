import { useRef } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link2,
  ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadImageFile(file: File, uploadUrl: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  const url = uploadUrl.startsWith('http')
    ? uploadUrl
    : `${base}${uploadUrl.startsWith('/') ? uploadUrl : `/${uploadUrl}`}`
  const token = useAuthStore.getState().accessToken
  const res = await fetch(url, {
    method: 'POST',
    body: fd,
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error('Upload failed')
  const json = await res.json()
  return json.url as string
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        active
          ? 'bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({ editor, imageUploadUrl }: { editor: Editor; imageUploadUrl?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    if (!imageUploadUrl) {
      // Fallback: base64 embed
      const reader = new FileReader()
      reader.onload = () => {
        editor
          .chain()
          .focus()
          .setImage({ src: reader.result as string })
          .run()
      }
      reader.readAsDataURL(file)
      return
    }
    try {
      const url = await uploadImageFile(file, imageUploadUrl)
      editor.chain().focus().setImage({ src: url }).run()
    } catch {
      // silent
    }
  }

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Nhập URL liên kết:', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/60">
      {/* History */}
      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Hoàn tác"
      >
        <Undo className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Làm lại"
      >
        <Redo className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Headings */}
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Tiêu đề 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Tiêu đề 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Tiêu đề 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Text style */}
      <Btn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Đậm (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Nghiêng (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Gạch dưới (Ctrl+U)"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Gạch ngang"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Alignment */}
      <Btn
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="Căn trái"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="Căn giữa"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="Căn phải"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Lists */}
      <Btn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Danh sách"
      >
        <List className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Danh sách số"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Link & Image */}
      <Btn onClick={setLink} active={editor.isActive('link')} title="Chèn liên kết">
        <Link2 className="h-3.5 w-3.5" />
      </Btn>
      <Btn onClick={() => fileRef.current?.click()} title="Chèn ảnh">
        <ImageIcon className="h-3.5 w-3.5" />
      </Btn>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleImageUpload(file)
            e.target.value = ''
          }
        }}
      />
    </div>
  )
}

// ─── RichTextEditor ───────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  value: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
  imageUploadUrl?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  minHeight = 140,
  imageUploadUrl,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded my-2' } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. after data loads from API)
  if (editor && !editor.isFocused) {
    const current = editor.getHTML()
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '')
    }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        !readOnly &&
          'focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:border-blue-500',
        readOnly && 'bg-slate-50 dark:bg-slate-900/60',
        className
      )}
    >
      {editor && !readOnly && <Toolbar editor={editor} imageUploadUrl={imageUploadUrl} />}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none px-3 py-2 text-slate-900 dark:text-slate-100',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded'
        )}
        style={{ minHeight }}
      />
    </div>
  )
}
