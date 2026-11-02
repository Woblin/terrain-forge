/** The item with this id, if there is one. */
export function findById<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
): T | undefined {
  return items.find((item) => item.id === id);
}
