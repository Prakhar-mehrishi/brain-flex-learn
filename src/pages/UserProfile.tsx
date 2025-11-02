import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  Trophy, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Calendar,
  CheckCircle,
  XCircle,
  Star,
  Activity
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  points: number;
  streak_count: number;
  avatar_url: string | null;
  created_at: string;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  completed_at: string;
  time_spent_seconds: number;
  correct_answers: number;
  total_questions: number;
  quizzes: {
    title: string;
    topic: string;
  };
}

interface Assignment {
  id: string;
  quiz_id: string;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  assigned_at: string;
  quizzes: {
    title: string;
    topic: string;
  };
}

interface EngagementMetric {
  date: string;
  quizzes_completed: number;
  total_time_spent_seconds: number;
  total_score: number;
}

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [engagement, setEngagement] = useState<EngagementMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch quiz attempts
      const { data: attemptsData } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          score,
          completed_at,
          time_spent_seconds,
          correct_answers,
          total_questions,
          quizzes:quiz_id (title, topic)
        `)
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      setAttempts(attemptsData as QuizAttempt[] || []);

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('quiz_assignments')
        .select(`
          id,
          quiz_id,
          due_date,
          is_completed,
          completed_at,
          assigned_at,
          quizzes:quiz_id (title, topic)
        `)
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      setAssignments(assignmentsData as Assignment[] || []);

      // Fetch engagement metrics
      const { data: engagementData } = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      setEngagement(engagementData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">User not found</p>
            <Button onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avgScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;

  const totalTimeSpent = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0);
  const totalHours = Math.floor(totalTimeSpent / 3600);
  const totalMinutes = Math.floor((totalTimeSpent % 3600) / 60);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h1 className="text-3xl font-bold">{profile.full_name || "Anonymous"}</h1>
                      <p className="text-muted-foreground">{profile.email}</p>
                    </div>
                    <Badge variant={profile.role === 'admin' ? "default" : "secondary"}>
                      {profile.role}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Points</p>
                        <p className="text-lg font-bold">{profile.points}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Streak</p>
                        <p className="text-lg font-bold">{profile.streak_count} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Quizzes</p>
                        <p className="text-lg font-bold">{attempts.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Score</p>
                        <p className="text-lg font-bold">{avgScore}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attempts">Quiz Attempts</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Time Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {totalHours}h {totalMinutes}m
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {assignments.length > 0 
                        ? Math.round((assignments.filter(a => a.is_completed).length / assignments.length) * 100)
                        : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 5 quiz attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No quiz attempts yet</p>
                ) : (
                  <div className="space-y-3">
                    {attempts.slice(0, 5).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{(attempt.quizzes as any)?.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(attempt.completed_at).toLocaleDateString()} • {(attempt.quizzes as any)?.topic}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={attempt.score >= 70 ? "default" : "secondary"}>
                            {attempt.score}%
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(attempt.time_spent_seconds / 60)}m
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz Attempts Tab */}
          <TabsContent value="attempts">
            <Card>
              <CardHeader>
                <CardTitle>All Quiz Attempts</CardTitle>
                <CardDescription>Complete history of quiz performances</CardDescription>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No quiz attempts yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Correct/Total</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {(attempt.quizzes as any)?.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{(attempt.quizzes as any)?.topic}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={attempt.score >= 70 ? "default" : "secondary"}>
                              {attempt.score}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {attempt.correct_answers}/{attempt.total_questions}
                          </TableCell>
                          <TableCell>
                            {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
                          </TableCell>
                          <TableCell>
                            {new Date(attempt.completed_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Assignments</CardTitle>
                <CardDescription>Assigned quizzes and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No assignments yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {(assignment.quizzes as any)?.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{(assignment.quizzes as any)?.topic}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {assignment.due_date 
                              ? new Date(assignment.due_date).toLocaleDateString()
                              : 'No due date'}
                          </TableCell>
                          <TableCell>
                            {assignment.is_completed ? (
                              <Badge className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {assignment.completed_at 
                              ? new Date(assignment.completed_at).toLocaleDateString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement">
            <Card>
              <CardHeader>
                <CardTitle>Daily Engagement Metrics</CardTitle>
                <CardDescription>Activity tracking over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {engagement.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No engagement data yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quizzes Completed</TableHead>
                        <TableHead>Time Spent</TableHead>
                        <TableHead>Total Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {engagement.map((metric, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(metric.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{metric.quizzes_completed}</TableCell>
                          <TableCell>
                            {Math.floor(metric.total_time_spent_seconds / 60)}m
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{metric.total_score}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;
