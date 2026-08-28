import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')

const resend = new Resend(process.env.RESEND_API_KEY)

// Falls back to Resend's sandbox sender, which only delivers to the email
// address on the Resend account itself. Set RESEND_FROM_EMAIL once a
// sending domain is verified in Resend.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ messageId: string }> {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })

  if (error) throw new Error(`Email send failed: ${error.message}`)
  return { messageId: data?.id ?? '' }
}
