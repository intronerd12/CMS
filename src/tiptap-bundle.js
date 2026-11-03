import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

const StarterKitExt = StarterKit && StarterKit.default ? StarterKit.default : StarterKit;
const HighlightExt = Highlight && Highlight.default ? Highlight.default : Highlight;
const ImageExt = Image && Image.default ? Image.default : Image;
const TextAlignExt = TextAlign && TextAlign.default ? TextAlign.default : TextAlign;
const UnderlineExt = Underline && Underline.default ? Underline.default : Underline;
const LinkExt = Link && Link.default ? Link.default : Link;

function createTipTapEditor(options = {}) {
    const {
        element,
        toolbar,
        content = '',
        placeholder = 'Start typing rich content...',
        compact = false,
        onChange = null
    } = options;

    if (!element) {
        console.warn('createTipTapEditor: No element specified.');
        return null;
    }

    const extensions = [
        StarterKitExt.configure({
            heading: {
                levels: [1, 2, 3]
            },
            codeBlock: {
                HTMLAttributes: {
                    class: 'tiptap-code-block'
                }
            }
        }),
        HighlightExt.configure({ multicolor: true }),
        UnderlineExt,
        LinkExt.configure({
            openOnClick: false,
            HTMLAttributes: {
                class: 'tiptap-link',
                target: '_blank',
                rel: 'noopener noreferrer'
            }
        }),
        ImageExt.configure({
            inline: false,
            allowBase64: true,
            HTMLAttributes: {
                class: 'tiptap-image'
            }
        }),
        TextAlignExt.configure({
            types: ['heading', 'paragraph']
        })
    ];

    const editor = new Editor({
        element,
        extensions,
        content: content || '',
        autofocus: false,
        editable: true,
        editorProps: {
            attributes: {
                class: `tiptap-content prose ${compact ? 'tiptap-compact' : ''}`,
                'data-placeholder': placeholder
            }
        },
        onUpdate({ editor }) {
            updateToolbarActiveStates(editor, toolbar);
            if (typeof onChange === 'function') {
                onChange(editor.getHTML(), editor);
            }
        },
        onSelectionUpdate({ editor }) {
            updateToolbarActiveStates(editor, toolbar);
        }
    });

    if (toolbar) {
        bindToolbarEvents(editor, toolbar, compact);
        updateToolbarActiveStates(editor, toolbar);
    }

    return editor;
}

function updateToolbarActiveStates(editor, toolbarEl) {
    if (!toolbarEl || !editor) return;
    const buttons = toolbarEl.querySelectorAll('[data-action]');
    buttons.forEach(btn => {
        const action = btn.getAttribute('data-action');
        let isActive = false;

        switch (action) {
            case 'bold':
                isActive = editor.isActive('bold');
                break;
            case 'italic':
                isActive = editor.isActive('italic');
                break;
            case 'underline':
                isActive = editor.isActive('underline');
                break;
            case 'strike':
                isActive = editor.isActive('strike');
                break;
            case 'highlight':
                isActive = editor.isActive('highlight');
                break;
            case 'code':
                isActive = editor.isActive('code');
                break;
            case 'codeBlock':
                isActive = editor.isActive('codeBlock');
                break;
            case 'h1':
                isActive = editor.isActive('heading', { level: 1 });
                break;
            case 'h2':
                isActive = editor.isActive('heading', { level: 2 });
                break;
            case 'h3':
                isActive = editor.isActive('heading', { level: 3 });
                break;
            case 'bulletList':
                isActive = editor.isActive('bulletList');
                break;
            case 'orderedList':
                isActive = editor.isActive('orderedList');
                break;
            case 'blockquote':
                isActive = editor.isActive('blockquote');
                break;
            case 'alignLeft':
                isActive = editor.isActive({ textAlign: 'left' });
                break;
            case 'alignCenter':
                isActive = editor.isActive({ textAlign: 'center' });
                break;
            case 'alignRight':
                isActive = editor.isActive({ textAlign: 'right' });
                break;
        }

        if (isActive) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
}

function bindToolbarEvents(editor, toolbarEl, compact) {
    if (!toolbarEl || !editor) return;

    toolbarEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const action = btn.getAttribute('data-action');
        switch (action) {
            case 'bold':
                editor.chain().focus().toggleBold().run();
                break;
            case 'italic':
                editor.chain().focus().toggleItalic().run();
                break;
            case 'underline':
                editor.chain().focus().toggleUnderline().run();
                break;
            case 'strike':
                editor.chain().focus().toggleStrike().run();
                break;
            case 'highlight':
                editor.chain().focus().toggleHighlight().run();
                break;
            case 'code':
                editor.chain().focus().toggleCode().run();
                break;
            case 'codeBlock':
                editor.chain().focus().toggleCodeBlock().run();
                break;
            case 'h1':
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                break;
            case 'h2':
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
            case 'h3':
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                break;
            case 'bulletList':
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'orderedList':
                editor.chain().focus().toggleOrderedList().run();
                break;
            case 'blockquote':
                editor.chain().focus().toggleBlockquote().run();
                break;
            case 'alignLeft':
                editor.chain().focus().setTextAlign('left').run();
                break;
            case 'alignCenter':
                editor.chain().focus().setTextAlign('center').run();
                break;
            case 'alignRight':
                editor.chain().focus().setTextAlign('right').run();
                break;
            case 'clearFormat':
                editor.chain().focus().unsetAllMarks().clearNodes().run();
                break;
            case 'undo':
                editor.chain().focus().undo().run();
                break;
            case 'redo':
                editor.chain().focus().redo().run();
                break;
            case 'link': {
                const prevUrl = editor.getAttributes('link').href;
                const url = window.prompt('Enter link URL (e.g. https://example.com):', prevUrl || 'https://');
                if (url === null) return;
                if (url === '') {
                    editor.chain().focus().unsetLink().run();
                } else {
                    editor.chain().focus().setLink({ href: url }).run();
                }
                break;
            }
            case 'image': {
                const url = window.prompt('Enter image URL (or paste image URL):', 'https://');
                if (url && url !== 'https://') {
                    editor.chain().focus().setImage({ src: url }).run();
                }
                break;
            }
        }
        updateToolbarActiveStates(editor, toolbarEl);
    });
}

