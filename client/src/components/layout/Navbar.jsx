import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, LogOut, LayoutDashboard } from "lucide-react";
import Logo from "../common/Logo";
import Button from "../common/Button";
import LanguageSwitcher from "../common/LanguageSwitcher";
import NotificationDropdown from "../notification/NotificationDropdown";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import UserLocationWidget from "../common/UserLocationWidget";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: t("nav.howItWorks", "How It Works"), path: "/how-it-works" },
    { name: "For Businesses", path: "/business" },
    { name: "For Recipients", path: "/recipient" },
    { name: t("nav.impact", "Impact"), path: "/impact" },
    { name: t("nav.findFood", "Surplus Food"), path: "/food" },
  ];

  const { currentUser, userRole, logout } = useAuth();

  // Handle scroll shadow transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle Escape key for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const getDashboardPath = () => {
    if (userRole === "recipient") return "/recipient/dashboard";
    if (userRole === "admin") return "/admin/dashboard";
    return "/business/dashboard";
  };

  return (
    <header
      className={`
        sticky top-0 z-50 w-full transition-all duration-200
        bg-white/90 backdrop-blur-md border-b
        ${isScrolled ? "border-charcoal-200 shadow-soft-sm py-2.5 sm:py-3" : "border-charcoal-100 py-3.5 sm:py-4"}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Zomato-style Location Widget */}
          <div className="flex items-center gap-4 lg:gap-6">
            <Logo size="md" />
            <UserLocationWidget />
          </div>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-1 lg:gap-2"
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `
                  px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-150
                  ${
                    isActive
                      ? "text-brand-700 bg-brand-50 font-bold"
                      : "text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50"
                  }
                `}
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Auth State / Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {currentUser ? (
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <NavLink to={getDashboardPath()}>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={LayoutDashboard}
                  >
                    {t("nav.dashboard", "Dashboard")}
                  </Button>
                </NavLink>

                <div className="flex items-center gap-2 pl-2 border-l border-charcoal-200">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-extrabold text-charcoal-900 line-clamp-1 max-w-[120px]">
                      {currentUser.displayName ||
                        currentUser.email?.split("@")[0]}
                    </span>
                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                      {userRole}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    title="Sign Out"
                    aria-label="Sign Out"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 p-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <NavLink to="/login">
                  <Button variant="ghost" size="sm">
                    {t("nav.login", "Log in")}
                  </Button>
                </NavLink>
                <NavLink to="/signup">
                  <Button variant="primary" size="sm" iconRight={ArrowRight}>
                    {t("nav.signup", "Sign up")}
                  </Button>
                </NavLink>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button & Notifications */}
          <div className="flex items-center gap-2 md:hidden">
            {currentUser && <NotificationDropdown />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl text-charcoal-700 hover:bg-charcoal-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={
                isMobileMenuOpen
                  ? "Close Navigation Menu"
                  : "Open Navigation Menu"
              }
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-charcoal-100 bg-white/95 backdrop-blur-lg px-4 pt-4 pb-6 shadow-soft-xl animate-in slide-in-from-top-2 duration-200">
          <nav
            className="flex flex-col space-y-1 mb-6"
            aria-label="Mobile Navigation"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `
                  px-4 py-3 text-base font-semibold rounded-xl transition-colors
                  ${
                    isActive
                      ? "text-brand-700 bg-brand-50 font-bold"
                      : "text-charcoal-800 hover:bg-charcoal-50"
                  }
                `}
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          <div className="pt-4 border-t border-charcoal-100 flex flex-col gap-3">
            {currentUser ? (
              <>
                <div className="p-3 bg-surface-50 rounded-xl border border-charcoal-100 mb-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-charcoal-900">
                      {currentUser.displayName || currentUser.email}
                    </p>
                    <span className="text-[10px] font-bold text-brand-700 uppercase">
                      Role: {userRole}
                    </span>
                  </div>
                </div>

                <NavLink to={getDashboardPath()} className="w-full">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    iconLeft={LayoutDashboard}
                  >
                    Go to Dashboard
                  </Button>
                </NavLink>

                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  iconLeft={LogOut}
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="w-full">
                  <Button variant="outline" size="md" fullWidth>
                    Login
                  </Button>
                </NavLink>
                <NavLink to="/signup" className="w-full">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    iconRight={ArrowRight}
                  >
                    Get Started
                  </Button>
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
