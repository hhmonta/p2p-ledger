'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Shield, Lock, Delete, Fingerprint } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface LockScreenProps {
  /** Modo: 'unlock' para desbloquear, 'setup' para crear PIN por primera vez */
  mode?: 'unlock' | 'setup'
  /** En modo setup, se llama cuando se confirma el PIN */
  onSetupComplete?: () => void
  /** En modo setup, se llama para cancelar */
  onCancel?: () => void
}

export function LockScreen({ mode = 'unlock', onSetupComplete, onCancel }: LockScreenProps) {
  const { unlock, setupPin, config, lockoutRemaining, state } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmPin, setConfirmPin] = useState('')
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter')

  const isSetup = mode === 'setup'

  const submit = useCallback(
    async (value: string) => {
      if (value.length < 4) return
      setBusy(true)
      setError('')
      try {
        if (isSetup) {
          if (stage === 'enter') {
            setConfirmPin(value)
            setStage('confirm')
            setPin('')
          } else {
            // confirmar
            if (value !== confirmPin) {
              setError('Los PINs no coinciden. Intenta de nuevo.')
              setStage('enter')
              setConfirmPin('')
              setPin('')
              return
            }
            await setupPin(value)
            toast({ title: 'PIN configurado', description: 'Tu app ahora está protegida.' })
            onSetupComplete?.()
          }
        } else {
          const result = await unlock(value)
          if (!result.ok) {
            setError(result.error ?? 'Error')
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setBusy(false)
      }
    },
    [isSetup, stage, confirmPin, setupPin, unlock, onSetupComplete]
  )

  const handleKey = (digit: string) => {
    if (busy) return
    if (pin.length >= 8) return
    const next = pin + digit
    setPin(next)
    if (next.length >= 4 && (next.length === 8 || isSetup)) {
      // en setup requerimos explícitamente Enter; en unlock probamos automáticamente a 4-8
    }
    if (!isSetup && (next.length === 4 || next.length === 6 || next.length === 8)) {
      // autointento solo si la longitud coincide con la esperada
      // Como no sabemos la longitud del PIN de antemano, intentamos en cada hit
      void submit(next)
    }
  }

  const handleDelete = () => {
    if (busy) return
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  const handleSubmit = () => {
    if (busy || pin.length < 4) return
    void submit(pin)
  }

  // Hook para bloquear teclado físico
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (busy) return
      if (/^\d$/.test(e.key)) {
        handleKey(e.key)
      } else if (e.key === 'Backspace') {
        handleDelete()
      } else if (e.key === 'Enter') {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const dots = Array.from({ length: Math.max(pin.length, 4) }, (_, i) => i < pin.length)
  const lockoutSeconds = Math.ceil(lockoutRemaining / 1000)

  const subtitle = isSetup
    ? stage === 'enter'
      ? 'Crea un PIN de 4 a 8 dígitos'
      : 'Confirma tu PIN'
    : state === 'no-pin'
      ? 'Ingresa tu PIN para desbloquear'
      : 'Ingresa tu PIN para desbloquear'

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Icono */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          {isSetup ? <Shield className="h-8 w-8 text-white" /> : <Lock className="h-8 w-8 text-white" />}
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            {isSetup ? 'Configurar seguridad' : 'P2P Ledger'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-3 mb-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition ${
              i < pin.length
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-muted-foreground/40'
            }`}
          />
        ))}
        {pin.length > 4 && (
          <>
            {[4, 5].map((i) => (
              <div
                key={i}
                className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                  i < pin.length
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-muted-foreground/40'
                }`}
              />
            ))}
            {pin.length > 6 && (
              <div
                className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                  6 < pin.length
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-muted-foreground/40'
                }`}
              />
            )}
          </>
        )}
      </div>

      {/* Error / info */}
      <div className="h-8 flex items-center">
        {lockoutSeconds > 0 ? (
          <p className="text-sm text-rose-500 font-medium">
            Bloqueado. Espera {lockoutSeconds}s
          </p>
        ) : error ? (
          <p className="text-sm text-rose-500 font-medium">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {config.failedAttempts > 0 && !isSetup
              ? `Intento ${config.failedAttempts + 1} de 5`
              : '\u00A0'}
          </p>
        )}
      </div>

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3 mt-4 max-w-[280px] w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleKey(d)}
            disabled={busy || lockoutSeconds > 0}
            className="h-16 rounded-2xl bg-muted/50 hover:bg-muted active:scale-95 transition text-2xl font-medium tabular-nums flex items-center justify-center disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        {isSetup ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-16 rounded-2xl hover:bg-muted active:scale-95 transition text-sm text-muted-foreground flex items-center justify-center"
          >
            Cancelar
          </button>
        ) : (
          <div className="h-16" />
        )}
        <button
          key="0"
          type="button"
          onClick={() => handleKey('0')}
          disabled={busy || lockoutSeconds > 0}
          className="h-16 rounded-2xl bg-muted/50 hover:bg-muted active:scale-95 transition text-2xl font-medium tabular-nums flex items-center justify-center disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy || pin.length === 0}
          className="h-16 rounded-2xl hover:bg-muted active:scale-95 transition flex items-center justify-center disabled:opacity-30"
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>

      {/* Botón confirmar (visible cuando hay >= 4 dígitos) */}
      {pin.length >= 4 && !isSetup && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || lockoutSeconds > 0}
          className="mt-6 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
        >
          {busy ? 'Verificando...' : 'Desbloquear'}
        </button>
      )}
      {isSetup && pin.length >= 4 && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="mt-6 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
        >
          {busy ? 'Guardando...' : stage === 'enter' ? 'Continuar' : 'Confirmar PIN'}
        </button>
      )}

      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-8 flex items-center gap-1.5">
        <Fingerprint className="h-3.5 w-3.5" />
        Tu PIN se guarda solo en este dispositivo
      </p>
    </div>
  )
}
