'use client';
import { useEffect } from 'react';

// All copy is server-rendered. Native buttons also activate with Enter and Space.
export function ResourceDeck() {
  useEffect(() => {
    const deck = document.getElementById('resources-cue-deck');
    if (!deck) return;
    const controller = new AbortController();
    deck.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        deck.dataset.turn = String((Number(deck.dataset.turn || 0) + 2) % 3);
      }, { signal: controller.signal });
    });
    return () => controller.abort();
  }, []);
  return null;
}
