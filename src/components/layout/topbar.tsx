import { UserMenu } from './user-menu'

type TopbarProps = {
  tenantName: string
  userName: string
  userEmail: string
}

export function Topbar({ tenantName, userName, userEmail }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
      <span className="truncate text-sm font-medium">{tenantName}</span>
      <UserMenu name={userName} email={userEmail} />
    </header>
  )
}
