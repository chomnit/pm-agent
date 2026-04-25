export const useApiFetch = () => {
  const { clear } = useUserSession()

  return $fetch.create({
    credentials: 'include' as RequestCredentials,
    onResponseError({ response }) {
      if (response.status === 401) {
        clear()
        navigateTo('/login')
      }
    }
  })
}
