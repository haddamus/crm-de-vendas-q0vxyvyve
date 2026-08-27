import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export const Index = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#E4572E] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default Index
