import { Link } from 'react-router-dom'
import { TrendingUp, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#F6F5F2] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#E4572E] text-white flex items-center justify-center mb-6 shadow-lg shadow-[#E4572E]/25">
        <TrendingUp className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-[#1C2321] tracking-tight">404</h1>
      <h2 className="text-lg font-bold text-[#1C2321] mt-2">Página não encontrada</h2>
      <p className="text-sm text-[#5C6663] max-w-sm mt-1 mb-6">
        O endereço acessado não existe ou foi movido no FlowVendas.
      </p>
      <Link to="/dashboard">
        <Button className="bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold rounded-xl gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Dashboard</span>
        </Button>
      </Link>
    </div>
  )
}

export default NotFound
