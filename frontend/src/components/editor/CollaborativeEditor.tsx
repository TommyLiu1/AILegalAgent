/**
 * Simple Rich Text Editor Component
 *
 * Basic collaborative editor with TipTap
 * Features:
 * - Rich text editing (bold, italic, headings, lists)
 * - Basic collaboration support
 * - Comments system
 * - AI assist
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Undo, Redo,
  Users, MessageSquare, Sparkles,
  Save, Download, Eye, Edit3,
  Clock, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface EditorUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface EditorComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  position: { from: number; to: number };
  timestamp: Date;
  resolved: boolean;
}

export interface CollaborativeEditorProps {
  documentId: string;
  user: EditorUser;
  initialContent?: string;
  readOnly?: boolean;
  onChange?: (content: string, html: string) => void;
  onSave?: () => Promise<void>;
  showAIAssist?: boolean;
  onAIAssist?: (content: string) => Promise<string>;
  wsUrl?: string;
  onCommentAdd?: (comment: Omit<EditorComment, 'id' | 'timestamp'>) => void;
  onCommentResolve?: (commentId: string) => void;
}

// ==================== Helper Functions ====================

function getUserColor(name: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B500', '#FF6F61', '#6B5B95', '#88B04B'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ==================== Toolbar Button Component ====================

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, active, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-all',
        'hover:bg-gray-100 active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-blue-100 text-blue-600'
      )}
    >
      {children}
    </button>
  );
}

// ==================== Main Editor Component ====================

export function CollaborativeEditor({
  documentId,
  user,
  initialContent,
  readOnly = false,
  onChange,
  onSave,
  showAIAssist = true,
  onAIAssist,
  wsUrl = 'ws://localhost:1234',
  onCommentAdd,
  onCommentResolve,
}: CollaborativeEditorProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const [connectedUsers, setConnectedUsers] = useState<EditorUser[]>([user]);
  const [comments, setComments] = useState<EditorComment[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAIAssisting, setIsAIAssisting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Get Y.js fragment
  const yXmlFragment = useMemo(() => ydoc.getXmlFragment('prosemirror'), [ydoc]);

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse w-full',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: undefined, // Will be set up with WebSocket
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange?.(text, html);

      // Auto save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    },
  });

  // Save document
  const handleSave = async () => {
    if (!editor || isSaving) return;
    setIsSaving(true);
    try {
      await onSave?.();
      setLastSaved(new Date());
      toast.success('Document saved');
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Assist
  const handleAIAssist = async () => {
    if (!editor || isAIAssisting || !onAIAssist) return;

    const content = editor.getText();
    if (content.length < 10) {
      toast.error('Content too short to optimize');
      return;
    }

    setIsAIAssisting(true);
    try {
      const optimized = await onAIAssist(content);
      editor.commands.setContent(optimized);
      toast.success('AI optimization complete');
    } catch (error) {
      toast.error('AI optimization failed');
    } finally {
      setIsAIAssisting(false);
    }
  };

  // Add comment
  const handleAddComment = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText) {
      toast.error('Please select text to comment');
      return;
    }

    const comment = window.prompt('Enter comment:');
    if (!comment) return;

    const newComment: EditorComment = {
      id: `comment-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      content: comment,
      position: { from, to },
      timestamp: new Date(),
      resolved: false,
    };

    setComments([...comments, newComment]);
    onCommentAdd?.(newComment);
    toast.success('Comment added');
  };

  // Download document
  const handleDownload = () => {
    if (!editor) return;

    const html = editor.getHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentId}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Document downloaded');
  };

  const characterCount = editor ? (editor as any).storage.characterCount.characters() : 0;
  const wordCount = editor ? (editor as any).storage.characterCount.words() : 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap bg-gray-50">
        {/* History */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor?.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive('heading', { level:2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Format */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Collaborators */}
        <div className="flex items-center gap-1 ml-auto">
          {connectedUsers.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex -space-x-1">
                {connectedUsers.slice(0, 3).map((u) => (
                  <div
                    key={u.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                    style={{ backgroundColor: u.color }}
                    title={u.name}
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
                {connectedUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                    +{connectedUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Assist */}
          {onAIAssist && !readOnly && (
            <ToolbarButton
              onClick={handleAIAssist}
              disabled={isAIAssisting}
              title="AI Optimize"
            >
              <Sparkles className={cn('w-4 h-4', isAIAssisting && 'animate-spin')} />
            </ToolbarButton>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{characterCount} characters</span>
          <span>{wordCount} words</span>
          {lastSaved && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastSaved.toLocaleTimeString()} saved
            </span>
          )}
          {isSaving && <span className="text-blue-600">Saving...</span>}
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={() => setShowComments(!showComments)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors',
                  showComments && 'bg-gray-200'
                )}
                title="Comments"
              >
                <MessageSquare className="w-4 h-4" />
                {comments.filter((c) => !c.resolved).length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">
                    {comments.filter((c) => !c.resolved).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors',
                  showPreview && 'bg-gray-200'
                )}
                title="Preview"
              >
                {showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn('flex-1 overflow-auto', showComments && 'pr-80')}>
          <div className={cn(
            'max-w-4xl mx-auto p-8',
            showPreview && 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto'
          )}>
            <AnimatePresence>
              {!editor && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="text-center text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>Loading editor...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {editor && (
              <EditorContent
                editor={editor}
                className={cn(
                  'min-h-full focus:outline-none',
                  !showPreview && 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none'
                )}
              />
            )}
          </div>
        </div>

        {/* Comments sidebar */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Comments</h3>
                  {!readOnly && (
                    <button
                      onClick={handleAddComment}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={cn(
                          'p-3 rounded-lg border',
                          comment.resolved
                            ? 'bg-gray-100 border-gray-200 opacity-60'
                            : 'bg-yellow-50 border-yellow-200'
                        )}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-sm text-gray-800">{comment.userName}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{comment.content}</p>
                        {!comment.resolved && user.id === comment.userId && onCommentResolve && (
                          <button
                            onClick={() => {
                              onCommentResolve(comment.id);
                              setComments(comments.map((c) =>
                                c.id === comment.id ? { ...c, resolved: true } : c
                              ));
                            }}
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            Mark as resolved
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==================== Simple Editor (No Collaboration) ====================

export interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  onSave?: () => void;
}

export function SimpleEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  onSave,
}: SimpleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      {!readOnly && (
        <div className="border-b border-gray-200 p-2 flex items-center gap-1 bg-gray-50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          {onSave && (
            <>
              <div className="flex-1" />
              <button
                onClick={onSave}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Save
              </button>
            </>
          )}
        </div>
      )}

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4 min-h-[200px]"
      />
    </div>
  );
}
