'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Timer,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from '@/hooks/use-toast'

interface SecuritySettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SecuritySettings({ open, onOpenChange }: SecuritySettingsProps) {
  const {
    config,
    state,
    setupPin,
    disablePin,
    changeCurrentPin,
    setAutoLockSeconds,
    setBlockScreenshots,
    wipeAll,
  } = useAuth()

  const [setupOpen, setSetupOpen] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [wipeOpen, setWipeOpen] = useState(false)

  const pinEnabled = config.pinEnabled && !!config.pinRecord

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Seguridad
            </DialogTitle>
            <DialogDescription>
              Protege tu información con PIN, cifrado y bloqueo automático.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Estado del PIN */}
            <Card className={pinEnabled ? 'border-emerald-300 dark:border-emerald-800' : ''}>
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        pinEnabled
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {pinEnabled ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">Bloqueo con PIN</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {pinEnabled
                          ? 'PIN activo. Tus datos están cifrados con AES-GCM.'
                          : 'Sin PIN. Tu información está accesible a cualquiera con acceso al dispositivo.'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                {!pinEnabled ? (
                  <Button size="sm" className="w-full" onClick={() => setSetupOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" /> Activar PIN
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setChangeOpen(true)}
                    >
                      <KeyRound className="mr-2 h-4 w-4" /> Cambiar PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-rose-600 hover:text-rose-700"
                      onClick={() => setDisableOpen(true)}
                    >
                      <Unlock className="mr-2 h-4 w-4" /> Quitar PIN
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-bloqueo */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">Auto-bloqueo</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Bloquea la app tras inactividad o al ir a segundo plano.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <Select
                  value={String(config.autoLockSeconds)}
                  onValueChange={(v) => setAutoLockSeconds(Number(v))}
                  disabled={!pinEnabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 segundos</SelectItem>
                    <SelectItem value="60">1 minuto</SelectItem>
                    <SelectItem value="120">2 minutos</SelectItem>
                    <SelectItem value="300">5 minutos</SelectItem>
                    <SelectItem value="600">10 minutos</SelectItem>
                    <SelectItem value="1800">30 minutos</SelectItem>
                    <SelectItem value="0">Nunca (solo manual)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Bloqueo de screenshots */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                    {config.blockScreenshots ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">Bloquear capturas</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Oculta el contenido en apps recientes y bloquea screenshots en Android.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <Button
                  size="sm"
                  variant={config.blockScreenshots ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setBlockScreenshots(!config.blockScreenshots)}
                >
                  {config.blockScreenshots ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" /> Capturas bloqueadas
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" /> Capturas permitidas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Zona peligrosa */}
            <Card className="border-rose-300 dark:border-rose-900/50">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm text-rose-700 dark:text-rose-300">Zona peligrosa</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Borrar todos los datos y configuración. No se puede deshacer.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-300 dark:border-rose-900"
                  onClick={() => setWipeOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Borrar todos los datos
                </Button>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subdiálogos */}
      <SetupPinDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onDone={() => {
          setSetupOpen(false)
          onOpenChange(false)
        }}
      />
      <ChangePinDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
      />
      <DisablePinDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDone={() => {
          setDisableOpen(false)
        }}
      />
      <WipeConfirmDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        onConfirm={() => {
          wipeAll()
          setWipeOpen(false)
          onOpenChange(false)
          toast({ title: 'Datos borrados', description: 'La app se reinició a estado inicial.' })
        }}
      />
    </>
  )
}

// ---------- Subdiálogo: activar PIN ----------

function SetupPinDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const { setupPin } = useAuth()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPin('')
      setConfirm('')
      setStage('enter')
      setError('')
    }
  }, [open])

  async function submit() {
    if (pin.length < 4) {
      setError('Mínimo 4 dígitos')
      return
    }
    if (stage === 'enter') {
      setConfirm(pin)
      setPin('')
      setStage('confirm')
      setError('')
      return
    }
    if (pin !== confirm) {
      setError('Los PINs no coinciden')
      setStage('enter')
      setConfirm('')
      setPin('')
      return
    }
    setBusy(true)
    setError('')
    try {
      await setupPin(pin)
      toast({ title: 'PIN activado', description: 'Tu app ahora está protegida con cifrado.' })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-500" />
            {stage === 'enter' ? 'Crear PIN' : 'Confirmar PIN'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'enter'
              ? 'Elige un PIN de 4 a 8 dígitos. Lo necesitarás para abrir la app.'
              : 'Repite el PIN para confirmar.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            className="text-center text-2xl tracking-[0.5em] tabular-nums"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || pin.length < 4}>
            {busy ? 'Guardando...' : stage === 'enter' ? 'Continuar' : 'Activar PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Subdiálogo: cambiar PIN ----------

function ChangePinDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { changeCurrentPin } = useAuth()
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setOldPin('')
      setNewPin('')
      setConfirm('')
      setError('')
    }
  }, [open])

  async function submit() {
    if (oldPin.length < 4 || newPin.length < 4) {
      setError('Mínimo 4 dígitos')
      return
    }
    if (newPin !== confirm) {
      setError('Los PINs nuevos no coinciden')
      return
    }
    if (oldPin === newPin) {
      setError('El nuevo PIN debe ser diferente')
      return
    }
    setBusy(true)
    setError('')
    const result = await changeCurrentPin(oldPin, newPin)
    setBusy(false)
    if (result.ok) {
      toast({ title: 'PIN cambiado', description: 'Tu nuevo PIN está activo.' })
      onOpenChange(false)
    } else {
      setError(result.error ?? 'Error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Cambiar PIN
          </DialogTitle>
          <DialogDescription>Ingresa tu PIN actual y el nuevo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN actual"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="tabular-nums"
          />
          <Input
            type="password"
            inputMode="numeric"
            placeholder="Nuevo PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="tabular-nums"
          />
          <Input
            type="password"
            inputMode="numeric"
            placeholder="Repetir nuevo PIN"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            className="tabular-nums"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Guardando...' : 'Cambiar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Subdiálogo: desactivar PIN ----------

function DisablePinDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const { disablePin } = useAuth()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPin('')
      setError('')
    }
  }, [open])

  async function submit() {
    setBusy(true)
    setError('')
    const result = await disablePin(pin)
    setBusy(false)
    if (result.ok) {
      toast({ title: 'PIN desactivado', description: 'La app ya no requiere PIN.' })
      onDone()
    } else {
      setError(result.error ?? 'Error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-4 w-4 text-amber-500" /> Quitar PIN
          </DialogTitle>
          <DialogDescription>
            Ingresa tu PIN actual. Tus datos quedarán sin cifrar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="PIN actual"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            className="tabular-nums"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || pin.length < 4}>
            {busy ? 'Quitando...' : 'Quitar PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Subdiálogo: borrar todo ----------

function WipeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            ¿Borrar todos los datos?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente todos tus bancos, transacciones, exchanges y configuración.
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-rose-600 hover:bg-rose-700"
          >
            Sí, borrar todo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
