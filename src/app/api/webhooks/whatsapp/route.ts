import { NextRequest, NextResponse } from 'next/server'

// WhatsApp Cloud API verification handshake.
// https://developers.facebook.com/docs/graph-api/webhooks/getting-started
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const payload = await request.json()
  // TODO: parse incoming message/status payload and route to notification service
  console.log('WhatsApp webhook payload:', JSON.stringify(payload))
  return NextResponse.json({ ok: true })
}
