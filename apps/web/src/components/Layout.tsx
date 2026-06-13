import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "H" },
  { to: "/appointments", label: "Schedule", icon: "S" },
  { to: "/patients", label: "Patients", icon: "P" },
  { to: "/clients", label: "Clients", icon: "C" },
  { to: "/services", label: "Services", icon: "Sv" },
  { to: "/users", label: "Users", icon: "U", roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/settings", label: "Settings", icon: "St", roles: ["SUPER_ADMIN", "ADMIN"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? ""),
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <h1 className="text-lg font-bold text-indigo-600">Vitalis EHR</h1>
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            {user?.firstName} {user?.lastName}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {visibleItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-500">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <button
            onClick={logout}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
