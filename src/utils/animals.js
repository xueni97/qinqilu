// Q版小动物头像工具
// 根据辈分+性别分配萌萌的动物 emoji，用于地图点位

// 辈分 → 动物映射
const ANIMAL_BY_GEN = {
  1: { male: '🐢', female: '🐢' },  // 祖辈：乌龟（长寿）
  2: { male: '🦁', female: '🦊' },  // 父辈：狮子/狐狸
  3: { male: '🐰', female: '🐰' },  // 同辈：兔子
  4: { male: '🐱', female: '🐱' },  // 晚辈：猫
  5: { male: '🐶', female: '🐶' }   // 孙辈：狗
}

const DEFAULT_ANIMAL = '🐾'  // 未知辈分：爪印

// 获取亲戚对应的动物 emoji
export function getAnimalEmoji(relative) {
  const gen = relative.generation
  const gender = relative.gender
  const map = ANIMAL_BY_GEN[gen]
  if (!map) return DEFAULT_ANIMAL
  return gender === '女' ? map.female : map.male
}

// 生成百度地图自定义 Label 的 HTML（圆形动物头像）
export function buildAnimalMarkerHtml(relative, distanceText = '') {
  const animal = getAnimalEmoji(relative)
  const name = relative.name || '?'
  const dist = distanceText ? `<div class="marker-dist">${distanceText}</div>` : ''
  return `
    <div class="animal-marker">
      <div class="animal-emoji">${animal}</div>
      ${dist}
    </div>
  `
}
