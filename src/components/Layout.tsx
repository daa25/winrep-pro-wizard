import { Home, Users, BarChart3, Settings, TrendingUp, Mail, Navigation, Target, LogOut, ShoppingCart, FileText, Receipt, MapPin, Package, Activity } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import winzerLogo from "@/assets/winzer-logo.png";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Receipts", href: "/receipts", icon: Receipt },
  { name: "Customers", href: "/customers", icon: MapPin },
  { name: "Products", href: "/products", icon: Package },
  { name: "Reps", href: "/reps", icon: Users },
  { name: "Performance", href: "/performance", icon: TrendingUp },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Lead Generation", href: "/lead-generation", icon: Target },
  { name: "Email Drafting", href: "/email-drafting", icon: Mail },
  { name: "Predictive Analysis", href: "/predictive-analysis", icon: TrendingUp },
  { name: "Route Optimization", href: "/route-optimization", icon: Navigation },
  { name: "Route Accounts", href: "/route-accounts", icon: MapPin },
  { name: "Weekly Routes", href: "/weekly-routes", icon: Navigation },
  { name: "Function Monitoring", href: "/monitoring", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar shadow-elevated">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center border-b border-sidebar-border px-4">
            <Link to="/" className="flex items-center gap-3 hover-scale">
              <img 
                src={winzerLogo} 
                alt="Winzer" 
                className="h-12 w-auto drop-shadow-lg"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow-accent"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-sidebar-accent/50">
              <div className="h-10 w-10 rounded-full bg-gradient-accent flex items-center justify-center shadow-glow-accent">
                <span className="text-sm font-bold text-accent-foreground">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  Sales Rep
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground glow-button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 pl-64">
        <main role="main" className="container mx-auto p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
