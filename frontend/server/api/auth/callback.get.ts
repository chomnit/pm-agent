import { defineEventHandler, getHeader, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const cookieHeader = getHeader(event, 'cookie') || ''

  if (!cookieHeader.includes('connect.sid')) {
    return sendRedirect(event, '/login?error=no_session')
  }

  try {
    const response = await $fetch<{
      data: { id: string; email: string; name: string; avatarUrl: string | null }
    }>('http://localhost:5001/auth/me', {
      headers: {
        cookie: cookieHeader
      }
    })

    await setUserSession(event, { user: response.data })
    return sendRedirect(event, '/dashboard')
  } catch {
    return sendRedirect(event, '/login?error=auth_failed')
  }
})
