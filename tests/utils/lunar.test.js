import { describe, it, expect } from 'vitest'
import { lunarToSolar, lunarBirthdayThisYear, springFestivalThisYear } from '../../src/utils/lunar.js'

describe('lunarToSolar', () => {
  it('1958年农历二月廿五 → 公历 1958-04-13', () => {
    // 已知：农历1958年二月廿五 = 公历1958年4月13日
    const result = lunarToSolar('1958-02-25')
    expect(result).toBe('1958-04-13')
  })

  it('2024年农历正月初一 → 公历 2024-02-10', () => {
    const result = lunarToSolar('2024-01-01')
    expect(result).toBe('2024-02-10')
  })

  it('1990年农历七月初一 → 公历 1990-08-20', () => {
    // 农历1990年七月初一 = 公历1990年8月20日（农历七月对应公历8月居多）
    const result = lunarToSolar('1990-07-01')
    expect(result).toBe('1990-08-20')
  })
})

describe('lunarBirthdayThisYear', () => {
  it('给定农历生日，算当年公历生日', () => {
    // 农历 03-15（姑父生日），2026年农历三月十五
    const result = lunarBirthdayThisYear('1958-03-15', 2026)
    expect(result).toMatch(/^2026-\d{2}-\d{2}$/)
  })
})

describe('springFestivalThisYear', () => {
  it('2026年春节是 2026-02-17', () => {
    const result = springFestivalThisYear(2026)
    expect(result).toBe('2026-02-17')
  })
})
