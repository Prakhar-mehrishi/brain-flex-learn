import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuizCreationForm } from "@/components/admin/QuizCreationForm";
import { QuizList } from "@/components/admin/QuizList";
import { UserManagement } from "@/components/admin/UserManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, BarChart3, Plus } from "lucide-react";

const AdminDashboard = () => {
  const { user, session } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalUsers: 0,
    totalAttempts: 0,
    avgScore: 0
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setUserRole(profile?.role || null);
    };

    const fetchStats = async () => {
      try {
        const [quizzesRes, usersRes, attemptsRes] = await Promise.all([
          supabase.from('quizzes').select('id', { count: 'exact' }),
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('quiz_attempts').select('score', { count: 'exact' })
        ]);

        const avgScore = attemptsRes.data?.length ? 
          attemptsRes.data.reduce((sum, attempt) => sum + attempt.score, 0) / attemptsRes.data.length : 0;

        setStats({
          totalQuizzes: quizzesRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalAttempts: attemptsRes.count || 0,
          avgScore: Math.round(avgScore)
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchUserRole();
    fetchStats();
  }, [user]);

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage quizzes, users, and view analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Badge variant="outline">{stats.avgScore}%</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}%</div>
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
                  Create quizzes using AI by providing content or uploading files
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