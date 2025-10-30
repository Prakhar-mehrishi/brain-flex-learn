import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users, Clock, Target, Award } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
}

interface QuizPerformance {
  averageScore: number;
  completionRate: number;
  totalAttempts: number;
  averageTimeSpent: number;
  scoreDistribution: { range: string; count: number }[];
  timeDistribution: { range: string; count: number }[];
  attemptsTrend: { date: string; attempts: number; avgScore: number }[];
  topPerformers: { name: string; score: number; time: number }[];
  questionPerformance: { question: string; correctRate: number }[];
}

export const QuizPerformanceReport = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>("");
  const [performance, setPerformance] = useState<QuizPerformance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuiz) {
      fetchPerformanceData(selectedQuiz);
    }
  }, [selectedQuiz]);

  const fetchQuizzes = async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setQuizzes(data);
      setSelectedQuiz(data[0].id);
    }
  };

  const fetchPerformanceData = async (quizId: string) => {
    setLoading(true);
    try {
      // Fetch quiz attempts with user profiles
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          time_spent_seconds,
          completed_at,
          total_questions,
          profiles!quiz_attempts_user_id_fkey (full_name)
        `)
        .eq('quiz_id', quizId)
        .not('completed_at', 'is', null);

      if (!attempts || attempts.length === 0) {
        setPerformance(null);
        return;
      }

      // Calculate average score
      const avgScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
      
      // Calculate completion rate
      const { count: totalStarted } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);
      
      const completionRate = totalStarted ? (attempts.length / totalStarted) * 100 : 0;
      
      // Calculate average time
      const avgTime = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0) / attempts.length;

      // Score distribution
      const scoreRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
      const scoreDistribution = scoreRanges.map(range => {
        const [min, max] = range.split('-').map(Number);
        const count = attempts.filter(a => a.score >= min && a.score <= max).length;
        return { range, count };
      });

      // Time distribution (in minutes)
      const timeRanges = ['0-5', '6-10', '11-15', '16-20', '21+'];
      const timeDistribution = timeRanges.map(range => {
        if (range === '21+') {
          const count = attempts.filter(a => a.time_spent_seconds / 60 > 20).length;
          return { range, count };
        }
        const [min, max] = range.split('-').map(Number);
        const count = attempts.filter(a => {
          const minutes = a.time_spent_seconds / 60;
          return minutes >= min && minutes <= max;
        }).length;
        return { range, count };
      });

      // Attempts trend (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const attemptsTrend = last30Days.map(date => {
        const dayAttempts = attempts.filter(a => a.completed_at?.startsWith(date));
        const avgScore = dayAttempts.length > 0
          ? dayAttempts.reduce((sum, a) => sum + a.score, 0) / dayAttempts.length
          : 0;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          attempts: dayAttempts.length,
          avgScore: Math.round(avgScore)
        };
      });

      // Top performers
      const topPerformers = attempts
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(a => ({
          name: (a.profiles as any)?.full_name || 'Unknown',
          score: a.score,
          time: Math.round(a.time_spent_seconds / 60)
        }));

      // Question performance
      const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, order_index')
        .eq('quiz_id', quizId)
        .order('order_index');

      const questionPerformance = [];
      if (questions) {
        for (const question of questions) {
          const { data: questionAttempts } = await supabase
            .from('question_attempts')
            .select('is_correct')
            .eq('question_id', question.id);

          if (questionAttempts && questionAttempts.length > 0) {
            const correctCount = questionAttempts.filter(qa => qa.is_correct).length;
            const correctRate = (correctCount / questionAttempts.length) * 100;
            questionPerformance.push({
              question: `Q${question.order_index + 1}: ${question.question_text.substring(0, 50)}...`,
              correctRate: Math.round(correctRate)
            });
          }
        }
      }

      setPerformance({
        averageScore: Math.round(avgScore),
        completionRate: Math.round(completionRate),
        totalAttempts: attempts.length,
        averageTimeSpent: Math.round(avgTime / 60),
        scoreDistribution,
        timeDistribution,
        attemptsTrend,
        topPerformers,
        questionPerformance
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Performance Report</CardTitle>
          <CardDescription>Detailed analytics for quiz performance</CardDescription>
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger className="w-full mt-4">
              <SelectValue placeholder="Select a quiz" />
            </SelectTrigger>
            <SelectContent>
              {quizzes.map(quiz => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading performance data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !performance && selectedQuiz && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No performance data available for this quiz yet.</p>
          </CardContent>
        </Card>
      )}

      {!loading && performance && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.averageScore}%</div>
                <Progress value={performance.averageScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.completionRate}%</div>
                <Progress value={performance.completionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.totalAttempts}</div>
                <p className="text-xs text-muted-foreground mt-2">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.averageTimeSpent}m</div>
                <p className="text-xs text-muted-foreground mt-2">Per attempt</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Score</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.topPerformers[0]?.score || 0}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {performance.topPerformers[0]?.name || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Attempts & Score Trend (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      attempts: { label: "Attempts", color: "hsl(var(--primary))" },
                      avgScore: { label: "Avg Score", color: "hsl(var(--secondary))" }
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performance.attemptsTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" dataKey="attempts" stroke="hsl(var(--primary))" />
                        <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="hsl(var(--secondary))" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{ count: { label: "Students", color: "hsl(var(--primary))" }}}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performance.scoreDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Time Distribution (minutes)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{ count: { label: "Students", color: "hsl(var(--secondary))" }}}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performance.timeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--secondary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="questions">
              <Card>
                <CardHeader>
                  <CardTitle>Question Performance</CardTitle>
                  <CardDescription>Correct answer rate by question</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performance.questionPerformance.map((q, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{q.question}</span>
                          <Badge variant={q.correctRate >= 70 ? "default" : q.correctRate >= 50 ? "secondary" : "destructive"}>
                            {q.correctRate}%
                          </Badge>
                        </div>
                        <Progress value={q.correctRate} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Highest scoring students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performance.topPerformers.map((performer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={idx === 0 ? "default" : "outline"}>#{idx + 1}</Badge>
                          <span className="font-medium">{performer.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold">{performer.score}%</div>
                            <div className="text-xs text-muted-foreground">{performer.time}m</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};