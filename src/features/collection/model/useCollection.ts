import { useCallback, useEffect, useState } from "react";
import { loadDocument, saveDocument } from "../../../shared/storage";
import { artworkById } from "../../../shared/catalog";
import type { GalleryDocument, StoryFact, StoryReward } from "../../../shared/types";
import { addFact, addReward } from "../lib/journal";

export function useCollection() {
  const [document, setDocument] = useState(loadDocument);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setStorageError(!saveDocument(document));
  }, [document]);
  const toggle = useCallback((id: string) => {
    setDocument((d) => ({
      ...d,
      favorites: d.favorites.includes(id)
        ? d.favorites.filter((x) => x !== id)
        : [...d.favorites, id],
    }));
  }, []);
  const note = useCallback((id: string, text: string) => {
    setDocument((d) => ({ ...d, notes: { ...d.notes, [id]: text } }));
  }, []);
  const record = useCallback((id: string, seconds: number) => {
    if (!artworkById(id)) return;
    setDocument((d) => {
      const previous = d.visits.find((v) => v.id === id);
      return {
        ...d,
        visits: previous
          ? d.visits.map((v) =>
              v.id === id ? { ...v, seconds: v.seconds + seconds } : v,
            )
          : [...d.visits, { id, seconds, at: Date.now() }],
      };
    });
  }, []);
  /**
   * Facts are append-only and keyed by story/node/line. Re-walking a branch,
   * rewinding, or restoring after a refresh therefore records each heard
   * line at most once, even if a late timer fires twice.
   */
  const recordFact = useCallback(
    (fact: Omit<StoryFact, "at">, at = Date.now()) => {
      setDocument((d) => addFact(d, fact, at));
    },
    [],
  );
  /** Chapter/ending rewards are one per story node, forever. */
  const grantReward = useCallback(
    (storyId: string, nodeId: string, kind: StoryReward["kind"]) => {
      setDocument((d) => addReward(d, storyId, nodeId, kind));
    },
    [],
  );
  return {
    document: document as GalleryDocument,
    storageError,
    toggle,
    note,
    record,
    recordFact,
    grantReward,
  };
}
