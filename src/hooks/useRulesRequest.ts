import { useState } from 'react';

/**
 * Follows the player's asks to see the balance rules, such as "Choose rules" in Setup. The ask
 * stays pending until the rules are in view and focused, which may take the panel or tab that
 * holds them a render or two to open.
 */
export function useRulesRequest(asked: number): [boolean, () => void] {
  const [seen, setSeen] = useState(asked);
  const [pending, setPending] = useState(false);
  if (asked !== seen) {
    setSeen(asked);
    setPending(true);
  }
  return [
    pending,
    () => {
      setPending(false);
    },
  ];
}
