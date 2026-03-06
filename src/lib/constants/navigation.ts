import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Calculator,
  BookOpen,
  Settings,
  TrendingUp,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export const APP_NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & quick compare',
  },
  {
    title: 'Best Rates',
    href: '/rates',
    icon: TrendingUp,
    description: 'Current rates from all banks',
  },
  {
    title: 'Compare',
    href: '/compare/fixed-deposits',
    icon: ArrowLeftRight,
    description: 'Head-to-head comparison',
  },
  {
    title: 'Real Estate',
    href: '/real-estate',
    icon: Building2,
    description: 'Property investment analysis',
  },
  {
    title: 'Tax Advisor',
    href: '/tax-advisor',
    icon: Calculator,
    description: 'DTAA & tax optimization',
  },
  {
    title: 'Knowledge Hub',
    href: '/knowledge-hub',
    icon: BookOpen,
    description: 'NRI investing guides',
  },
  { title: 'Settings', href: '/settings', icon: Settings, description: 'Your preferences' },
];
