import StatCard from "@/components/StatCard";
import RepCard from "@/components/RepCard";
import TodaysRouteWidget from "@/components/dashboard/TodaysRouteWidget";
import WeeklyPerformanceReport from "@/components/dashboard/WeeklyPerformanceReport";
import { Users, DollarSign, TrendingUp, Target, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import winzerLogo from "@/assets/winzer-logo.png";

// Mock data
const stats = [
  {
    title: "Total Reps",
    value: 24,
    change: "+3 this month",
    changeType: "positive" as const,
    icon: Users,
    iconColor: "text-primary",
  },
  {
    title: "Active Deals",
    value: 156,
    change: "+12% from last month",
    changeType: "positive" as const,
    icon: Target,
    iconColor: "text-accent",
  },
  {
    title: "Total Revenue",
    value: "$2.4M",
    change: "+18% from last month",
    changeType: "positive" as const,
    icon: DollarSign,
    iconColor: "text-success",
  },
  {
    title: "Avg Performance",
    value: "87%",
    change: "+5% improvement",
    changeType: "positive" as const,
    icon: TrendingUp,
    iconColor: "text-primary",
  },
];

const topReps = [
  {
    name: "Sarah Johnson",
    email: "sarah.j@winzer.com",
    status: "active" as const,
    dealsCount: 23,
    revenue: 485000,
    performance: 94,
  },
  {
    name: "Michael Chen",
    email: "michael.c@winzer.com",
    status: "active" as const,
    dealsCount: 19,
    revenue: 420000,
    performance: 91,
  },
  {
    name: "Emily Rodriguez",
    email: "emily.r@winzer.com",
    status: "active" as const,
    dealsCount: 21,
    revenue: 398000,
    performance: 88,
  },
  {
    name: "David Kim",
    email: "david.k@winzer.com",
    status: "active" as const,
    dealsCount: 17,
    revenue: 365000,
    performance: 85,
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your team's overview.</p>
        </div>
        <img 
          src={winzerLogo} 
          alt="Winzer" 
          className="h-10 w-auto opacity-80 hidden lg:block"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div 
            key={stat.title} 
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Today's Route & Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <TodaysRouteWidget />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: '500ms' }}>
          <WeeklyPerformanceReport />
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="space-y-4 animate-slide-up" style={{ animationDelay: '600ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Top Performers</h2>
            <p className="text-sm text-muted-foreground">Your highest performing reps this month</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reps..."
              className="pl-9 bg-card border-border/50 shadow-card focus:shadow-elevated transition-shadow"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {topReps.map((rep, index) => (
            <div 
              key={rep.email}
              className="animate-scale-in"
              style={{ animationDelay: `${700 + index * 100}ms` }}
            >
              <RepCard {...rep} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
