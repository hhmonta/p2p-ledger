'use client'

import { Download, Shield, Smartphone, Package } from 'lucide-react'

export default function DescargarPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-background to-muted/20"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg mb-4">
            <Package className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold">P2P Ledger v1.0</h1>
          <p className="text-sm text-muted-foreground mt-1">
            APK para Android · 2.9 MB
          </p>
        </div>

        <div className="bg-card border rounded-xl p-5 mb-5 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Requisitos</p>
              <p className="text-muted-foreground">Android 7.0 (API 24) o superior</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Permisos</p>
              <p className="text-muted-foreground">Solo INTERNET. Todos tus datos se guardan localmente en el dispositivo.</p>
            </div>
          </div>
        </div>

        <a
          href="/P2P-Ledger-v1.0.apk"
          download="P2P-Ledger-v1.0.apk"
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition"
        >
          <Download className="h-5 w-5" />
          Descargar APK
        </a>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Si tu navegador bloquea la descarga, mantén presionado el botón y elige &quot;Descargar enlace&quot;.
        </p>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Instrucciones de instalación:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Descarga el archivo APK</li>
            <li>Ábrelo desde el gestor de archivos o notificaciones</li>
            <li>Permite &quot;Instalar apps de origen desconocido&quot; si tu sistema lo solicita</li>
            <li>Instala y abre P2P Ledger</li>
          </ol>
        </div>

        <a
          href="/"
          className="block text-center text-sm text-emerald-500 hover:underline mt-6"
        >
          ← Volver a la app
        </a>
      </div>
    </div>
  )
}
