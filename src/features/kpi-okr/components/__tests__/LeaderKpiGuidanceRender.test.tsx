/**
 * LeaderKpiGuidance — component render tests (DOM, toggle collapse/expand).
 * Yêu cầu @testing-library/react đã được cài.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeaderKpiGuidance } from '../LeaderKpiGuidance'

describe('LeaderKpiGuidance — render KINH_DOANH variant', () => {
  it('hiển thị tiêu đề "Kinh Doanh"', () => {
    render(<LeaderKpiGuidance variant="KINH_DOANH" />)
    expect(screen.getByText(/Hướng dẫn nhập KPI — Kinh Doanh/i)).toBeInTheDocument()
  })

  it('nội dung bảng hiển thị mặc định (mở sẵn)', () => {
    render(<LeaderKpiGuidance variant="KINH_DOANH" />)
    expect(screen.getByText(/Bắt buộc nhập/i)).toBeInTheDocument()
  })

  it('click toggle → ẩn nội dung', () => {
    render(<LeaderKpiGuidance variant="KINH_DOANH" />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(screen.queryByText(/Bắt buộc nhập/i)).not.toBeInTheDocument()
  })

  it('click toggle 2 lần → hiện lại nội dung', () => {
    render(<LeaderKpiGuidance variant="KINH_DOANH" />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.getByText(/Bắt buộc nhập/i)).toBeInTheDocument()
  })
})

describe('LeaderKpiGuidance — render TRAFFIC variant', () => {
  it('hiển thị tiêu đề "Traffic Team"', () => {
    render(<LeaderKpiGuidance variant="TRAFFIC" />)
    expect(screen.getByText(/Hướng dẫn nhập KPI — Traffic Team/i)).toBeInTheDocument()
  })

  it('hiển thị metric "Tổng view traffic team"', () => {
    render(<LeaderKpiGuidance variant="TRAFFIC" />)
    expect(screen.getByText(/Tổng view traffic team/i)).toBeInTheDocument()
  })

  it('hiển thị metric "Doanh thu team traffic"', () => {
    render(<LeaderKpiGuidance variant="TRAFFIC" />)
    expect(screen.getByText(/Doanh thu team traffic/i)).toBeInTheDocument()
  })

  it('toggle ẩn nội dung TRAFFIC', () => {
    render(<LeaderKpiGuidance variant="TRAFFIC" />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(screen.queryByText(/Tổng view traffic team/i)).not.toBeInTheDocument()
  })
})
