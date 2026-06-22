'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dashboard } from '@/components/p2p/Dashboard'
import { BanksView } from '@/components/p2p/BanksView'
import { ExchangesView } from '@/components/p2p/ExchangesView'
import { TransactionsView } from '@/components/p2p/TransactionsView'
import { Wallet, LayoutDashboard, Landmark, ShoppingCart, Tag, ListOrdered, Building2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function Home() {
  const [tab, setTab] = useState('dashboard')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-2 py-1.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm flex-shrink-0">
                <Wallet className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                  P2P Ledger
                </h1>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">
                  Compras · Ventas · Bancos · Comisiones
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded-md bg-muted">Local</span>
              <span>·</span>
              <span>Datos en tu dispositivo</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Main */}
        <main className="container mx-auto px-2 py-2 sm:px-4 sm:py-6 flex-1 w-full">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="overflow-x-auto -mx-2 px-2 pb-1 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
              <TabsList className="grid w-full min-w-max sm:min-w-0 grid-cols-3 sm:grid-cols-6 mb-2 sm:mb-6 h-auto gap-1">
                <TabsTrigger value="dashboard" className="flex items-center gap-1 py-1.5 sm:py-2 text-[11px] sm:text-sm px-2 sm:px-3">
                  <LayoutDashboard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Resumen</span>
                </TabsTrigger>
                <TabsTrigger value="bancos" className="flex items-center gap-1 py-1.5 sm:py-2 text-[11px] sm:text-sm px-2 sm:px-3">
                  <Landmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Bancos
                </TabsTrigger>
                <TabsTrigger value="exchanges" className="flex items-center gap-1 py-1.5 sm:py-2 text-[11px] sm:text-sm px-2 sm:px-3">
                  <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Exchanges</span>
                  <span className="sm:hidden">Comm.</span>
                </TabsTrigger>
                <TabsTrigger value="compras" className="flex items-center gap-1 py-1.5 sm:py-2 text-[11px] sm:text-sm px-2 sm:px-3">
                  <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Compras
                </TabsTrigger>
                <TabsTrigger value="ventas" className="flex items-center gap-1 py-1.5 sm:py-2 text-[11px] sm:text-sm px-2 sm:px-3">
                  <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Ventas
                </TabsTrigger>
                <TabsTrigger value="todas" className="flex items-center gap-1 py-1.5 sm:py-2 text-[11px] sm:text-sm px-2 sm:px-3 col-span-3 sm:col-span-1">
                  <ListOrdered className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Historial
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="mt-0">
              <Dashboard />
            </TabsContent>
            <TabsContent value="bancos" className="mt-0">
              <BanksView />
            </TabsContent>
            <TabsContent value="exchanges" className="mt-0">
              <ExchangesView />
            </TabsContent>
            <TabsContent value="compras" className="mt-0">
              <TransactionsView mode="compra" />
            </TabsContent>
            <TabsContent value="ventas" className="mt-0">
              <TransactionsView mode="venta" />
            </TabsContent>
            <TabsContent value="todas" className="mt-0">
              <TransactionsView mode="all" />
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer sticky */}
        <footer className="border-t bg-background mt-auto">
          <div className="container mx-auto px-2 py-1.5 sm:px-4 sm:py-3 text-[9px] sm:text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
            <p>
              <span className="font-medium text-foreground">P2P Ledger</span> · Registro local de operaciones
            </p>
            <p className="text-center sm:text-right">
              Tus datos se guardan localmente en este dispositivo.
            </p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  )
}
