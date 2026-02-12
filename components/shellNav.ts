import {
  LayoutDashboard,
  Search,
  MessagesSquare,
  Settings,
  Home,
  LifeBuoy,
} from 'lucide-react'

export type NavItem = { href: string; label: string; badge?: string; icon?: typeof LayoutDashboard }
export type NavGroup = { label: string; items: NavItem[] }

const defaultNav: NavGroup[] = [
  {
    label: 'Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/consultas', label: 'Consultas', icon: Search },
    ],
  },
  {
    label: 'Apps',
    items: [{ href: '/atendimento', label: 'Chat', icon: MessagesSquare }],
  },
  {
    label: 'Pages',
    items: [{ href: '/configuracoes', label: 'Configurações', icon: Settings, badge: 'Em breve' }],
  },
]

const iconByLabel: Record<string, typeof LayoutDashboard> = {
  Home,
  Consultas: Search,
  Suporte: LifeBuoy,
}

const portalNavItems: NavItem[] = [
  { href: '/app', label: 'Home' },
  { href: '/app/consultas', label: 'Consultas' },
  { href: '/app/suporte', label: 'Suporte' },
]

export const resolveNavGroups = (pathname: string): NavGroup[] => {
  if (pathname.startsWith('/app')) {
    return [
      {
        label: 'Menu',
        items: portalNavItems.map((item) => ({
          ...item,
          icon: item.icon ?? iconByLabel[item.label] ?? LayoutDashboard,
        })),
      },
    ]
  }

  return [
    {
      label: 'Menu',
      items: defaultNav[0].items.map((item) => ({
        ...item,
        icon: item.icon ?? iconByLabel[item.label] ?? LayoutDashboard,
      })),
    },
    ...defaultNav.slice(1),
  ]
}

export const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)
