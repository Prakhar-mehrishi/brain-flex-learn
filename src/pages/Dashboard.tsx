import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuizSummary from "@/components/QuizSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Trophy, 
  TrendingUp, 
  Clock, 
  Star, 
  Play, 
  AlertCircle, 
  BarChart3,
  Eye,
  RefreshCw,
  Filter,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssignedQuiz {
  id: string;
  title: string;
  topic: string;
  description: string;
  total_questions: number;
  created_at: string;
}

interface UserStats {
  totalQuizzesCompleted: number;
  averageScore: number;
  totalPoints: number;
  currentStreak: number;
  topicMastery: { topic: string; score: number; count: number }[];
}

interface RecentAttempt {
  id: string;
  quiz_title: string;
  score: number;
  completed_at: string;
  time_spent_seconds: number;
}

const Dashboard = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalQuizzesCompleted: 0,
    averageScore: 0,
    totalPoints: 0,
    currentStreak: 0,
    topicMastery: []
  });
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Helper functions
  const loadQuizzes = async () => {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, topic, description, total_questions, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Quizzes error:', error);
      throw error;
    }

    setAssignedQuizzes(quizzes || []);
  };

  const loadUserStats = async (profile: any) => {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
        id, score, completed_at, time_spent_seconds, total_questions,
        quizzes:quiz_id (title, topic)
      `)
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Stats error:', error);
      throw error;
    }

    if (attempts && attempts.length > 0) {
      const totalCompleted = attempts.length;
      const avgScore = Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length);

      // Group by topic for mastery tracking
      const topicGroups = attempts.reduce((acc, attempt) => {
        const topic = (attempt.quizzes as any)?.topic || 'Unknown';
        if (!acc[topic]) {
          acc[topic] = { scores: [], count: 0 };
        }
        acc[topic].scores.push(attempt.score);
        acc[topic].count++;
        return acc;
      }, {} as Record<string, { scores: number[]; count: number }>);

      const topicMastery = Object.entries(topicGroups).map(([topic, data]) => ({
        topic,
        score: Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length),
        count: data.count
      }));

      setUserStats({
        totalQuizzesCompleted: totalCompleted,
        averageScore: avgScore,
        totalPoints: profile?.points || 0,
        currentStreak: profile?.streak_count || 0,
        topicMastery
      });
    } else {
      setUserStats({
        totalQuizzesCompleted: 0,
        averageScore: 0,
        totalPoints: profile?.points || 0,
        currentStreak: profile?.streak_count || 0,
        topicMastery: []
      });
    }
  };

  const loadRecentAttempts = async () => {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
        id, score, completed_at, time_spent_seconds,
        quizzes:quiz_id (title)
      `)
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Recent attempts error:', error);
      throw error;
    }

    setRecentAttempts(
      (attempts || []).map(attempt => ({
        id: attempt.id,
        quiz_title: (attempt.quizzes as any)?.title || 'Unknown Quiz',
        score: attempt.score,
        completed_at: attempt.completed_at!,
        time_spent_seconds: attempt.time_spent_seconds
      }))
    );
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        // Get user profile and role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, points, streak_count, full_name')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Failed to load user profile');
          return;
        }

        setUserRole(profile?.role || 'user');

        // If user is admin, redirect to admin dashboard
        if (profile?.role === 'admin') {
          setLoading(false);
          return;
        }

        // Continue loading user data for non-admin users
        await Promise.all([
          loadQuizzes(),
          loadUserStats(profile),
          loadRecentAttempts()
        ]);

      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load dashboard data');
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, points, streak_count, full_name')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          await Promise.all([
            loadQuizzes(),
            loadUserStats(profile),
            loadRecentAttempts()
          ]);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredQuizzes = assignedQuizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Authentication and role checks
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your dashboard...</p>
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
              <h2 className="text-xl font-semibold mb-2">Unable to Load Dashboard</h2>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Learning Dashboard</h1>
              <p className="text-muted-foreground">Track your progress and continue learning</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalQuizzesCompleted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.averageScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalPoints}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.currentStreak}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Quizzes */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Quizzes</CardTitle>
                    <CardDescription>Start a new quiz to test your knowledge</CardDescription>
                  </div>
                  <Badge variant="secondary">{filteredQuizzes.length} available</Badge>
                </div>
                {assignedQuizzes.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search quizzes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {assignedQuizzes.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No quizzes available yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Check back later for new content!</p>
                  </div>
                ) : filteredQuizzes.length === 0 ? (
                  <div className="text-center py-8">
                    <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No quizzes match your search</p>
                    <p className="text-sm text-muted-foreground mt-2">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQuizzes.map((quiz) => (
                      <div key={quiz.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{quiz.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {quiz.description || "Test your knowledge on this topic"}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {quiz.total_questions} questions
                              </span>
                              <Badge variant="outline">{quiz.topic}</Badge>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                ~{quiz.total_questions * 2}min
                              </span>
                            </div>
                          </div>
                          <Button 
                            className="ml-4"
                            onClick={() => window.location.href = `/quiz/${quiz.id}`}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Quiz
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Topic Mastery */}
            <Card>
              <CardHeader>
                <CardTitle>Topic Mastery</CardTitle>
                <CardDescription>Your performance by subject</CardDescription>
              </CardHeader>
              <CardContent>
                {userStats.topicMastery.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Complete some quizzes to see your mastery</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userStats.topicMastery.map((topic) => (
                      <div key={topic.topic}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{topic.topic}</span>
                          <span className="text-sm text-muted-foreground">{topic.score}%</span>
                        </div>
                        <Progress value={topic.score} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {topic.count} quiz{topic.count !== 1 ? 'es' : ''} completed
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest quiz attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAttempts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAttempts.map((attempt) => (
                      <div key={attempt.id} className="group border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium truncate">{attempt.quiz_title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {Math.round(attempt.time_spent_seconds / 60)}m
                              <span>•</span>
                              {new Date(attempt.completed_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={attempt.score >= 80 ? "default" : attempt.score >= 60 ? "secondary" : "destructive"}>
                              {attempt.score}%
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedAttemptId(attempt.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Quiz Summary Dialog */}
      <Dialog open={!!selectedAttemptId} onOpenChange={() => setSelectedAttemptId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Summary</DialogTitle>
          </DialogHeader>
          {selectedAttemptId && (
            <QuizSummary
              attemptId={selectedAttemptId}
              onClose={() => setSelectedAttemptId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;