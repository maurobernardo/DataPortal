import { NextResponse } from 'next/server'
import { generateOtp, generateToken, hashPassword } from '@/lib/auth'
import { createAuthUser, deleteAuthUser, findUserByEmail, setUserOtp } from '@/lib/db'
import { hasAuthMailConfig, sendRegistrationVerificationEmail } from '@/lib/mailer'
import { isStrongPassword, isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'

export async function POST(request: Request) {
  try {
    if (!hasAuthMailConfig()) {
      return NextResponse.json(
        { error: 'Serviço de email não configurado. Contacte o administrador.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const name = normalizeText(body?.name, 120)
    const email = normalizeEmail(body?.email)
    const password = normalizeText(body?.password, 256)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`register:${ip}:${email}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          error:
            'A senha deve ter no mínimo 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
        },
        { status: 400 }
      )
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json({ error: 'Este email já está registado' }, { status: 409 })
      }
      return NextResponse.json(
        {
          error: 'Este email já tem registo pendente. Confirme o código ou reenvie a verificação.',
          needsVerification: true,
          email,
        },
        { status: 409 }
      )
    }

    const verificationToken = generateToken()
    const verificationExpires = new Date(Date.now() + 30 * 60 * 1000)
    const verificationCode = generateOtp()
    const passwordHash = await hashPassword(password)

    const user = await createAuthUser({
      name,
      email,
      passwordHash,
      verificationToken,
      verificationExpires,
    })

    if (!user) {
      return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
    }

    await setUserOtp(user.id, verificationCode, verificationExpires)

    try {
      await sendRegistrationVerificationEmail(email, verificationCode, verificationToken)
    } catch (mailError) {
      await deleteAuthUser(user.id)
      console.error('Register mail error:', mailError)
      return NextResponse.json(
        { error: 'Não foi possível enviar o email de confirmação. Tente novamente mais tarde.' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      email,
      message:
        'Registo concluído! Enviámos um código de 6 dígitos para o seu email. Introduza-o para activar a conta.',
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
