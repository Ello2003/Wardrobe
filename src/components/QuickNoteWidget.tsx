import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PenLine,
  X,
  Plus,
  Pin,
  Star,
  Check,
  Square,
  CheckSquare,
  Copy,
  Trash2,
  ShoppingBag,
  Sparkles,
  Search,
  ChevronDown,
  ArrowRight,
  MoveHorizontal,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { QuickNote, QuickNoteCategory } from '../types';
import { useWardrobe } from '../context/WardrobeContext';

const STORAGE_KEY = 'wardrobe_quick_notes';
const POSITION_KEY = 'wardrobe_quick_notes_position';

const INITIAL_NOTES: QuickNote[] = [
  {
    id: 'note-init-1',
    content: 'Check waist & inseam measurements before ordering bespoke trousers: 32W 31L',
    category: 'Fit & Sizing',
    isPinned: true,
    isCompleted: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'note-init-2',
    content: 'Pick up Barbour wax thornproof dressing for winter jacket reproofing',
    category: 'Care & Alteration',
    isPinned: false,
    isCompleted: false,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'note-init-3',
    content: 'Look out for vintage Braun SK4 or Teenage Engineering desk audio piece',
    category: 'Homeware & Tech',
    isPinned: false,
    isCompleted: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const CATEGORY_STYLES: Record<
  QuickNoteCategory,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  'Style Idea': {
    label: 'Style Idea',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  'To Buy': {
    label: 'To Buy',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  'Fit & Sizing': {
    label: 'Fit & Sizing',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  'Care & Alteration': {
    label: 'Care & Alteration',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  'Homeware & Tech': {
    label: 'Homeware & Tech',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  General: {
    label: 'General',
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    border: 'border-zinc-200',
    dot: 'bg-zinc-400',
  },
};

const CATEGORIES: QuickNoteCategory[] = [
  'Style Idea',
  'To Buy',
  'Fit & Sizing',
  'Care & Alteration',
  'Homeware & Tech',
  'General',
];

export const QuickNoteWidget: React.FC = () => {
  const { addShoppingItem } = useWardrobe();

  // Widget Open / Collapsed state
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'right' | 'left'>('right');

  // Input states
  const [noteContent, setNoteContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QuickNoteCategory>('Style Idea');
  const [isNotePinned, setIsNotePinned] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pinned' | 'done'>('active');

  // Editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Toast / feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notes collection
  const [notes, setNotes] = useState<QuickNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('Failed to parse saved quick notes:', err);
    }
    return INITIAL_NOTES;
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load preferred position
  useEffect(() => {
    try {
      const savedPos = localStorage.getItem(POSITION_KEY);
      if (savedPos === 'left' || savedPos === 'right') {
        setPosition(savedPos);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (err) {
      console.warn('Failed to persist quick notes to localStorage:', err);
    }
  }, [notes]);

  // Keyboard shortcut: Alt+N (or Option+N on Mac) to toggle quick note capture anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleToggleEvent = () => setIsOpen((prev) => !prev);
    const handleOpenEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-quick-notes', handleToggleEvent);
    window.addEventListener('open-quick-notes', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-quick-notes', handleToggleEvent);
      window.removeEventListener('open-quick-notes', handleOpenEvent);
    };
  }, [isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  const togglePosition = () => {
    const next = position === 'right' ? 'left' : 'right';
    setPosition(next);
    try {
      localStorage.setItem(POSITION_KEY, next);
    } catch {
      // ignore
    }
  };

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = noteContent.trim();
    if (!clean) return;

    const newNote: QuickNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      content: clean,
      category: selectedCategory,
      isPinned: isNotePinned,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteContent('');
    setIsNotePinned(false);
    showToast('Note captured!');
  };

  const handleToggleComplete = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isCompleted: !n.isCompleted, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast('Note deleted');
  };

  const handleStartEdit = (note: QuickNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = (id: string) => {
    const clean = editingContent.trim();
    if (clean) {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, content: clean, updatedAt: new Date().toISOString() } : n))
      );
    }
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleCopyNote = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
    }
  };

  const handleCopyToWishlist = (note: QuickNote) => {
    try {
      // Extract potential brand or item title from note
      const parts = note.content.split(':');
      let brand = 'Wishlist Piece';
      let name = note.content;

      if (parts.length > 1 && parts[0].trim().length < 30) {
        brand = parts[0].trim();
        name = parts.slice(1).join(':').trim();
      }

      addShoppingItem({
        brand,
        name,
        category: note.category === 'Homeware & Tech' ? 'Audio & Tech' : 'Tops',
        priority: 'Medium',
        status: 'To Buy',
        season: 'All-Season',
        estimatedPrice: 0,
        imageUrl: '',
        matchingWardrobeItemIds: [],
        reasonOrGap: `Captured via Quick Note Widget on ${new Date().toLocaleDateString()}`,
        notes: note.content,
        tags: ['quick-note', note.category.toLowerCase().replace(/[^a-z0-9]/g, '-')],
      });

      // Mark note as completed & converted
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id ? { ...n, isCompleted: true, convertedTo: 'shopping', updatedAt: new Date().toISOString() } : n
        )
      );

      showToast('Added to Wishlist pipeline!');
    } catch (err) {
      console.error('Failed to convert note to shopping item:', err);
      showToast('Could not convert to wishlist');
    }
  };

  const handleCopyAllActive = () => {
    const active = notes.filter((n) => !n.isCompleted);
    if (active.length === 0) {
      showToast('No active notes to copy');
      return;
    }
    const text = active.map((n) => `• [${n.category}] ${n.content}`).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`Copied ${active.length} active notes`);
    }
  };

  const handleClearCompleted = () => {
    const completedCount = notes.filter((n) => n.isCompleted).length;
    if (completedCount === 0) return;
    setNotes((prev) => prev.filter((n) => !n.isCompleted));
    showToast(`Cleared ${completedCount} completed notes`);
  };

  // Filtered and sorted notes
  const activeCount = useMemo(() => notes.filter((n) => !n.isCompleted).length, [notes]);
  const pinnedCount = useMemo(() => notes.filter((n) => n.isPinned && !n.isCompleted).length, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (activeFilter === 'active') {
      result = result.filter((n) => !n.isCompleted);
    } else if (activeFilter === 'pinned') {
      result = result.filter((n) => n.isPinned && !n.isCompleted);
    } else if (activeFilter === 'done') {
      result = result.filter((n) => n.isCompleted);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.content.toLowerCase().includes(q) || n.category.toLowerCase().includes(q)
      );
    }

    // Sort: pinned first, then newest
    return [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, activeFilter, searchQuery]);

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = Date.now();
      const diffSec = Math.floor((now - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed z-50 text-xs px-3.5 py-2 bg-[#1A1A1A] text-white rounded-md shadow-xl border border-[#3A3A35] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            position === 'right' ? 'bottom-20 right-6' : 'bottom-20 left-6'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C4A480]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Hover Widget Container */}
      <div
        className={`fixed z-40 transition-all duration-200 select-none ${
          position === 'right' ? 'bottom-5 right-5 sm:bottom-6 sm:right-6' : 'bottom-5 left-5 sm:bottom-6 sm:left-6'
        }`}
      >
        {/* COLLAPSED HOVER PILL / BUTTON */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-[#FAF9F6] text-[#1A1A1A] border border-[#D5D5D0] hover:border-[#8C7355] rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#8C7355]/40"
            title="Open Quick Notes (Alt+N)"
            aria-label="Open Quick Notes"
          >
            <div className="w-6 h-6 rounded-full bg-[#8C7355] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <PenLine className="w-3.5 h-3.5" />
            </div>

            <span className="text-xs font-serif font-bold tracking-tight text-[#1A1A1A]">
              Quick Notes
            </span>

            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#F3F2EE] text-[#8C7355] border border-[#E5E5E1] text-[10px] font-mono font-bold rounded-full">
                {activeCount}
              </span>
            )}

            {pinnedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={`${pinnedCount} pinned notes`} />
            )}

            <span className="hidden group-hover:inline-block text-[9px] font-mono text-[#8C7355] pl-0.5 font-medium">
              Alt+N
            </span>
          </button>
        )}

        {/* EXPANDED HOVER CAPTURE PANEL */}
        {isOpen && (
          <div className="w-[21.5rem] sm:w-[26rem] max-h-[85vh] sm:max-h-[35rem] bg-white border border-[#D5D5D0] shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1A1A1A]">
            {/* Header */}
            <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#E5E5E1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#8C7355] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <PenLine className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-serif font-bold tracking-tight text-[#1A1A1A]">
                    Quick Notes &amp; Scratchpad
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-[#767670]">
                      {activeCount} active {activeCount === 1 ? 'note' : 'notes'}
                    </span>
                    <span className="text-[10px] text-[#A5A5A0]">•</span>
                    <span className="text-[10px] font-mono text-[#8C7355]">Alt+N to toggle</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={togglePosition}
                  className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] rounded-md transition-colors cursor-pointer"
                  title={position === 'right' ? 'Dock to bottom-left' : 'Dock to bottom-right'}
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] rounded-md transition-colors cursor-pointer"
                  title="Minimize widget (Esc)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Note Input Box */}
            <form onSubmit={handleAddNote} className="p-3 bg-[#F8F7F4] border-b border-[#E5E5E1] space-y-2.5">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Capture a style thought, measurement, piece to find, or alteration note..."
                  className="w-full px-3 py-2 bg-white border border-[#D5D5D0] focus:border-[#8C7355] text-xs text-[#1A1A1A] placeholder-[#8C8C85] rounded-md focus:outline-none focus:ring-1 focus:ring-[#8C7355] resize-none leading-relaxed"
                />
              </div>

              {/* Category Pills & Submit Action */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const style = CATEGORY_STYLES[cat];
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? `${style.bg} ${style.text} ${style.border} font-bold shadow-2xs`
                            : 'bg-white text-[#767670] border-[#E5E5E1] hover:text-[#1A1A1A]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsNotePinned((prev) => !prev)}
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                      isNotePinned
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                        : 'bg-white text-[#767670] border-[#E5E5E1] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <Pin className={`w-3 h-3 ${isNotePinned ? 'fill-amber-500 text-amber-600' : ''}`} />
                    <span>{isNotePinned ? 'Pinned' : 'Pin Note'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!noteContent.trim()}
                    className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-medium rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Capture</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Filter Tabs & Search Header */}
            <div className="px-3 pt-2.5 pb-2 border-b border-[#E5E5E1] bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {(['active', 'all', 'pinned', 'done'] as const).map((filter) => {
                  const isSelected = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`text-[10px] font-mono capitalize px-2 py-1 rounded transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white font-semibold'
                          : 'text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F3F2EE]'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>

              {/* Micro Search Input */}
              <div className="relative w-28 sm:w-36">
                <input
                  type="text"
                  placeholder="Filter notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-6 pr-2 py-0.5 text-[11px] bg-[#F8F7F4] border border-[#E5E5E1] focus:border-[#8C7355] rounded focus:outline-none font-mono"
                />
                <Search className="w-3 h-3 text-[#9A9A95] absolute left-1.5 top-1.5" />
              </div>
            </div>

            {/* Scrollable Notes List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-zinc-100 max-h-[18rem] sm:max-h-[20rem]">
              {filteredNotes.length === 0 ? (
                <div className="py-8 text-center text-[#9A9A95] space-y-1">
                  <FileText className="w-7 h-7 mx-auto stroke-1 opacity-40 mb-1" />
                  <p className="text-xs font-serif text-[#767670]">No notes in this view</p>
                  <p className="text-[10px] font-mono">
                    {searchQuery ? 'Try clearing your search query' : 'Type a quick note in the field above'}
                  </p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const style = CATEGORY_STYLES[note.category] || CATEGORY_STYLES.General;
                  const isEditing = editingNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`pt-2.5 first:pt-0 group rounded-md p-2 transition-all ${
                        note.isCompleted ? 'bg-zinc-50/70 opacity-65' : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(note.id)}
                          className="mt-0.5 text-[#767670] hover:text-[#1A1A1A] transition-colors shrink-0 cursor-pointer"
                          title={note.isCompleted ? 'Mark active' : 'Mark completed'}
                        >
                          {note.isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A5A5A0] hover:text-[#1A1A1A]" />
                          )}
                        </button>

                        {/* Note Content / Editing */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="w-full p-1.5 text-xs bg-white border border-[#8C7355] rounded focus:outline-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteId(null)}
                                  className="text-[10px] font-mono px-2 py-0.5 text-[#767670] hover:text-[#1A1A1A]"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(note.id)}
                                  className="text-[10px] font-mono px-2 py-0.5 bg-[#8C7355] text-white rounded"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p
                                onDoubleClick={() => handleStartEdit(note)}
                                className={`text-xs leading-relaxed break-words ${
                                  note.isCompleted
                                    ? 'line-through text-[#767670]'
                                    : 'text-[#1A1A1A] font-normal'
                                }`}
                              >
                                {note.content}
                              </p>

                              {/* Badges & Timestamp */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                                >
                                  {note.category}
                                </span>

                                {note.isPinned && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                                    <Pin className="w-2.5 h-2.5 fill-amber-500" />
                                    Pinned
                                  </span>
                                )}

                                {note.convertedTo === 'shopping' && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                    <ShoppingBag className="w-2.5 h-2.5" />
                                    In Wishlist
                                  </span>
                                )}

                                <span className="text-[9px] font-mono text-[#9A9A95] flex items-center gap-0.5 ml-auto">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTimestamp(note.createdAt)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Note Actions on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                          {/* Pin Toggle */}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(note.id)}
                            className={`p-1 rounded hover:bg-[#EAE8E3] transition-colors cursor-pointer ${
                              note.isPinned ? 'text-amber-600' : 'text-[#9A9A95] hover:text-[#1A1A1A]'
                            }`}
                            title={note.isPinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className={`w-3 h-3 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                          </button>

                          {/* Convert to Wishlist */}
                          <button
                            type="button"
                            onClick={() => handleCopyToWishlist(note)}
                            className="p-1 rounded text-[#9A9A95] hover:text-[#8C7355] hover:bg-[#EAE8E3] transition-colors cursor-pointer"
                            title="Add to Shopping Wishlist"
                          >
                            <ShoppingBag className="w-3 h-3" />
                          </button>

                          {/* Copy */}
                          <button
                            type="button"
                            onClick={() => handleCopyNote(note.content)}
                            className="p-1 rounded text-[#9A9A95] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            className="p-1 rounded text-[#9A9A95] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-3 py-2 bg-[#FAF9F6] border-t border-[#E5E5E1] flex items-center justify-between text-[11px] font-mono text-[#767670]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAllActive}
                  className="hover:text-[#1A1A1A] transition-colors cursor-pointer flex items-center gap-1"
                  title="Copy all active notes to clipboard"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Active</span>
                </button>

                {notes.some((n) => n.isCompleted) && (
                  <button
                    type="button"
                    onClick={handleClearCompleted}
                    className="hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                    title="Remove all completed notes"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Done</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-[#9A9A95]">
                <span>Double-click to edit</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
