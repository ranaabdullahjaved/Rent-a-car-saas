if (!process.env.WHATSAPP_TOKEN) throw new Error('WHATSAPP_TOKEN is not set')

const GRAPH_API_URL = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`

export async function sendWhatsApp(to: string, body: string): Promise<{ messageId: string }> {
  const res = await fetch(GRAPH_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })

  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { messages: { id: string }[] }
  return { messageId: data.messages[0]?.id ?? '' }
}
