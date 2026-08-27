import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [email, setEmail] = useState('thomazmcontato@hotmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email || !email.includes('@')) {
      setErrorMsg('Por favor, informe um e-mail válido.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      setIsSubmitting(true)
      await login(email, password)
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Login realizado com sucesso no FlowVendas.',
      })
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillQuickAccount = (role: 'gestor' | 'vendedor') => {
    if (role === 'gestor') {
      setEmail('thomazmcontato@hotmail.com')
      setPassword('Skip@Pass')
    } else {
      setEmail('vendedora@demo.com')
      setPassword('Skip@Pass')
    }
    setErrorMsg(null)
  }

  return (
    <div className="min-h-screen w-full bg-[#F6F5F2] flex flex-col lg:flex-row antialiased">
      {/* Left Brand Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1C2321] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#E4572E]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#2E9E8F]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Top */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E4572E] flex items-center justify-center text-white shadow-lg shadow-[#E4572E]/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-white">FlowVendas</span>
              <span className="block text-xs font-semibold text-[#E4572E] tracking-wider uppercase">
                CRM Inteligente
              </span>
            </div>
          </div>
        </div>

        {/* Central Hero Message & Floating KPI Chips */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold mb-6 backdrop-blur-md border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-[#E4572E]" />
            <span>Gestão visual de alta performance</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] text-white tracking-tight">
            Seu plano de ação, do primeiro contato ao fechamento.
          </h1>

          <p className="mt-5 text-base text-slate-300 max-w-lg leading-relaxed">
            Centralize oportunidades, automatize follow-ups e dê visibilidade em tempo real para
            vendedores e gestores com métricas claras e um pipeline dinâmico.
          </p>

          {/* Floating Metric Chips */}
          <div className="mt-10 flex flex-wrap gap-3.5">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#242D2A] border border-[#2E3835] shadow-lg animate-float">
              <div className="w-8 h-8 rounded-lg bg-[#2E9E8F]/20 text-[#2E9E8F] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Conversão média</span>
                <span className="text-sm font-extrabold text-white font-numeric">+42% taxa</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#242D2A] border border-[#2E3835] shadow-lg animate-float [animation-delay:1.5s]">
              <div className="w-8 h-8 rounded-lg bg-[#E4572E]/20 text-[#E4572E] flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Pipeline ativo</span>
                <span className="text-sm font-extrabold text-white font-numeric">
                  R$ 1,2M em jogo
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#242D2A] border border-[#2E3835] shadow-lg animate-float [animation-delay:3s]">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Produtividade</span>
                <span className="text-sm font-extrabold text-white font-numeric">
                  12h economizadas/sem
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-[#2E3835] flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} FlowVendas CRM Brasil.</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-[#2E9E8F]" />
            Dados em BRL (R$) & Tempo Real
          </span>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        {/* Mobile Brand Header */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#E4572E] flex items-center justify-center text-white shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-2xl text-[#1C2321]">FlowVendas</span>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-black/[0.04] border border-[#E7E5E0] p-8 sm:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-[#1C2321] tracking-tight">
              Entrar no FlowVendas
            </h2>
            <p className="text-sm text-[#5C6663] mt-1.5">
              Acesse com o e-mail e senha da sua conta corporativa.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm animate-shake">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
              >
                E-mail corporativo
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8A938F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com.br"
                  required
                  className="pl-10 h-11 rounded-xl border-[#E7E5E0] bg-[#F6F5F2]/40 focus:bg-white focus:ring-2 focus:ring-[#E4572E]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
                >
                  Senha de acesso
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#5C6663] hover:text-[#1C2321] flex items-center gap-1 font-medium"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Mostrar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A938F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 h-11 rounded-xl border-[#E7E5E0] bg-[#F6F5F2]/40 focus:bg-white focus:ring-2 focus:ring-[#E4572E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                />
                <label
                  htmlFor="remember"
                  className="text-xs font-medium text-[#5C6663] cursor-pointer"
                >
                  Lembrar de mim
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold shadow-md shadow-[#E4572E]/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8 pt-6 border-t border-[#E7E5E0]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A938F] mb-3 text-center">
              Acesso Rápido de Demonstração
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillQuickAccount('gestor')}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900">Gestor(a)</span>
                  <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-semibold">
                    Thomaz
                  </span>
                </div>
                <p className="text-[10px] text-purple-700 truncate mt-0.5">Visão equipe completa</p>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('vendedor')}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900">Vendedora</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                    Ana Souza
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 truncate mt-0.5">Visão própria</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
