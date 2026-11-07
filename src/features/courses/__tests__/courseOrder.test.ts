import { describe, expect, it } from 'vitest'
import { moveId } from '../courseOrder'

describe('moveId', () => {
  const ids = ['a', 'b', 'c']

  it('swaps with the neighbour above or below', () => {
    expect(moveId(ids, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveId(ids, 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('does not mutate the input', () => {
    moveId(ids, 0, 1)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('returns null at the edges or for an out-of-range index', () => {
    expect(moveId(ids, 0, -1)).toBeNull()
    expect(moveId(ids, 2, 1)).toBeNull()
    expect(moveId(ids, 5, -1)).toBeNull()
    expect(moveId([], 0, 1)).toBeNull()
  })
})
