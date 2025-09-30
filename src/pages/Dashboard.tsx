import StatCard from "@/components/StatCard";
import RepCard from "@/components/RepCard";
import { Users, DollarSign, TrendingUp, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
    email: "sarah.j@winrep.pro",
    status: "active" as const,
    dealsCount: 23,
    revenue: 485000,
    performance: 94,
  },
  {
    name: "Michael Chen",
    email: "michael.c@winrep.pro",
    status: "active" as const,
    dealsCount: 19,
    revenue: 420000,
    performance: 91,
  },
  {
    name: "Emily Rodriguez",
    email: "emily.r@winrep.pro",
    status: "active" as const,
    dealsCount: 21,
    revenue: 398000,
    performance: 88,
  },
  {
    name: "David Kim",
    email: "david.k@winrep.pro",
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
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your team's overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Top Performers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Top Performers</h2>
            <p className="text-sm text-muted-foreground">Your highest performing reps this month</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reps..."
              className="pl-9 bg-card border-border/50"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {topReps.map((rep) => (
            <RepCard key={rep.email} {...rep} />
          ))}
        </div>
      </div>
    </div>
  );
}
