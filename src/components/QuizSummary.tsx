import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Target, 
  TrendingUp,
  BookOpen,
  Calendar,
  Award,
  BarChart3
} from "lucide-react";

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  completed_at: string;
  quiz_title: string;
  quiz_topic: string;
}

interface QuestionAttempt {
  id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  time_spent_seconds: number;
  explanation: string | null;
}

interface QuizSummaryProps {
  attemptId: string;
  onClose: () => void;
}

const QuizSummary = ({ attemptId, onClose }: QuizSummaryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questionAttempts, setQuestionAttempts] = useState<QuestionAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!user || !attemptId) return;

      try {
        // Fetch quiz attempt with quiz details
        const { data: attemptData, error: attemptError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            quizzes:quiz_id (title, topic)
          `)
          .eq('id', attemptId)
          .eq('user_id', user.id)
          .single();

        if (attemptError || !attemptData) {
          toast({
            title: "Error",
            description: "Failed to load quiz summary",
            variant: "destructive",
          });
          return;
        }

        setAttempt({
          ...attemptData,
          quiz_title: (attemptData.quizzes as any)?.title || 'Unknown Quiz',
          quiz_topic: (attemptData.quizzes as any)?.topic || 'Unknown Topic'
        });

        // Fetch question attempts with question details
        const { data: questionData, error: questionError } = await supabase
          .from('question_attempts')
          .select(`
            *,
            questions:question_id (question_text, correct_answer, explanation)
          `)
          .eq('quiz_attempt_id', attemptId);

        if (questionError) {
          console.error('Question attempts error:', questionError);
        } else {
          setQuestionAttempts(
            (questionData || []).map(qa => ({
              ...qa,
              question_text: (qa.questions as any)?.question_text || 'Unknown Question',
              correct_answer: (qa.questions as any)?.correct_answer || '',
              explanation: (qa.questions as any)?.explanation || null
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching summary data:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz summary",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [user, attemptId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz summary...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Quiz summary not found</p>
      </div>
    );
  }

  const percentage = attempt.score;
  const timeInMinutes = Math.round(attempt.time_spent_seconds / 60);
  const accuracy = Math.round((attempt.correct_answers / attempt.total_questions) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{attempt.quiz_title}</h2>
          <p className="text-muted-foreground">Quiz Summary</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Final Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{percentage}%</div>
            <Progress value={percentage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attempt.correct_answers}/{attempt.total_questions}</div>
            <p className="text-xs text-muted-foreground">{accuracy}% correct</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeInMinutes}m</div>
            <p className="text-xs text-muted-foreground">{attempt.time_spent_seconds}s total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topic</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{attempt.quiz_topic}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(attempt.completed_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {percentage >= 90 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800 dark:text-green-200">Excellent Performance!</h4>
              </div>
              <p className="text-green-700 dark:text-green-300 text-sm">
                Outstanding! You've demonstrated mastery of this topic. Your understanding is comprehensive and accurate.
              </p>
            </div>
          )}
          
          {percentage >= 70 && percentage < 90 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Good Performance!</h4>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Great job! You have a solid understanding of this topic. Review the areas you missed to reach mastery level.
              </p>
            </div>
          )}
          
          {percentage >= 50 && percentage < 70 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Room for Improvement</h4>
              </div>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                You're on the right track! Focus on the areas you struggled with and practice more to improve your understanding.
              </p>
            </div>
          )}
          
          {percentage < 50 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-800 dark:text-red-200">Keep Practicing!</h4>
              </div>
              <p className="text-red-700 dark:text-red-300 text-sm">
                This topic needs more attention. Review the material carefully and consider taking additional practice quizzes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question-by-Question Breakdown */}
      {questionAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questionAttempts.map((qa, index) => (
              <div key={qa.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    {qa.is_correct ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={qa.is_correct ? "default" : "destructive"}>
                      {qa.points_earned} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {qa.time_spent_seconds}s
                    </span>
                  </div>
                </div>
                
                <p className="font-medium mb-2">{qa.question_text}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Your Answer:</span>
                    <span className={qa.is_correct ? "text-green-600" : "text-red-600"}>
                      {qa.user_answer}
                    </span>
                  </div>
                  
                  {!qa.is_correct && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Correct Answer:</span>
                      <span className="text-green-600">{qa.correct_answer}</span>
                    </div>
                  )}
                  
                  {qa.explanation && (
                    <div className="mt-2 p-3 bg-muted/50 rounded">
                      <span className="text-muted-foreground text-xs">Explanation:</span>
                      <p className="text-sm mt-1">{qa.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuizSummary;