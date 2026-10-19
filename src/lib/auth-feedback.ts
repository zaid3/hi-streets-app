type AuthFailure = { code?: string; status?: number; message?: string }

export function emailRetrySeconds(error: AuthFailure): number | null {
  if (error.code !== 'over_email_send_rate_limit' && error.code !== 'over_request_rate_limit' && error.status !== 429) return null
  const seconds = error.message?.match(/after\s+(\d+)\s+seconds?/i)
  return seconds ? Math.max(1, Number(seconds[1])) : 60
}

export function authErrorMessage(error: AuthFailure, fallback: string): string {
  if (emailRetrySeconds(error) !== null) return 'Too many email requests. Check your inbox and spam folder for the latest email, or wait before requesting another.'
  if (error.code === 'email_not_confirmed') return 'Please confirm your email before signing in. Check your inbox and spam folder, or resend the confirmation email below.'
  if (error.code === 'weak_password') return error.message || 'Choose a stronger password with at least 12 characters.'
  if (error.code === 'email_address_invalid') return 'Enter a valid email address.'
  if (error.code === 'signup_disabled' || error.code === 'email_address_not_authorized') return 'Sign-up emails are unavailable right now. Please try again later.'
  return fallback
}
