export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if ((user.value as any)?.role !== 'superadmin') {
    return navigateTo('/dashboard')
  }
})