function renderToolbarHtml(toolbarId, options = {}) {
    const isCompact = options.compact === true;
    return `
        <div class="tiptap-toolbar ${isCompact ? 'tiptap-toolbar-compact' : ''}" id="${toolbarId}" role="toolbar" aria-label="Rich Text Formatting">
            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="bold" title="Bold (Ctrl+B)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="italic" title="Italic (Ctrl+I)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="underline" title="Underline (Ctrl+U)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="highlight" title="Highlight Marker">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 11-6 6v3h3l6-6"/><path d="m22 2-2.5 2.5a2.12 2.12 0 0 1-3 0l-1.5-1.5a2.12 2.12 0 0 1 0-3L17.5 0a2.12 2.12 0 0 1 3 0L22 2z"/><line x1="12" y1="8" x2="16" y2="12"/></svg>
                </button>
            </div>

            <div class="tiptap-divider"></div>

            ${!isCompact ? `
            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="h1" title="Heading 1">H1</button>
                <button type="button" class="tiptap-btn" data-action="h2" title="Heading 2">H2</button>
                <button type="button" class="tiptap-btn" data-action="h3" title="Heading 3">H3</button>
            </div>
            <div class="tiptap-divider"></div>
            ` : ''}

            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="code" title="Inline Code">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="codeBlock" title="Code Block Snippet">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 10 6 12 8 14"/><polyline points="16 10 18 12 16 14"/><line x1="12" y1="9" x2="12" y2="15"/></svg>
                </button>
            </div>

            <div class="tiptap-divider"></div>

            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="bulletList" title="Bullet List">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="orderedList" title="Numbered List">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                </button>
                ${!isCompact ? `
                <button type="button" class="tiptap-btn" data-action="blockquote" title="Quote Callout">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>
                </button>
                ` : ''}
            </div>

            ${!isCompact ? `
            <div class="tiptap-divider"></div>

            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="alignLeft" title="Align Left">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="alignCenter" title="Align Center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="alignRight" title="Align Right">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
                </button>
            </div>

            <div class="tiptap-divider"></div>

            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="link" title="Insert Link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="image" title="Insert Image">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
            </div>
            ` : ''}

            <div class="tiptap-divider"></div>

            <div class="tiptap-btn-group">
                <button type="button" class="tiptap-btn" data-action="undo" title="Undo (Ctrl+Z)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="redo" title="Redo (Ctrl+Y)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
                <button type="button" class="tiptap-btn" data-action="clearFormat" title="Clear Formatting">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
    `;
}

window.TipTap = {
    Editor,
    StarterKit: StarterKitExt,
    Highlight: HighlightExt,
    Image: ImageExt,
    TextAlign: TextAlignExt,
    Underline: UnderlineExt,
    Link: LinkExt,
    createTipTapEditor,
    renderToolbarHtml
};
