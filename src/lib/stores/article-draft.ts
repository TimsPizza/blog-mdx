"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ArticleDraftData = {
  title: string;
  category: string;
  summary: string;
  coverImageUrl: string;
  content: string;
  uid: string;
  createdAt: number;
};

export type ArticleDraftEntry = {
  data: ArticleDraftData;
  baseline: ArticleDraftData;
  dirty: boolean;
  stale: boolean;
  sourceUpdatedAt?: number;
  updatedAt: number;
};

type State = {
  drafts: Record<string, ArticleDraftEntry>;
  initDraft: (
    key: string,
    base: ArticleDraftData,
    options?: { sourceUpdatedAt?: number },
  ) => void;
  updateDraft: (key: string, patch: Partial<ArticleDraftData>) => void;
  commitDraft: (key: string, data?: ArticleDraftData) => void;
  resetDraft: (key: string) => void;
  clearDraft: (key: string) => void;
};

const isDraftEqual = (a: ArticleDraftData, b: ArticleDraftData) =>
  a.title === b.title &&
  a.category === b.category &&
  a.summary === b.summary &&
  a.coverImageUrl === b.coverImageUrl &&
  a.content === b.content &&
  a.uid === b.uid &&
  a.createdAt === b.createdAt;

export const useArticleDraftStore = create<State>()(
  persist(
    (set) => ({
      drafts: {},
      initDraft: (key, base, options) =>
        set((state) => {
          const existing = state.drafts[key];
          if (!existing) {
            const entry: ArticleDraftEntry = {
              data: base,
              baseline: base,
              dirty: false,
              stale: false,
              sourceUpdatedAt: options?.sourceUpdatedAt,
              updatedAt: Date.now(),
            };
            return { drafts: { ...state.drafts, [key]: entry } };
          }
          const nextBaseline = base;
          const sourceUpdatedAt = options?.sourceUpdatedAt;
          const stale =
            Boolean(existing.dirty) &&
            sourceUpdatedAt !== undefined &&
            existing.sourceUpdatedAt !== undefined &&
            sourceUpdatedAt !== existing.sourceUpdatedAt;
          const nextData = existing.dirty ? existing.data : base;
          const dirty = !isDraftEqual(nextData, nextBaseline);
          const entry: ArticleDraftEntry = {
            data: nextData,
            baseline: nextBaseline,
            dirty,
            stale,
            sourceUpdatedAt,
            updatedAt: existing.updatedAt,
          };
          return {
            drafts: {
              ...state.drafts,
              [key]: entry,
            },
          };
        }),
      updateDraft: (key, patch) =>
        set((state) => {
          const existing = state.drafts[key];
          if (!existing) return state;
          const data = { ...existing.data, ...patch };
          const dirty = !isDraftEqual(data, existing.baseline);
          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...existing,
                data,
                dirty,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      commitDraft: (key, data) =>
        set((state) => {
          const existing = state.drafts[key];
          if (!existing) return state;
          const nextData = data ?? existing.data;
          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...existing,
                data: nextData,
                baseline: nextData,
                dirty: false,
                stale: false,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      resetDraft: (key) =>
        set((state) => {
          const existing = state.drafts[key];
          if (!existing) return state;
          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...existing,
                data: existing.baseline,
                dirty: false,
                stale: false,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      clearDraft: (key) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[key];
          return { drafts: next };
        }),
    }),
    {
      name: "article-drafts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
