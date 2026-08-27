import { NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError } from '@/lib/errors'
import * as notificationService from '@/lib/modules/notification/notification.service'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const notifications = await notificationService.listNotifications(tenantId)
    return NextResponse.json({ ok: true, data: notifications })
  } catch (err) {
    return errorResponse(err)
  }
}

function errorResponse(err: unknown) {
  if (err instanceof TenantError) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: err.message } },
      { status: 401 }
    )
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message } },
      { status: err.statusCode }
    )
  }
  throw err
}
