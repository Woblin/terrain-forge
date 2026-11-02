import { describe, expect, it } from 'vitest';
import { findById } from './findById';

describe('findById', () => {
  const items = [
    { id: 'ruin', name: 'First ruin' },
    { id: 'hill', name: 'Hill' },
    { id: 'ruin', name: 'Second ruin' },
  ];

  it('finds the item with the id', () => {
    expect(findById(items, 'hill')?.name).toBe('Hill');
  });

  it('takes the first item when two share an id', () => {
    expect(findById(items, 'ruin')?.name).toBe('First ruin');
  });

  it('finds nothing for an id that is not there', () => {
    expect(findById(items, 'forest')).toBeUndefined();
  });
});
