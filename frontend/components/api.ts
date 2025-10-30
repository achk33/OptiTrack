import axios from 'axios'

export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL })

let authTokenSet = false

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    authTokenSet = true
  } else {
    delete api.defaults.headers.common['Authorization']
    authTokenSet = false
  }
}

// Initialize token from localStorage on module load (browser only)
if (typeof window !== 'undefined') {
  const storedToken = localStorage.getItem('token')
  if (storedToken) {
    setAuthToken(storedToken)
    console.log('🔐 Auth token initialized from localStorage on module load')
  } else {
    console.log('⚠️ No token found in localStorage on module load')
  }
}

// Add response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🚫 401 Unauthorized received', {
        url: error.config?.url,
        authTokenSet,
        hasAuthHeader: !!error.config?.headers?.['Authorization']
      })
      
      // Only handle 401 if we actually had a token set
      // This prevents redirecting on initial page load before auth is ready
      if (typeof window !== 'undefined' && authTokenSet) {
        console.log('🔓 Authentication expired, clearing session...')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setAuthToken(undefined)
        window.dispatchEvent(new Event('auth:changed'))
        
        // Only redirect if not already on login/auth pages
        const pathname = window.location.pathname
        if (!pathname.includes('/login') && 
            !pathname.includes('/forgot-password') && 
            !pathname.includes('/reset-password')) {
          console.log('↪️ Redirecting to login...')
          window.location.href = '/login'
        }
      } else {
        console.log('⏭️ Skipping redirect (authTokenSet=false or server-side)')
      }
    }
    return Promise.reject(error)
  }
)
