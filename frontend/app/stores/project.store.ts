import type { Project } from '@pm-agents/shared'

export const useProjectStore = defineStore('project', () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase
  const apiFetch = useApiFetch()

  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)

  const fetchProjects = async () => {
    loading.value = true
    try {
      const res = await apiFetch<{ data: Project[] }>(`${base}/api/projects`)
      projects.value = res.data
    } finally {
      loading.value = false
    }
  }

  const fetchProject = async (id: string) => {
    const res = await apiFetch<{ data: Project }>(`${base}/api/projects/${id}`)
    currentProject.value = res.data
    useState<{ id: string; name: string } | null>('currentProject').value = { id: res.data.id, name: res.data.name }
    return res.data
  }

  const createProject = async (payload: { name: string; description?: string }) => {
    const res = await apiFetch<{ data: Project }>(`${base}/api/projects`, {
      method: 'POST',
      body: payload
    })
    projects.value.unshift(res.data)
    return res.data
  }

  const clearCurrentProject = () => {
    currentProject.value = null
    useState<{ id: string; name: string } | null>('currentProject').value = null
  }

  return { projects, currentProject, loading, fetchProjects, fetchProject, createProject, clearCurrentProject }
})
