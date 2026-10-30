/** Scrolls the balance rules into view and moves the focus there. */
export function focusRules(rulesId: string): void {
  const rules = document.getElementById(rulesId);
  rules?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  rules?.focus({ preventScroll: true });
}
