import { NimbusIcons, type LiquidNavItem } from '@/components/ui/liquid-glass-navbar'

export const items: LiquidNavItem[] = [
  { label: 'Home', href: 'index.html', icon: NimbusIcons.home, fx: 'glow' },
  { label: 'About', href: 'about.html', icon: NimbusIcons.user, fx: 'wave' },
  { label: 'Programs', href: 'programs.html', icon: NimbusIcons.globe, fx: 'spin' },
  { label: 'Sunday School', href: 'sunday-school.html', icon: NimbusIcons.book, fx: 'pop' },
  { label: 'Visit & Contact', href: 'visit.html', icon: NimbusIcons.pin, fx: 'drop' },
  { label: 'Support us', href: 'donate.html', icon: NimbusIcons.heart, fx: 'glow' },
]
