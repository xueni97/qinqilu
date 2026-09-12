import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pushBackHandler, handleNativeBack, _resetBackHandlers } from '../../src/utils/nativeBack.js'

// 原生返回拦截栈：弹层/全屏子页必须优先于页面返回消费事件
describe('nativeBack 返回拦截栈', () => {
  beforeEach(() => _resetBackHandlers())

  it('空栈时不拦截，交由页面路由处理', () => {
    expect(handleNativeBack()).toBe(false)
  })

  it('拦截者返回 true 时消费事件，不再向下传递', () => {
    const page = vi.fn(() => false)
    const popup = vi.fn(() => true)
    pushBackHandler(page)
    pushBackHandler(popup)

    expect(handleNativeBack()).toBe(true)
    expect(popup).toHaveBeenCalledOnce()
    expect(page).not.toHaveBeenCalled()
  })

  it('栈顶返回 false 时继续询问下一层（模拟二级弹层关闭后再关一级弹层）', () => {
    const calls = []
    pushBackHandler(() => { calls.push('page'); return false })
    pushBackHandler(() => { calls.push('sheet'); return true })
    pushBackHandler(() => { calls.push('picker'); return false })

    expect(handleNativeBack()).toBe(true)
    // 从栈顶依次询问，直到 sheet 消费
    expect(calls).toEqual(['picker', 'sheet'])
  })

  it('所有拦截者都不处理时返回 false，由 App.vue 决定返回或退出', () => {
    pushBackHandler(() => undefined)
    pushBackHandler(() => false)
    expect(handleNativeBack()).toBe(false)
  })

  it('注销后该拦截者不再被询问（模拟弹层组件卸载）', () => {
    const gone = vi.fn(() => true)
    const alive = vi.fn(() => true)
    const unregisterGone = pushBackHandler(gone)
    pushBackHandler(alive)

    unregisterGone()
    handleNativeBack()
    expect(gone).not.toHaveBeenCalled()
    expect(alive).toHaveBeenCalledOnce()
  })

  it('连续两次返回：第一次关弹层，第二次才放行退出（首页菜单场景）', () => {
    let menuOpen = true
    pushBackHandler(() => {
      if (menuOpen) { menuOpen = false; return true }
      return false
    })

    expect(handleNativeBack()).toBe(true)  // 第一次：关菜单
    expect(menuOpen).toBe(false)
    expect(handleNativeBack()).toBe(false) // 第二次：放行 → 退出 APP
  })
})
