import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Users, 
  LayoutDashboard,
  Scan,
  LogOut,
  LogIn,
  Building,
  KeyRound,
  Compass,
  FileCheck
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { cn } from "./lib/utils";

// Context & Protection
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Views
import UserView from "./components/UserView";
import AdminView from "./components/AdminView";
import DistributorStation from "./components/DistributorStation";
import Login from "./components/Login";

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const navItems = [
    { label: "🏠 الرئيسية", to: "/", authRequired: false },
    { label: "📋 التسجيل", to: "/admin", authRequired: true, role: "admin" },
    { label: "📦 الموزع", to: "/distributor", authRequired: true, role: "distributor" },
    { label: "🔍 استعلام", to: "/", authRequired: false, action: "focus-search" },
  ];

  const handleNavItemClick = (item: typeof navItems[0]) => {
    if (item.action === "focus-search") {
      navigate("/");
      setTimeout(() => {
        const input = document.getElementById("national-id-input");
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return;
    }
    
    if (item.authRequired) {
      if (!auth.isAuthenticated) {
        navigate("/login");
        toast.error("يرجى تسجيل الدخول أولاً للوصول إلى هذه الصفحة");
      } else {
        if (item.role === 'admin' && auth.role !== 'admin') {
          toast.error("هذه الصفحة مخصصة لمدير النظام فقط");
        } else {
          navigate(item.to);
        }
      }
    } else {
      navigate(item.to);
    }
  };

  const handleControlClick = () => {
    if (!auth.isAuthenticated) {
      navigate("/login");
      toast.error("يرجى تسجيل الدخول أولاً للوصول إلى لوحة التحكم");
    } else if (auth.role !== 'admin') {
      toast.error("لوحة التحكم مخصصة لمدير النظام فقط");
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="w-full flex flex-col" dir="rtl">
      {/* Upper Brand Header */}
      <div className="w-full bg-gradient-to-r from-[#042a1d] via-[#053726] to-[#0f5c44] text-white py-4 px-4 sm:px-6 shadow-md border-b border-[#032016]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Golden Emblem Badge */}
            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-[#042a1d] shadow-lg shadow-black/20 ring-4 ring-amber-400/20 transform hover:scale-105 transition-all">
              <Building className="w-7 h-7" />
            </div>
            <div className="text-right">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-sans text-amber-300">
                منصة توزيع المخصصات
              </h1>
              <p className="text-emerald-200/80 text-xs sm:text-sm font-sans font-medium">
                بوابة الخدمات الموحدة للرعاية والمساعدات العينية والنقدية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {auth.isAuthenticated ? (
              <div className="flex items-center gap-3 bg-[#032016]/60 px-4 py-2 rounded-2xl border border-emerald-800/40">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-sans text-emerald-200">
                  {auth.role === 'admin' ? "مدير النظام" : "الموزع المعتمد"}
                </span>
                <button 
                  onClick={handleLogout}
                  className="mr-2 text-xs font-sans text-rose-300 hover:text-rose-100 flex items-center gap-1 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-800/30 transition-all font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="text-xs font-sans text-amber-300 hover:text-amber-100 flex items-center gap-1.5 bg-amber-950/20 px-4 py-2 rounded-2xl border border-amber-600/30 transition-all font-bold"
              >
                <KeyRound className="w-4 h-4" />
                <span>دخول الكادر الميداني</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Lower Navigation Menu Bar */}
      <nav className="w-full bg-[#053726] border-b border-emerald-950 shadow-sm px-4 py-1.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
          {/* Main Links */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            {navItems.map((item, index) => {
              const isActive = item.action === "focus-search" 
                ? location.pathname === "/" 
                : location.pathname === item.to;
              return (
                <button
                  key={index}
                  onClick={() => handleNavItemClick(item)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-sans transition-all",
                    isActive
                      ? "bg-amber-400/10 text-amber-300 shadow-inner"
                      : "text-emerald-100/90 hover:text-white hover:bg-emerald-900/40"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Yellow Pills Control Panel Link */}
          <button
            onClick={handleControlClick}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-extrabold font-sans transition-all shadow-md transform hover:-translate-y-0.5",
              location.pathname === "/admin"
                ? "bg-amber-300 text-[#042a1d] scale-105"
                : "bg-amber-400 text-emerald-950 hover:bg-amber-300 hover:shadow-lg"
            )}
          >
            <span>التحكم ⚙️</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export function AppContent() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Toaster position="top-center" />
      
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<UserView />} />
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminView />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/distributor" 
            element={
              <ProtectedRoute requiredRole="distributor">
                <DistributorStation />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<UserView />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
