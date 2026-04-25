import { defineEventHandler, getCookie, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const connectSid = getCookie(event, 'connect.sid')

  if (!connectSid) {
    return sendRedirect(event, '/login?error=no_session')
  }

  try {
    const backendUrl = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:5001'
    const response = await $fetch<{
      data: { id: string; email: string; name: string; avatarUrl: string | null }
    }>(`${backendUrl}/auth/me`, {
      headers: {
        cookie: `connect.sid=${connectSid}`
      }
    })

    await setUserSession(event, { user: response.data })
    return sendRedirect(event, '/dashboard')
  } catch {
    return sendRedirect(event, '/login?error=auth_failed')
  }
})
