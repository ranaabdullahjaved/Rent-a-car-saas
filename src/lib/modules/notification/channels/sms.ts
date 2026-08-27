// No SMS provider is specified in the fixed tech stack — this channel is
// wired into the notification pipeline but has no backing provider yet.
// Pick one (e.g. Twilio, a local Pakistani aggregator) before enabling it.
export async function sendSms(_to: string, _body: string): Promise<{ messageId: string }> {
  throw new Error('SMS channel has no provider configured yet')
}
