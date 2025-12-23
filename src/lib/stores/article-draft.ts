"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ArticleDraft = {
  title: string;
  category: string;
  summary: string;
  content: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
};

type State = {
  drafts: Record<string, ArticleDraft>;
  setDraft: (
    slug: string,
    updater: (prev: ArticleDraft | undefined) => ArticleDraft,
  ) => void;
  clearDraft: (slug: string) => void;
};

export const useArticleDraftStore = create<State>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (slug, updater) =>
        set((state) => {
          const prev = state.drafts[slug];
          const next = updater(prev);
          return {
            drafts: {
              ...state.drafts,
              [slug]: next,
            },
          };
        }),
      clearDraft: (slug) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[slug];
          return { drafts: next };
        }),
    }),
    {
      name: "article-drafts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
