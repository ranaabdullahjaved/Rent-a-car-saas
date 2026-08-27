import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ messageId: string }> {
  const { data, error } = await resend.emails.send({
    from: 'notifications@yourdomain.com',
    to,
    subject,
    html,
  })

  if (error) throw new Error(`Email send failed: ${error.message}`)
  return { messageId: data?.id ?? '' }
}
