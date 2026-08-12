'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AddItemModal from './AddItemModal';
import type { Book, Movie } from '@/types';

type ModalKind = 'books' | 'movies';

interface ModalState {
  open: boolean;
  kind: ModalKind;
  editItem: Book | Movie | null;
}

interface ModalContextValue {
  openModal: (kind: ModalKind, editItem?: Book | Movie | null) => void;
  closeModal: () => void;
  /** 弹窗打开时动态切换类型（仅新增模式可用） */
  switchKind: (kind: ModalKind) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({
    open: false,
    kind: 'books',
    editItem: null,
  });

  const openModal = useCallback((kind: ModalKind, editItem: Book | Movie | null = null) => {
    setState({ open: true, kind, editItem });
  }, []);

  const closeModal = useCallback(() => {
    setState((s) => ({ ...s, open: false, editItem: null }));
  }, []);

  const switchKind = useCallback((kind: ModalKind) => {
    setState((s) => {
      // 编辑模式下不允许切换
      if (s.editItem) return s;
      return { ...s, kind };
    });
  }, []);

  // 键盘快捷键 N
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        const target = e.target as HTMLElement;
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
        e.preventDefault();
        setState((s) => {
          if (s.open) return s;
          return { open: true, kind: s.kind, editItem: null };
        });
      }
      if (e.key === 'Escape') {
        setState((s) => (s.open ? { ...s, open: false, editItem: null } : s));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal, switchKind }}>
      {children}
      {state.open && (
        <AddItemModal
          kind={state.kind}
          editItem={state.editItem}
          onClose={closeModal}
          onSwitchKind={state.editItem ? undefined : switchKind}
        />
      )}
    </ModalContext.Provider>
  );
}
