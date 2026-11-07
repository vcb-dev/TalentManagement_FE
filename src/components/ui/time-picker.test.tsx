import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TimePicker } from './time-picker'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <TimePicker value={value} onChange={setValue} aria-label="Giờ bắt đầu" />
}

const trigger = () => screen.getByRole('button', { name: 'Giờ bắt đầu' })
const option = (name: string) => screen.getByRole('button', { name })

describe('TimePicker', () => {
  it('has no text input, only a button showing the placeholder', () => {
    render(<Harness />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(trigger().textContent).toBe('Chọn giờ')
  })

  it('offers every hour and minutes in 5-minute steps', async () => {
    render(<Harness />)
    await userEvent.click(trigger())
    expect(option('00 giờ')).toBeTruthy()
    expect(option('23 giờ')).toBeTruthy()
    expect(option('55 phút')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '24 giờ' })).toBeNull()
    expect(screen.queryByRole('button', { name: '03 phút' })).toBeNull()
  })

  it('keeps the popover open after an hour, then closes after a minute', async () => {
    render(<Harness />)
    await userEvent.click(trigger())

    await userEvent.click(option('08 giờ'))
    expect(trigger().textContent).toBe('08:00')
    expect(option('30 phút')).toBeTruthy()

    await userEvent.click(option('30 phút'))
    expect(trigger().textContent).toBe('08:30')
    expect(screen.queryByRole('button', { name: '30 phút' })).toBeNull()
  })

  it('stays open when a minute is picked before any hour', async () => {
    render(<Harness />)
    await userEvent.click(trigger())

    await userEvent.click(option('15 phút'))
    expect(trigger().textContent).toBe('00:15')
    expect(option('08 giờ')).toBeTruthy()
  })

  it('keeps the minute when changing the hour of an existing value', async () => {
    render(<Harness initial="09:33" />)
    await userEvent.click(trigger())
    expect(option('09 giờ').getAttribute('aria-pressed')).toBe('true')

    await userEvent.click(option('14 giờ'))
    expect(trigger().textContent).toBe('14:33')
    expect(option('09 giờ').getAttribute('aria-pressed')).toBe('false')
  })
})
