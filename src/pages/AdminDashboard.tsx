import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuizCreationForm } from "@/components/admin/QuizCreationForm";
import { QuizList } from "@/components/admin/QuizList";
import { UserManagement } from "@/components/admin/UserManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, BarChart3, Plus, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalQuizzes: number;
  totalUsers: number;
  totalAttempts: number;
  avgScore: number;
  publishedQuizzes: number;
  activeUsers: number;
}

const AdminDashboard = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalQuizzes: 0,
    totalUsers: 0,
    totalAttempts: 0,
    avgScore: 0,
    publishedQuizzes: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        // First, verify user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Failed to load user profile');
          return;
        }

        setUserRole(profile?.role || null);

        // If not admin, the Navigate component will handle redirect
        if (profile?.role !== 'admin') {
          setLoading(false);
          return;
        }

        // Load admin stats
        await loadAdminStats();

      } catch (error) {
        console.error('Error fetching admin data:', error);
        setError('Failed to load admin dashboard');
        toast({
          title: "Error",
          description: "Failed to load admin dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const loadAdminStats = async () => {
      try {
        const [quizzesRes, usersRes, attemptsRes, publishedRes] = await Promise.all([
          supabase.from('quizzes').select('id', { count: 'exact' }),
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('quiz_attempts').select('score', { count: 'exact' }),
          supabase.from('quizzes').select('id', { count: 'exact' }).eq('is_published', true)
        ]);

        const avgScore = attemptsRes.data?.length ? 
          attemptsRes.data.reduce((sum, attempt) => sum + attempt.score, 0) / attemptsRes.data.length : 0;

        // Get active users (users with attempts in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: activeUsersData } = await supabase
          .from('quiz_attempts')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo.toISOString());

        const uniqueActiveUsers = new Set(activeUsersData?.map(a => a.user_id) || []).size;

        setStats({
          totalQuizzes: quizzesRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalAttempts: attemptsRes.count || 0,
          avgScore: Math.round(avgScore),
          publishedQuizzes: publishedRes.count || 0,
          activeUsers: uniqueActiveUsers
        });
      } catch (error) {
        console.error('Error loading admin stats:', error);
        throw error;
      }
    };

    fetchAdminData();
  }, [user, toast]);

  // Authentication and role checks
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole === null && loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading admin dashboard...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading admin dashboard...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Admin Dashboard</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Manage quizzes, users, and view analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.publishedQuizzes} published
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active (30d)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
              <p className="text-xs text-muted-foreground">
                All time total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Badge variant="outline">{stats.avgScore}%</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}%</div>
              <p className="text-xs text-muted-foreground">
                Platform average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Badge variant="default">{stats.publishedQuizzes}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.publishedQuizzes}</div>
              <p className="text-xs text-muted-foreground">
                Live quizzes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Badge variant="secondary">{stats.activeUsers}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="create-quiz" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create-quiz" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Quiz
            </TabsTrigger>
            <TabsTrigger value="quiz-management">Quiz Management</TabsTrigger>
            <TabsTrigger value="user-management">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="create-quiz">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Quiz Creation</CardTitle>
                <CardDescription>
                  Create quizzes using AI by providing content, uploading files, or entering a topic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuizCreationForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz-management">
            <QuizList />
          </TabsContent>

          <TabsContent value="user-management">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;