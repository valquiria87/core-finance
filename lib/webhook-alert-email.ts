import nodemailer from 'nodemailer'

type WebhookAlert = {
  eventId: string
  eventType: string
  errorMessage: string
}

export async function sendWebhookFailureAlert(alert: WebhookAlert) {
  const user = process.env.GMAIL_USER
  const password = process.env.GMAIL_APP_PASSWORD
  const recipient = process.env.ALERT_EMAIL_TO

  if (!user || !password || !recipient) {
    console.warn('[Webhook alert] Email not configured; failure alert skipped')
    return { sent: false, reason: 'not_configured' as const }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: password },
  })

  await transporter.sendMail({
    from: user,
    to: recipient,
    subject: '[Core Finance] Falha na sincronizacao Pluggy',
    text: [
      'A sincronizacao de dados do Core Finance falhou.',
      '',
      `Evento: ${alert.eventType}`,
      `ID: ${alert.eventId}`,
      `Erro: ${alert.errorMessage}`,
      '',
      'Consulte o painel de saude dos webhooks no Supabase.',
    ].join('\n'),
  })

  return { sent: true as const }
}
