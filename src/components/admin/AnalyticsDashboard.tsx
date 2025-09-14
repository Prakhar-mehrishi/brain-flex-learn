import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Target, Clock } from "lucide-react";

interface AnalyticsData {
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  topQuizzes: { title: string; attempts: number; avg_score: number }[];
  recentActivity: { date: string; attempts: number }[];
}

export const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAttempts: 0,
    averageScore: 0,
    completionRate: 0,
    topQuizzes: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch quiz attempts data
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          completed_at,
          quiz_id,
          quizzes (title)
        `);

      if (attemptsError) throw attemptsError;

      const totalAttempts = attempts?.length || 0;
      const completedAttempts = attempts?.filter(a => a.completed_at) || [];
      const completionRate = totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : 0;
      const averageScore = completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length 
        : 0;

      // Calculate top quizzes
      const quizStats: { [key: string]: { title: string; attempts: number; scores: number[] } } = {};
      
      attempts?.forEach(attempt => {
        const quizId = attempt.quiz_id;
        const title = (attempt.quizzes as any)?.title || 'Unknown Quiz';
        
        if (!quizStats[quizId]) {
          quizStats[quizId] = { title, attempts: 0, scores: [] };
        }
        
        quizStats[quizId].attempts++;
        if (attempt.completed_at) {
          quizStats[quizId].scores.push(attempt.score);
        }
      });

      const topQuizzes = Object.values(quizStats)
        .map(quiz => ({
          title: quiz.title,
          attempts: quiz.attempts,
          avg_score: quiz.scores.length > 0 
            ? quiz.scores.reduce((sum, score) => sum + score, 0) / quiz.scores.length 
            : 0
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 5);

      // Calculate recent activity (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const recentActivity = last7Days.map(date => {
        const dayAttempts = attempts?.filter(a => 
          a.completed_at?.startsWith(date)
        ).length || 0;
        
        return { date, attempts: dayAttempts };
      });

      setAnalytics({
        totalAttempts,
        averageScore: Math.round(averageScore),
        completionRate: Math.round(completionRate),
        topQuizzes,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quiz Attempts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              All time quiz attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore}%</div>
            <Progress value={analytics.averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Quizzes */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Quizzes</CardTitle>
          <CardDescription>Most attempted quizzes and their average scores</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topQuizzes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No quiz data available yet.</p>
          ) : (
            <div className="space-y-4">
              {analytics.topQuizzes.map((quiz, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{quiz.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {quiz.attempts} attempt{quiz.attempts !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {Math.round(quiz.avg_score)}% avg
                    </Badge>
                  </div>
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
            <Clock className="h-5 w-5" />
            Recent Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivity.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min((day.attempts / Math.max(...analytics.recentActivity.map(d => d.attempts))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {day.attempts}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};