/**
 * @file app/dashboard/page.tsx
 * @description Route alias for the main Dashboard page.
 * Reuses the HomePage component located at the root route.
 */

import HomePage from '../page';

/**
 * Dashboard Page component.
 */
export default function DashboardPage() {
  return <HomePage />;
}
