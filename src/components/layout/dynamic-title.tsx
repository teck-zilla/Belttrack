'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ROUTE_TITLE_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/belts': 'Belt Progression',
  '/curriculum': 'Curriculum',
  '/attendance': 'Attendance & Roll-Call',
  '/ledger': 'Internal Ledger',
  '/students': 'Student Roster',
  '/directory': 'Public School Directory',
  '/belts/white-belt': 'White Belt Details',
  '/belts/blue-belt': 'Blue Belt Details',
  '/belts/purple-belt': 'Purple Belt Details',
  '/belts/brown-belt': 'Brown Belt Details',
  '/belts/black-belt': 'Black Belt Details',
};

/**
 * Resolves current pathname to a purely dynamic title string,
 * strictly excluding any static prefix or brand affix.
 */
export function resolveDynamicTitle(pathname: string | null): string {
  if (!pathname || pathname === '/') {
    return 'Dashboard';
  }

  const normalized = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  if (ROUTE_TITLE_MAP[normalized]) {
    return ROUTE_TITLE_MAP[normalized];
  }

  // Dynamic belt routes: /belts/:id
  const beltMatch = normalized.match(/^\/belts\/([^/]+)$/);
  if (beltMatch) {
    const formatted = beltMatch[1]
      .split(/[-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return `${formatted} Details`;
  }

  // General fallback: format last path segment
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length > 0) {
    return segments[segments.length - 1]
      .split(/[-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return 'Dashboard';
}

/**
 * Head title synchronizer that updates document.title on every navigation event.
 * Guarantees zero static string concatenation.
 */
export function DynamicTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const dynamicTitle = resolveDynamicTitle(pathname);
    if (typeof document !== 'undefined') {
      document.title = dynamicTitle;
    }
  }, [pathname]);

  return null;
}

