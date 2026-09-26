import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Utensils,
  HeartHandshake,
  ShieldCheck,
  PlusCircle,
  FileText,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Sparkles,
} from "lucide-react";
import Logo from "../common/Logo";
import NotificationDropdown from "../notification/NotificationDropdown";
import { useAuth } from "../../context/AuthContext";

const getNavItemsForRole = (role) => {
  if (role === "recipient") {
    return [
      { name: "Overview", path: "/recipient/dashboard", icon: LayoutDashboard },
      { name: "Available Food", path: "/food", icon: Utensils },
      { name: "My Profile", path: "/profile", icon: User },
      { name: "Settings", path: "/settings", icon: Settings },
    ];
  }
  if (role === "admin") {
    return [
      { name: "Overview", path: "/admin/dashboard", icon: LayoutDashboard },
      {
        name: "Verification Queue",
        path: "/admin/verifications",
        icon: ShieldCheck,
      },
      { name: "All Listings", path: "/food", icon: Utensils },
      { name: "Settings", path: "/settings", icon: Settings },
    ];
  }
  // Default Business role
  return [
    { name: "Overview", path: "/business/dashboard", icon: LayoutDashboard },
    { name: "Reservations", path: "/business/reservations", icon: FileText },
    { name: "Post Surplus", path: "/list-food", icon: PlusCircle },
    { name: "Marketplace", path: "/food", icon: Utensils },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
  ];
};

const DashboardLayout = ({ children, title = "Dashboard" }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { currentUser, userRole, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  const navItems = getNavItemsForRole(userRole);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 text-charcoal-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-charcoal-100 shadow-soft-xs sticky top-0 h-screen shrink-0 z-30">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-charcoal-100">
          <Logo size="md" showTagline />
        </div>

        {/* Navigation Items */}
        <nav
          className="flex-1 p-4 space-y-1.5 overflow-y-auto"
          aria-label="Dashboard Navigation"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150
                ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-soft-xs border border-brand-200/50"
                    : "text-charcoal-700 hover:text-charcoal-900 hover:bg-surface-100"
                }
              `}
            >
              <item.icon className="w-4 h-4 shrink-0 text-brand-600" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-charcoal-100 bg-surface-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-black flex items-center justify-center text-xs shrink-0">
                {currentUser?.displayName
                  ? currentUser.displayName[0].toUpperCase()
                  : "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-charcoal-900 truncate">
                  {currentUser?.displayName ||
                    currentUser?.email?.split("@")[0] ||
                    "Partner User"}
                </p>
                <p className="text-[10px] text-brand-700 font-semibold uppercase tracking-wider">
                  {userRole}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-charcoal-100 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-soft-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 rounded-xl text-charcoal-700 hover:bg-surface-100"
              aria-label="Toggle Dashboard Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <h1 className="text-lg sm:text-xl font-black text-charcoal-900 tracking-tight">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* Role Badge Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span className="capitalize">{userRole} Portal</span>
            </div>
          </div>
        </header>

        {/* Mobile Slide-out Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-charcoal-950/40 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative w-64 bg-white h-full shadow-soft-xl flex flex-col z-10">
              <div className="p-4 border-b border-charcoal-100 flex items-center justify-between">
                <Logo size="sm" />
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 text-charcoal-500 hover:text-charcoal-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all
                      ${
                        isActive
                          ? "bg-brand-50 text-brand-700 font-extrabold"
                          : "text-charcoal-700 hover:bg-surface-100"
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 text-brand-600" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="p-4 border-t border-charcoal-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto page-enter">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
