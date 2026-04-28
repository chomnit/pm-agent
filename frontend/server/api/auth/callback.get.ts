import { defineEventHandler, getHeader, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const cookieHeader = getHeader(event, 'cookie') || ''

  if (!cookieHeader.includes('connect.sid')) {
    return sendRedirect(event, '/login?error=no_session')
  }

  try {
    const config = useRuntimeConfig()
    const apiBase = config.apiBase || 'http://localhost:5001'

    const response = await $fetch<{
      data: { id: string; email: string; name: string; avatarUrl: string | null }
    }>(`${apiBase}/auth/me`, {
      headers: {
        cookie: cookieHeader
      }
    })

    await setUserSession(event, { user: response.data })
    return sendRedirect(event, '/dashboard')
  } catch (err) {
    console.error('[auth/callback] Error calling /auth/me:', err)
    return sendRedirect(event, '/login?error=auth_failed')
  }
})
