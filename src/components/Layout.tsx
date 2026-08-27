import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  User,
  ShieldCheck,
  TrendingUp,
  PlusCircle,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface LayoutProps {
  onOpenNewDeal?: () => void
}

export const Layout: React.FC<LayoutProps> = () => {
  const { user, role, logout, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F5F2] flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#E4572E] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#E4572E]/20 animate-pulse">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#1C2321]">FlowVendas</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#5C6663]">
          <div className="w-4 h-4 border-2 border-[#E4572E] border-t-transparent rounded-full animate-spin" />
          <span>Carregando sua área de trabalho...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/pipeline',
      label: 'Plano de Ação',
      icon: Kanban,
      badge: 'Kanban',
    },
    {
      to: '/importar',
      label: 'Importar Excel',
      icon: FileSpreadsheet,
      badge: '.xlsx',
    },
  ]

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen bg-[#F6F5F2] flex flex-col md:flex-row font-sans antialiased text-[#1C2321]">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#1C2321] text-white px-4 py-3 flex items-center justify-between border-b border-[#2E3835] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E4572E] flex items-center justify-center text-white shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">FlowVendas</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white hover:bg-[#2E3835]"
          aria-label="Abrir menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </header>

      {/* Mobile Menu Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-72 max-w-[80vw] h-full bg-[#1C2321] text-white flex flex-col p-5 animate-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-5 border-b border-[#2E3835]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E4572E] flex items-center justify-center text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-lg">FlowVendas</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-[#2E3835]"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="py-6 flex-1 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#E4572E] text-white shadow-md shadow-[#E4572E]/25'
                          : 'text-slate-300 hover:bg-[#242D2A] hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>

            {/* Mobile User Profile Footer */}
            <div className="pt-4 border-t border-[#2E3835] flex flex-col gap-3">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-[#242D2A]">
                <Avatar className="w-10 h-10 border border-[#2E3835]">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-[#E4572E] text-white font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-white">{user?.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        role === 'gestor'
                          ? 'bg-purple-900/60 text-purple-200 border border-purple-700/50'
                          : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/50'
                      }`}
                    >
                      {role === 'gestor' ? 'Gestor(a)' : 'Vendedor(a)'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full justify-center gap-2 bg-[#242D2A] border-[#2E3835] text-slate-300 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Fixed 240px) / Tablet (72px) */}
      <aside className="hidden md:flex flex-col w-[72px] lg:w-[240px] bg-[#1C2321] text-white border-r border-[#2E3835] sticky top-0 h-screen z-30 transition-all duration-200 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-4 lg:p-5 flex items-center justify-center lg:justify-start gap-3 border-b border-[#2E3835]">
          <div className="w-9 h-9 rounded-xl bg-[#E4572E] flex items-center justify-center text-white shadow-md shadow-[#E4572E]/20 flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-extrabold text-lg tracking-tight text-white leading-none">
              FlowVendas
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">CRM & Plano de Ação</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 lg:p-4 flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `relative flex items-center justify-center lg:justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-[#242D2A] text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-[#242D2A]/60 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Accent Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#E4572E] rounded-r-full shadow-sm" />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-[#E4572E]' : 'text-slate-400'
                        }`}
                      />
                      <span className="hidden lg:inline truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2E3835] text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3 lg:p-4 border-t border-[#2E3835]">
          <div className="p-2 lg:p-3 rounded-xl bg-[#242D2A] border border-[#2E3835] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-8 h-8 rounded-lg border border-[#2E3835] flex-shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-[#E4572E] text-white font-bold text-xs rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                      role === 'gestor'
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                        : 'bg-teal-950/80 text-teal-300 border border-teal-800/60'
                    }`}
                  >
                    {role === 'gestor' ? 'Gestor' : 'Vendedor'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sair"
              className="w-7 h-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
