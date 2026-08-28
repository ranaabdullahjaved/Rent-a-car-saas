import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tenants, users } from '@/db/schema'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { requireTenantOrRedirect } from '@/lib/tenant'

// Every page under this layout is tenant-scoped, so none of them can be
// statically rendered.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /login when there is no usable session. requireTenant is
  // wrapped in React cache(), so a page calling it again reuses this query.
  const { userId } = await requireTenantOrRedirect()

  const [context] = await db
    .select({
      tenantName: tenants.name,
      userName: users.name,
      userEmail: users.email,
    })
    .from(users)
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .where(eq(users.id, userId))
    .limit(1)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          tenantName={context?.tenantName ?? 'Workspace'}
          userName={context?.userName ?? ''}
          userEmail={context?.userEmail ?? ''}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
