'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import {
  type AuthConfig,
  type PinRecord,
  getAuthConfig,
  saveAuthConfig,
  createPinRecord,
  verifyPinAndUnwrap,
  changePin,
  clearAuthConfig,
  isValidPin,
  MAX_FAILED_ATTEMPTS,
  getLockoutSeconds,
} from '@/lib/security'
import { setActiveDek, encryptAllStorage, decryptAllStorage } from '@/lib/storage'

type LockState = 'loading' | 'locked' | 'unlocked' | 'no-pin' | 'setup-required'

interface AuthContextValue {
  state: LockState
  config: AuthConfig
  /** DEK solo disponible cuando está desbloqueado */
  dek: CryptoKey | null
  /** Tiempo restante de bloqueo por intentos fallidos (ms) */
  lockoutRemaining: number
  /** Habilita PIN por primera vez */
  setupPin: (pin: string) => Promise<void>
  /** Desbloquea con PIN */
  unlock: (pin: string) => Promise<{ ok: boolean; error?: string }>
  /** Bloquea manualmente */
  lock: () => void
  /** Cambia el PIN actual */
  changeCurrentPin: (oldPin: string, newPin: string) => Promise<{ ok: boolean; error?: string }>
  /** Desactiva el PIN (requiere PIN actual) */
  disablePin: (pin: string) => Promise<{ ok: boolean; error?: string }>
  /** Cambia el timeout de auto-bloqueo (segundos) */
  setAutoLockSeconds: (seconds: number) => void
  /** Cambia la preferencia de bloqueo de screenshots */
  setBlockScreenshots: (block: boolean) => void
  /** Limpia todo: borra PIN, DEK y datos cifrados (destructivo) */
  wipeAll: () => void
  /** Reinicia el timer de inactividad */
  touchActivity: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockState>('loading')
  const [config, setConfig] = useState<AuthConfig>(() => getAuthConfig())
  const [dek, setDek] = useState<CryptoKey | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const lastActivityRef = useRef<number>(Date.now())
  const autoLockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persistir config cada vez que cambia
  const updateConfig = useCallback((next: AuthConfig) => {
    setConfig(next)
    saveAuthConfig(next)
  }, [])

  // Boot: decidir estado inicial
  useEffect(() => {
    const cfg = getAuthConfig()
    setConfig(cfg)
    if (!cfg.pinEnabled || !cfg.pinRecord) {
      setState('no-pin')
    } else if (cfg.lockedUntil && cfg.lockedUntil > Date.now()) {
      setState('locked')
      setLockoutRemaining(cfg.lockedUntil - Date.now())
    } else {
      setState('locked')
    }
  }, [])

