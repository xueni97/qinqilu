// 农历转公历工具
// 用成熟的 lunar-javascript 库，不自造
// 设计文档 5.4 节：生日提醒时若 isLunar，按农历转公历算当年生日

import { Lunar, LunarDate } from 'lunar-javascript'

// 把农历日期字符串（YYYY-MM-DD）转为当年的公历日期
// 输入：农历字符串如 "1958-02-25"（农历1958年二月廿五）
// 输出：公历字符串 "YYYY-MM-DD"（该农历日在当年的公历日期）
// 用法场景：录入农历生日后，每年算当年生日距离今天还有多少天
export function lunarToSolar(lunarStr, targetYear = null) {
  const [year, month, day] = lunarStr.split('-').map(Number)

  // 如果指定了目标年（求当年生日），用目标年+原农历月日
  const useYear = targetYear || year
  // lunar-javascript 的 Lunar.fromYmd 接受公历日期构造农历
  // 这里用 LunarDate 反向：先构造农历，再取公历
  const lunar = Lunar.fromYmd(useYear, month, day)
  const solar = lunar.getSolar()
  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`
}

// 当年农历生日的公历日期
// 输入：农历生日字符串 + 当年公历年
// 输出：当年该农历日对应的公历日期字符串
export function lunarBirthdayThisYear(lunarStr, thisYear) {
  const [_, month, day] = lunarStr.split('-').map(Number)
  const lunar = Lunar.fromYmd(thisYear, month, day)
  const solar = lunar.getSolar()
  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`
}

// 算当年春节的公历日期（拜年倒数用）
export function springFestivalThisYear(year) {
  // 春节 = 当年农历正月初一
  const lunar = Lunar.fromYmd(year, 1, 1)
  const solar = lunar.getSolar()
  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`
}
