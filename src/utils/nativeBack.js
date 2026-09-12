// nativeBack.js - 原生返回键 / 侧滑返回的拦截栈
//
// 返回事件必须按「弹层/全屏子页 → 页面栈 → 退出 APP」的优先级消费
//（见 .cursorrules「常见坑」第 4 条）。全屏组件（如地图选点）和各页面
// 的弹层在此注册处理函数：
//   - 返回 true：已消费（关闭了弹层/子页），事件到此为止
//   - 返回 false/undefined：不拦截，继续向下一个注册者询问
// 最终都没有消费时，由 App.vue 决定 safeBack() 或 exitApp()。
//
// 后注册的先询问（栈顶优先）；组件卸载时必须调用返回的注销函数，
// 避免返回事件被已销毁的组件吞掉。

const handlers = []

/**
 * 注册一个原生返回拦截函数。
 * @param {() => boolean|undefined} fn 返回 true 表示已消费返回事件
 * @returns {() => void} 注销函数，组件卸载时调用
 */
export function pushBackHandler(fn) {
  handlers.push(fn)
  return () => {
    const i = handlers.indexOf(fn)
    if (i !== -1) handlers.splice(i, 1)
  }
}

/**
 * 从栈顶开始询问，任一拦截者返回 true 即视为已消费。
 * @returns {boolean} 是否被拦截
 */
export function handleNativeBack() {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]() === true) return true
  }
  return false
}

// 仅供单元测试重置
export function _resetBackHandlers() {
  handlers.length = 0
}
