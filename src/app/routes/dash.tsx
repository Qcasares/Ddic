import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/sidebar';
import { NavLink } from '@/components/nav-link';
import { 
  BookOpen, 
  ClipboardCheck, 
  LibraryBig, 
  Activity, 
  Settings, 
  User 
} from 'lucide-react';

export function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar>
        <nav className="flex flex-col gap-1 px-2">
          <NavLink
            to="/dictionaries"
            icon={<BookOpen className="h-4 w-4" />}
            label="Dictionaries"
          />
          <NavLink
            to="/approvals"
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="Approvals"
            badge={0}
          />
          <NavLink
            to="/business-glossary"
            icon={<LibraryBig className="h-4 w-4" />}
            label="Business Glossary"
          />
          <NavLink
            to="/data-quality"
            icon={<Activity className="h-4 w-4" />}
            label="Data Quality"
          />
          <div className="mt-auto">
            <NavLink
              to="/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
            />
            <NavLink
              to="/profile"
              icon={<User className="h-4 w-4" />}
              label="Profile"
            />
          </div>
        </nav>
      </Sidebar>
      
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
