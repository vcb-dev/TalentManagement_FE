/** Khớp `assertLoginEmailFormat` ở BE. */
export const LOGIN_EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/

/** Đuôi miền hay gõ nhầm của Gmail (gặp trong dữ liệu cũ). */
const GMAIL_TYPO_DOMAINS = new Set([
  'gmai.com',
  'gmaik.com',
  'gmial.com',
  'gmal.com',
  'gmali.com',
  'gamil.com',
  'gnail.com',
  'gmail.co',
  'gmail.con',
  'gmail.cm',
  'gmail.vn',
])

export type LoginEmailCheck = {
  tone: 'info' | 'warn' | 'error'
  message: string
}

export function checkLoginEmail(raw: string | null | undefined): LoginEmailCheck {
  const email = (raw ?? '').trim()
  if (!email) {
    return {
      tone: 'error',
      message:
        'Chưa có email — nhân sự không đăng nhập Google được. Nhập email hoặc đặt username/mật khẩu.',
    }
  }
  if (!LOGIN_EMAIL_FORMAT.test(email)) {
    return {
      tone: 'error',
      message: 'Email không đúng định dạng — nhân sự không đăng nhập Google được.',
    }
  }
  const [local, domain = ''] = email.toLowerCase().split('@')
  if (GMAIL_TYPO_DOMAINS.has(domain)) {
    return {
      tone: 'warn',
      message: `Có thể gõ nhầm đuôi email — ý bạn là ${local}@gmail.com?`,
    }
  }
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      tone: 'info',
      message: 'Nhân sự bấm “Đăng nhập với Google” và chọn đúng tài khoản Gmail này.',
    }
  }
  return {
    tone: 'warn',
    message:
      'Không phải Gmail — chỉ đăng nhập Google được nếu email này là tài khoản Google (vd. Google Workspace của trường/công ty). Nếu không, hãy đặt username/mật khẩu.',
  }
}
