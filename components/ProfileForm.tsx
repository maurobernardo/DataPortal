'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'

type ProfileFormProps = {
  initialName: string
  email: string
  role: 'user' | 'admin'
  hasPassword: boolean
  memberSince: string | null
  totpEnabled: boolean
  pedidoEliminacaoEm: string | null
  totpObrigatorio: boolean
  /** null = ainda não respondeu ao popup de notificações (fica "Não escolhido" até responder). */
  receberNotificacoes: boolean | null
}

export function ProfileForm({
  initialName,
  email,
  role,
  hasPassword,
  memberSince,
  totpEnabled,
  pedidoEliminacaoEm: pedidoEliminacaoEmInicial,
  totpObrigatorio,
  receberNotificacoes: receberNotificacoesInicial,
}: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState(false)

  const [currentEmail, setCurrentEmail] = useState(email)
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailStep, setEmailStep] = useState<'form' | 'code'>('form')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailInfo, setEmailInfo] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const nameChanged = name.trim() !== initialName.trim() && name.trim().length > 0

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    setNameSuccess(false)
    setNameSaving(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível guardar as alterações.')
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err: any) {
      setNameError(err.message)
    } finally {
      setNameSaving(false)
    }
  }

  function resetEmailFlow() {
    setEditingEmail(false)
    setEmailStep('form')
    setNewEmail('')
    setEmailPassword('')
    setEmailCode('')
    setEmailError('')
    setEmailInfo('')
  }

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailInfo('')
    setEmailSaving(true)
    try {
      const response = await fetch('/api/auth/change-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: emailPassword }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string; message?: string }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível enviar o código.')
      setEmailInfo(data.message || 'Código enviado para o novo email.')
      setEmailStep('code')
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleConfirmEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailSaving(true)
    try {
      const response = await fetch('/api/auth/change-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: emailCode.trim() }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string; user?: { email: string } }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível confirmar a alteração.')
      setCurrentEmail(data.user?.email || newEmail.trim())
      resetEmailFlow()
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setEmailSaving(false)
    }
  }

  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [pedidoEliminacaoEm, setPedidoEliminacaoEm] = useState(pedidoEliminacaoEmInicial)
  const [aCancelarEliminacao, setACancelarEliminacao] = useState(false)

  async function handleExportData() {
    setExporting(true)
    try {
      const response = await fetch('/api/auth/export-data')
      if (!response.ok) throw new Error('Não foi possível exportar os dados.')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dataportal-os-meus-dados.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      /* falha silenciosa é aceitável para uma exportação — utilizador pode tentar novamente */
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError('')

    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR') {
      setDeleteError('Escreva ELIMINAR para confirmar.')
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: deletePassword }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string; pedidoEliminacaoEm?: string }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível agendar a eliminação da conta.')
      setPedidoEliminacaoEm(data.pedidoEliminacaoEm || new Date().toISOString())
      setDeleteOpen(false)
      setDeletePassword('')
      setDeleteConfirmText('')
    } catch (err: any) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleCancelarEliminacao() {
    setACancelarEliminacao(true)
    try {
      const response = await fetch('/api/auth/cancel-delete-account', { method: 'POST' })
      if (response.ok) setPedidoEliminacaoEm(null)
    } finally {
      setACancelarEliminacao(false)
    }
  }

  const [totpActive, setTotpActive] = useState(totpEnabled)
  const [totpSetupOpen, setTotpSetupOpen] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState('')
  const [totpQrCode, setTotpQrCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpBackupCodes, setTotpBackupCodes] = useState<string[]>([])
  const [totpConfirmCode, setTotpConfirmCode] = useState('')
  const [totpCopied, setTotpCopied] = useState(false)

  const [totpDisableOpen, setTotpDisableOpen] = useState(false)
  const [totpDisablePassword, setTotpDisablePassword] = useState('')

  const [receberNotificacoes, setReceberNotificacoes] = useState(receberNotificacoesInicial)
  const [notificacoesSaving, setNotificacoesSaving] = useState(false)

  async function alterarNotificacoes(receber: boolean) {
    setNotificacoesSaving(true)
    const anterior = receberNotificacoes
    setReceberNotificacoes(receber)
    try {
      const res = await fetch('/api/auth/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receber }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setReceberNotificacoes(anterior)
    } finally {
      setNotificacoesSaving(false)
    }
  }

  async function handleStartTotpSetup() {
    setTotpError('')
    setTotpLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const { data, ok } = await parseApiResponse<{
        error?: string
        secret?: string
        qrCodeDataUrl?: string
        backupCodes?: string[]
      }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível iniciar a configuração.')
      setTotpQrCode(data.qrCodeDataUrl || '')
      setTotpSecret(data.secret || '')
      setTotpBackupCodes(data.backupCodes || [])
      setTotpSetupOpen(true)
    } catch (err: any) {
      setTotpError(err.message)
    } finally {
      setTotpLoading(false)
    }
  }

  async function handleConfirmTotpSetup(e: React.FormEvent) {
    e.preventDefault()
    setTotpError('')
    setTotpLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpConfirmCode.trim() }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string }>(response)
      if (!ok) throw new Error(data.error || 'Código inválido.')
      setTotpActive(true)
      setTotpSetupOpen(false)
      setTotpConfirmCode('')
    } catch (err: any) {
      setTotpError(err.message)
    } finally {
      setTotpLoading(false)
    }
  }

  async function handleDisableTotp(e: React.FormEvent) {
    e.preventDefault()
    setTotpError('')
    setTotpLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: totpDisablePassword }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível desactivar o 2FA.')
      setTotpActive(false)
      setTotpDisableOpen(false)
      setTotpDisablePassword('')
      setTotpQrCode('')
      setTotpSecret('')
      setTotpBackupCodes([])
    } catch (err: any) {
      setTotpError(err.message)
    } finally {
      setTotpLoading(false)
    }
  }

  function copyBackupCodes() {
    navigator.clipboard?.writeText(totpBackupCodes.join('\n')).then(() => {
      setTotpCopied(true)
      setTimeout(() => setTotpCopied(false), 2000)
    })
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const { data, ok } = await parseApiResponse<{ error?: string }>(response)
      if (!ok) throw new Error(data.error || 'Não foi possível alterar a senha.')
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {totpObrigatorio && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 md:p-6 flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <Smartphone className="w-4.5 h-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-amber-900">Configure a verificação em duas etapas para continuar</h2>
            <p className="text-sm text-amber-800 mt-1">
              Contas de administrador passaram a exigir 2FA, por terem acesso a acções sensíveis
              (eliminar datasets, gerir outros administradores). Active-o na secção abaixo para
              recuperar o acesso ao painel de administração.
            </p>
          </div>
        </div>
      )}

      {/* ── Informações pessoais ─────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 text-green-600">
            <User className="w-4.5 h-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Informações pessoais</h2>
            <p className="text-xs text-gray-500">O seu nome é usado em toda a plataforma.</p>
          </div>
        </div>

        {nameError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{nameError}</span>
          </div>
        )}
        {nameSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Alterações guardadas com sucesso.</span>
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleSaveName} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                placeholder="O seu nome completo"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!nameChanged || nameSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {nameSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                'Guardar alterações'
              )}
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              {!editingEmail && (
                <button
                  type="button"
                  onClick={() => setEditingEmail(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700"
                >
                  <Pencil className="w-3 h-3" />
                  Alterar
                </button>
              )}
            </div>

            {!editingEmail ? (
              <div className="px-4 py-2.5 border-2 border-gray-100 bg-gray-50 rounded-xl text-sm text-gray-600">
                <span className="truncate">{currentEmail}</span>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-green-100 bg-green-50/40 p-3.5 space-y-3">
                {emailError && (
                  <div className="flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
                {emailInfo && emailStep === 'code' && (
                  <div className="flex items-center gap-2 rounded-lg border-2 border-green-200 bg-white px-3 py-2 text-xs text-green-800">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{emailInfo}</span>
                  </div>
                )}

                {emailStep === 'form' ? (
                  <form onSubmit={handleRequestEmailChange} className="space-y-2.5">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      placeholder="Novo email"
                      className="w-full px-3.5 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white"
                    />
                    {hasPassword && (
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        required
                        placeholder="Senha actual"
                        className="w-full px-3.5 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={emailSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enviar código'}
                      </button>
                      <button
                        type="button"
                        onClick={resetEmailFlow}
                        className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmEmailChange} className="space-y-2.5">
                    <p className="text-xs text-gray-600">
                      Introduza o código de 6 dígitos enviado para <strong>{newEmail}</strong>.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="000000"
                      className="w-full px-3.5 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white tracking-[0.3em] text-center font-bold"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={emailSaving || emailCode.length !== 6}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar alteração'}
                      </button>
                      <button
                        type="button"
                        onClick={resetEmailFlow}
                        className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {memberSince && (
            <p className="text-xs text-gray-500">
              Conta {role === 'admin' ? 'de administrador ' : ''}criada em {memberSince}.
            </p>
          )}
        </div>
      </div>

      {/* ── Alterar palavra-passe ────────────────────────────── */}
      {hasPassword ? (
        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 text-green-600">
              <KeyRound className="w-4.5 h-4.5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Alterar palavra-passe</h2>
              <p className="text-xs text-gray-500">Use uma senha forte que não utilize noutro lugar.</p>
            </div>
          </div>

          {passwordError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Senha alterada com sucesso.</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Senha actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Mínimo 12 caracteres"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Deve incluir maiúscula, minúscula, número e símbolo.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {passwordSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                A alterar...
              </>
            ) : (
              'Alterar senha'
            )}
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6 flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 text-green-600 shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Conta ligada por login social</h2>
            <p className="text-sm text-gray-500 mt-1">
              A sua conta foi criada com Google/LinkedIn e não tem palavra-passe própria para alterar
              aqui.
            </p>
          </div>
        </div>
      )}

      {/* ── Verificação em duas etapas (TOTP) — apenas admin ─── */}
      {role === 'admin' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 text-green-600">
              <Smartphone className="w-4.5 h-4.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Verificação em duas etapas</h2>
                {totpActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    Activo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Reforce a segurança da sua conta de administrador com uma aplicação autenticadora (TOTP).
              </p>
            </div>
          </div>

          {totpError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{totpError}</span>
            </div>
          )}

          {!totpActive && !totpSetupOpen && (
            <button
              type="button"
              onClick={handleStartTotpSetup}
              disabled={totpLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activar verificação em duas etapas'}
            </button>
          )}

          {totpSetupOpen && (
            <form onSubmit={handleConfirmTotpSetup} className="space-y-4">
              <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
                <li>
                  Digitalize o código QR com o Google Authenticator, Authy ou outra aplicação TOTP.
                  {totpQrCode && (
                    <div className="mt-2 flex justify-center">
                      <Image
                        src={totpQrCode}
                        alt="Código QR para configurar a verificação em duas etapas"
                        width={180}
                        height={180}
                        className="rounded-lg border border-gray-200"
                        unoptimized
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5 text-center break-all">
                    Ou introduza manualmente: <span className="font-mono">{totpSecret}</span>
                  </p>
                </li>
                <li>
                  Guarde estes códigos de backup, cada um só pode ser usado uma vez, caso perca o acesso à
                  aplicação:
                  <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 font-mono text-xs grid grid-cols-2 gap-1.5">
                    {totpBackupCodes.map((code) => (
                      <span key={code}>{code}</span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={copyBackupCodes}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700"
                  >
                    {totpCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {totpCopied ? 'Copiado' : 'Copiar códigos'}
                  </button>
                </li>
                <li>
                  Introduza o código gerado pela aplicação para confirmar:
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totpConfirmCode}
                    onChange={(e) => setTotpConfirmCode(e.target.value)}
                    required
                    placeholder="000000"
                    className="mt-2 w-full px-3.5 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm tracking-[0.3em] text-center font-bold"
                  />
                </li>
              </ol>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={totpLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm disabled:opacity-50"
                >
                  {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e activar'}
                </button>
                <button
                  type="button"
                  onClick={() => setTotpSetupOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {totpActive && !totpDisableOpen && (
            <button
              type="button"
              onClick={() => setTotpDisableOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-700 rounded-xl hover:bg-red-50 transition font-semibold text-sm"
            >
              Desactivar verificação em duas etapas
            </button>
          )}

          {totpActive && totpDisableOpen && (
            <form onSubmit={handleDisableTotp} className="space-y-3">
              {hasPassword && (
                <input
                  type="password"
                  value={totpDisablePassword}
                  onChange={(e) => setTotpDisablePassword(e.target.value)}
                  required
                  placeholder="Senha actual"
                  className="w-full px-3.5 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition text-sm"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={totpLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold text-sm disabled:opacity-50"
                >
                  {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar desactivação'}
                </button>
                <button
                  type="button"
                  onClick={() => setTotpDisableOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Notificações por email ──────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600">
              <Bell className="w-4.5 h-4.5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Notificações por email</h2>
              <p className="text-xs text-gray-500">
                Um email sempre que houver um novo dataset, relatório ou dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(receberNotificacoes)}
            onClick={() => alterarNotificacoes(!receberNotificacoes)}
            disabled={notificacoesSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              receberNotificacoes ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                receberNotificacoes ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {receberNotificacoes === null && (
          <p className="text-xs text-amber-600 mt-3">
            Ainda não escolheu; por agora não está a receber estes emails.
          </p>
        )}
      </div>

      {/* ── Dados pessoais e zona de perigo ──────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600">
            <Download className="w-4.5 h-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Os meus dados</h2>
            <p className="text-xs text-gray-500">Descarregue uma cópia dos seus dados pessoais.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportData}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              A exportar...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exportar os meus dados
            </>
          )}
        </button>
      </div>

      <div className="rounded-2xl border-2 border-red-100 bg-red-50/30 p-5 md:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="w-4.5 h-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-red-900">Zona de perigo</h2>
            <p className="text-xs text-red-700/80">
              {pedidoEliminacaoEm
                ? 'A sua conta está agendada para eliminação definitiva.'
                : 'Eliminar a conta agenda a remoção definitiva dos seus dados dentro de 30 dias.'}
            </p>
          </div>
        </div>

        {pedidoEliminacaoEm ? (
          <div className="space-y-3">
            <p className="text-xs text-red-800 bg-white border-2 border-red-200 rounded-lg px-3 py-2.5">
              Pedida em {new Date(pedidoEliminacaoEm).toLocaleString('pt-PT')}. Continua com acesso
              normal à conta até lá; se mudar de ideias, cancele o pedido abaixo antes do prazo
              terminar.
            </p>
            <button
              type="button"
              onClick={handleCancelarEliminacao}
              disabled={aCancelarEliminacao}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#064E2C] text-white rounded-xl hover:bg-[#04361F] transition font-semibold text-sm disabled:opacity-50"
            >
              {aCancelarEliminacao ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A cancelar...
                </>
              ) : (
                'Cancelar pedido de eliminação'
              )}
            </button>
          </div>
        ) : !deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition font-semibold text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar conta
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-3">
            {deleteError && (
              <div className="flex items-center gap-2 rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            {hasPassword && (
              <div>
                <label className="block text-xs font-semibold text-red-800 mb-1.5">Senha actual</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition text-sm bg-white"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-red-800 mb-1.5">
                Escreva ELIMINAR para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                required
                placeholder="ELIMINAR"
                className="w-full px-3.5 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition text-sm bg-white uppercase"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold text-sm disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    A agendar...
                  </>
                ) : (
                  'Agendar eliminação'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false)
                  setDeleteError('')
                  setDeletePassword('')
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
