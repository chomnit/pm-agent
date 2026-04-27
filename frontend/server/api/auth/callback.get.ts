import { defineEventHandler, getHeader, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const cookieHeader = getHeader(event, 'cookie') || ''

  if (!cookieHeader.includes('connect.sid')) {
    console.error('[auth/callback] No connect.sid cookie found')
    return sendRedirect(event, '/login?error=no_session')
  }

  try {
    console.log('[auth/callback] Calling backend /auth/me with cookie:', cookieHeader)
    const response = await $fetch<{
      data: { id: string; email: string; name: string; avatarUrl: string | null }
    }>('http://localhost:5001/auth/me', {
      headers: {
        cookie: cookieHeader
      }
    })

    console.log('[auth/callback] Backend response:', response)
    await setUserSession(event, { user: response.data })
    return sendRedirect(event, '/dashboard')
  } catch (err) {
    console.error('[auth/callback] Error calling /auth/me:', err)
    return sendRedirect(event, '/login?error=auth_failed')
  }
})