  // Timer de auto-bloqueo por inactividad
  useEffect(() => {
    if (state !== 'unlocked' || config.autoLockSeconds <= 0) {
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current)
        autoLockTimerRef.current = null
      }
      return
    }
    autoLockTimerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      if (idle >= config.autoLockSeconds * 1000) {
        setDek(null)
        setActiveDek(null)
        setState('locked')
      }
    }, 5000)
    return () => {
      if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current)
    }
  }, [state, config.autoLockSeconds])

  // Timer de countdown de lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current)
        lockoutTimerRef.current = null
      }
      return
    }
    lockoutTimerRef.current = setInterval(() => {
      setLockoutRemaining((prev) => {
        const next = Math.max(0, prev - 1000)
        if (next === 0 && lockoutTimerRef.current) {
          clearInterval(lockoutTimerRef.current)
          lockoutTimerRef.current = null
        }
        return next
      })
    }, 1000)
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
    }
  }, [lockoutRemaining])

  // Auto-bloqueo cuando la app va a background (visibilitychange)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const handler = () => {
      if (document.visibilityState === 'hidden' && state === 'unlocked') {
        // Bloquear inmediatamente al background si hay PIN activo
        if (config.pinEnabled) {
          setDek(null)
          setActiveDek(null)
          setState('locked')
        }
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [state, config.pinEnabled])

  // Aplicar FLAG_SECURE en Android (bloquear screenshots)
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Capacitor exec nativo - solo en Android
    const cap = (window as unknown as { Capacitor?: { isNative?: boolean; getPlatform?: () => string } }).Capacitor
    if (!cap?.isNative) return
    if (cap.getPlatform?.() !== 'android') return
    // Aplicar vía plugin nativo si está disponible
    try {
      // @ts-expect-error - Plugin nativo opcional
      if (window.Capacitor?.Plugins?.SecureScreen) {
        // @ts-expect-error
        window.Capacitor.Plugins.SecureScreen.setBlock(config.blockScreenshots && state === 'unlocked')
      }
    } catch {
      // sin plugin nativo, sin acción
    }
  }, [config.blockScreenshots, state])

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const setupPin = useCallback(
    async (pin: string) => {
      if (!isValidPin(pin)) throw new Error('El PIN debe tener 4 a 8 dígitos')
      const { record, dek: newDek } = await createPinRecord(pin)
      const next: AuthConfig = {
        ...config,
        pinEnabled: true,
        pinRecord: record,
        lastUnlock: Date.now(),
        failedAttempts: 0,
        lockedUntil: null,
      }
      updateConfig(next)
      setDek(newDek)
      setActiveDek(newDek)
      // Cifrar todos los datos existentes en claro con la nueva DEK
      await encryptAllStorage(newDek)
      lastActivityRef.current = Date.now()
      setState('unlocked')
    },
    [config, updateConfig]
  )

  const unlock = useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string }> => {
      if (!config.pinRecord) return { ok: false, error: 'No hay PIN configurado' }
      // Verificar lockout activo
      if (config.lockedUntil && config.lockedUntil > Date.now()) {
        const remaining = Math.ceil((config.lockedUntil - Date.now()) / 1000)
        return { ok: false, error: `Bloqueado. Intenta en ${remaining}s` }
      }
      try {
        const dekKey = await verifyPinAndUnwrap(pin, config.pinRecord)
        // Reset intentos fallidos
        const next: AuthConfig = {
          ...config,
          lastUnlock: Date.now(),
          failedAttempts: 0,
          lockedUntil: null,
        }
        updateConfig(next)
        setDek(dekKey)
        setActiveDek(dekKey)
        lastActivityRef.current = Date.now()
        setState('unlocked')
        return { ok: true }
      } catch {
        // Incrementar intentos fallidos
        const attempts = config.failedAttempts + 1
        let lockedUntil: number | null = null
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          lockedUntil = Date.now() + getLockoutSeconds(attempts) * 1000
          setLockoutRemaining(lockedUntil - Date.now())
        }
        const next: AuthConfig = {
          ...config,
          failedAttempts: attempts,
          lockedUntil,
        }
        updateConfig(next)
        const remaining = MAX_FAILED_ATTEMPTS - attempts
        if (lockedUntil) {
          return { ok: false, error: `Demasiados intentos. Bloqueado ${getLockoutSeconds(attempts)}s` }
        }
        return {
          ok: false,
          error: remaining > 0 ? `PIN incorrecto. ${remaining} intento(s) restante(s)` : 'PIN incorrecto',
        }
      }
    },
    [config, updateConfig]
  )

  const lock = useCallback(() => {
    setDek(null)
    setActiveDek(null)
    setState('locked')
  }, [])

  const changeCurrentPin = useCallback(
    async (oldPin: string, newPin: string): Promise<{ ok: boolean; error?: string }> => {
      if (!config.pinRecord || !dek) return { ok: false, error: 'App bloqueada' }
      if (!isValidPin(newPin)) return { ok: false, error: 'El nuevo PIN debe tener 4 a 8 dígitos' }
      try {
        const newRecord: PinRecord = await changePin(oldPin, newPin, config.pinRecord, dek)
        updateConfig({ ...config, pinRecord: newRecord })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error' }
      }
    },
    [config, dek, updateConfig]
  )

  const disablePin = useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string }> => {
      if (!config.pinRecord) return { ok: false, error: 'No hay PIN configurado' }
      try {
        // Verificar PIN antes de desactivar
        const dekKey = await verifyPinAndUnwrap(pin, config.pinRecord)
        // Descifrar todos los datos a claro antes de quitar la DEK
        await decryptAllStorage(dekKey)
        const next: AuthConfig = {
          ...config,
          pinEnabled: false,
          pinRecord: null,
          failedAttempts: 0,
          lockedUntil: null,
        }
        updateConfig(next)
        setDek(null)
        setActiveDek(null)
        setState('no-pin')
        return { ok: true }
      } catch {
        return { ok: false, error: 'PIN incorrecto' }
      }
    },
    [config, updateConfig]
  )

  const setAutoLockSeconds = useCallback(
    (seconds: number) => {
      updateConfig({ ...config, autoLockSeconds: seconds })
    },
    [config, updateConfig]
  )

  const setBlockScreenshots = useCallback(
    (block: boolean) => {
      updateConfig({ ...config, blockScreenshots: block })
    },
    [config, updateConfig]
  )

  const wipeAll = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Borrar todo el storage de P2P Ledger
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('p2p:'))
      keys.forEach((k) => window.localStorage.removeItem(k))
    }
    clearAuthConfig()
    setDek(null)
    setConfig(getAuthConfig())
    setState('no-pin')
  }, [])

  const value: AuthContextValue = {
    state,
    config,
    dek,
    lockoutRemaining,
    setupPin,
    unlock,
    lock,
    changeCurrentPin,
    disablePin,
    setAutoLockSeconds,
    setBlockScreenshots,
    wipeAll,
    touchActivity,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
