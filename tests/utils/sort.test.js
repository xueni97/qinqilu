import { describe, it, expect } from 'vitest'
import { sortRelativesByLastMet } from '../../src/utils/sort.js'

describe('sortRelativesByLastMet', () => {
  it('null 排最前（从未见过最需查）', () => {
    const list = [
      { id: 1, lastMetAt: '2026-02-10' },
      { id: 2, lastMetAt: null },
      { id: 3, lastMetAt: '2025-10-01' }
    ]
    const result = sortRelativesByLastMet(list)
    expect(result[0].id).toBe(2)  // null 排最前
    expect(result[1].id).toBe(3)  // 2025-10 < 2026-02
    expect(result[2].id).toBe(1)
  })

  it('日期倒序：最久没见的排前', () => {
    const list = [
      { id: 1, lastMetAt: '2026-02-10' },
      { id: 2, lastMetAt: '2024-02-10' },
      { id: 3, lastMetAt: '2025-10-01' }
    ]
    const result = sortRelativesByLastMet(list)
    expect(result.map((r) => r.id)).toEqual([2, 3, 1])  // 2024 < 2025 < 2026
  })

  it('相同日期稳定排序（保留原顺序）', () => {
    const list = [
      { id: 'A', lastMetAt: '2026-02-10' },
      { id: 'B', lastMetAt: '2026-02-10' },
      { id: 'C', lastMetAt: '2026-02-10' }
    ]
    const result = sortRelativesByLastMet(list)
    expect(result.map((r) => r.id)).toEqual(['A', 'B', 'C'])
  })

  it('不修改原数组', () => {
    const list = [
      { id: 1, lastMetAt: '2026-02-10' },
      { id: 2, lastMetAt: null }
    ]
    sortRelativesByLastMet(list)
    expect(list[0].id).toBe(1)  // 原数组顺序不变
  })

  it('空数组返回空数组', () => {
    expect(sortRelativesByLastMet([])).toEqual([])
  })
})
