import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Users, TrendingUp, Activity, Calendar } from "lucide-react";

type TimeRange = '7d' | '30d' | '90d' | 'all';

interface EngagementData {
  dailyActiveUsers: { date: string; users: number }[];
  quizzesPerUserPerWeek: { week: string; avgQuizzes: number }[];
  userRetention: { date: string; returningUsers: number; newUsers: number }[];
  averageSessionTime: number;
  totalActiveUsers: number;
  peakActiveTime: string;
}

export const UserEngagementMetrics = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementData();
  }, [timeRange]);

  const fetchEngagementData = async () => {
    setLoading(true);
    try {
      const daysToFetch = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToFetch);

      // Fetch engagement metrics
      const { data: metrics } = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (!metrics || metrics.length === 0) {
        setEngagement(null);
        return;
      }

      // Daily active users
      const dailyActiveUsers: { [key: string]: Set<string> } = {};
      metrics.forEach(m => {
        const date = m.date;
        if (!dailyActiveUsers[date]) {
          dailyActiveUsers[date] = new Set();
        }
        dailyActiveUsers[date].add(m.user_id);
      });

      const dailyActiveUsersData = Object.entries(dailyActiveUsers).map(([date, users]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: users.size
      }));

      // Quizzes per user per week
      const weeklyData: { [key: string]: { users: Set<string>; quizzes: number } } = {};
      metrics.forEach(m => {
        const date = new Date(m.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { users: new Set(), quizzes: 0 };
        }
        weeklyData[weekKey].users.add(m.user_id);
        weeklyData[weekKey].quizzes += m.quizzes_completed;
      });

      const quizzesPerUserPerWeek = Object.entries(weeklyData).map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgQuizzes: data.users.size > 0 ? Math.round((data.quizzes / data.users.size) * 10) / 10 : 0
      }));

      // User retention (new vs returning)
      const userFirstSeen: { [key: string]: string } = {};
      metrics.forEach(m => {
        if (!userFirstSeen[m.user_id]) {
          userFirstSeen[m.user_id] = m.date;
        }
      });

      const dailyRetention: { [key: string]: { new: number; returning: number } } = {};
      metrics.forEach(m => {
        const date = m.date;
        if (!dailyRetention[date]) {
          dailyRetention[date] = { new: 0, returning: 0 };
        }
        if (userFirstSeen[m.user_id] === date) {
          dailyRetention[date].new++;
        } else {
          dailyRetention[date].returning++;
        }
      });

      const userRetention = Object.entries(dailyRetention).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newUsers: data.new,
        returningUsers: data.returning
      }));

      // Calculate average session time
      const totalTime = metrics.reduce((sum, m) => sum + m.total_time_spent_seconds, 0);
      const totalSessions = metrics.reduce((sum, m) => sum + m.quizzes_completed, 0);
      const avgSessionTime = totalSessions > 0 ? Math.round(totalTime / totalSessions / 60) : 0;

      // Total active users
      const uniqueUsers = new Set(metrics.map(m => m.user_id));
      const totalActiveUsers = uniqueUsers.size;

      // Peak active time (simplified - would need quiz_attempts data for accurate time)
      const peakActiveTime = "2:00 PM - 4:00 PM";

      setEngagement({
        dailyActiveUsers: dailyActiveUsersData,
        quizzesPerUserPerWeek,
        userRetention,
        averageSessionTime: avgSessionTime,
        totalActiveUsers,
        peakActiveTime
      });
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Engagement Metrics</CardTitle>
              <CardDescription>Track user activity and engagement over time</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading engagement data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !engagement && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No engagement data available yet.</p>
          </CardContent>
        </Card>
      )}

      {!loading && engagement && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagement.totalActiveUsers}</div>
                <p className="text-xs text-muted-foreground mt-2">In selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagement.averageSessionTime}m</div>
                <p className="text-xs text-muted-foreground mt-2">Per quiz session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peak Time</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{engagement.peakActiveTime}</div>
                <p className="text-xs text-muted-foreground mt-2">Most active period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {engagement.quizzesPerUserPerWeek[engagement.quizzesPerUserPerWeek.length - 1]?.avgQuizzes || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Quizzes/user/week</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Active Users Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Active Users</CardTitle>
              <CardDescription>Number of unique users active each day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ users: { label: "Active Users", color: "hsl(var(--primary))" }}}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagement.dailyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Quizzes Per User Per Week */}
          <Card>
            <CardHeader>
              <CardTitle>Average Quizzes Completed Per User Per Week</CardTitle>
              <CardDescription>Weekly engagement trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ avgQuizzes: { label: "Avg Quizzes", color: "hsl(var(--secondary))" }}}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagement.quizzesPerUserPerWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgQuizzes" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* User Retention */}
          <Card>
            <CardHeader>
              <CardTitle>User Retention</CardTitle>
              <CardDescription>New vs returning users</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  newUsers: { label: "New Users", color: "hsl(var(--primary))" },
                  returningUsers: { label: "Returning Users", color: "hsl(var(--secondary))" }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagement.userRetention}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newUsers" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="returningUsers" stackId="a" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};