import { Topbar as TopbarClient } from './topbar-client'

type TopbarProps = {
  tenantName: string
  userName: string
  userEmail: string
}

export function Topbar(props: TopbarProps) {
  return <TopbarClient {...props} />
}
