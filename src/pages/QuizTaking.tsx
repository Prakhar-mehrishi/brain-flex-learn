import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  total_questions: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: any;
  correct_answer: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  order_index: number;
}

interface QuestionAttempt {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  pointsEarned: number;
}

const QuizTaking = () => {
  const { quizId } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizAttemptId, setQuizAttemptId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeQuiz = async () => {
      if (!user || !quizId) return;

      try {
        // Fetch quiz data
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .eq('is_published', true)
          .single();

        if (quizError || !quizData) {
          toast({
            title: "Error",
            description: "Quiz not found or not accessible",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setQuiz(quizData);

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index');

        if (questionsError || !questionsData) {
          toast({
            title: "Error",
            description: "Failed to load quiz questions",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setQuestions(questionsData as Question[]);

        // Create quiz attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quizId,
            user_id: user.id,
            total_questions: questionsData.length,
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (attemptError || !attemptData) {
          toast({
            title: "Error",
            description: "Failed to start quiz attempt",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setQuizAttemptId(attemptData.id);
      } catch (error) {
        console.error('Error initializing quiz:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeQuiz();
  }, [user, quizId, navigate, toast]);

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !quizAttemptId) return;

    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    const pointsEarned = isCorrect ? currentQuestion.points : 0;

    // Save question attempt
    try {
      await supabase.from('question_attempts').insert({
        quiz_attempt_id: quizAttemptId,
        question_id: currentQuestion.id,
        user_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
        points_earned: pointsEarned
      });

      const newAttempt: QuestionAttempt = {
        questionId: currentQuestion.id,
        userAnswer: selectedAnswer,
        isCorrect,
        timeSpent,
        pointsEarned
      };

      setAttempts(prev => [...prev, newAttempt]);
      setShowFeedback(true);
    } catch (error) {
      console.error('Error saving question attempt:', error);
      toast({
        title: "Error",
        description: "Failed to save your answer",
        variant: "destructive",
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer("");
      setShowFeedback(false);
      setQuestionStartTime(Date.now());
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    if (!quizAttemptId) return;

    const totalTimeSpent = Math.round((Date.now() - startTime) / 1000);
    const correctAnswers = attempts.filter(a => a.isCorrect).length + (showFeedback && selectedAnswer === questions[currentQuestionIndex].correct_answer ? 1 : 0);
    const totalPoints = attempts.reduce((sum, a) => sum + a.pointsEarned, 0) + (showFeedback && selectedAnswer === questions[currentQuestionIndex].correct_answer ? questions[currentQuestionIndex].points : 0);
    const score = Math.round((correctAnswers / questions.length) * 100);

    try {
      // Update quiz attempt
      await supabase
        .from('quiz_attempts')
        .update({
          completed_at: new Date().toISOString(),
          time_spent_seconds: totalTimeSpent,
          score,
          correct_answers: correctAnswers
        })
        .eq('id', quizAttemptId);

      // Update user points and streak
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points, streak_count')
        .eq('user_id', user!.id)
        .single();

      if (currentProfile) {
        const newStreak = score >= 70 ? currentProfile.streak_count + 1 : 0;
        await supabase
          .from('profiles')
          .update({
            points: currentProfile.points + totalPoints,
            streak_count: newStreak
          })
          .eq('user_id', user!.id);
      }

      setFinalScore(score);
      setIsCompleted(true);

      toast({
        title: "Quiz Completed!",
        description: `You scored ${score}% and earned ${totalPoints} points!`,
      });
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast({
        title: "Error",
        description: "Failed to complete quiz",
        variant: "destructive",
      });
    }
  };

 

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }
 if (!session) {
    return <Navigate to="/auth" replace />;
  }
  if (!quiz || questions.length === 0) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-4">Quiz Completed!</CardTitle>
            <div className="flex justify-center mb-4">
              {finalScore >= 80 ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : finalScore >= 60 ? (
                <Badge className="text-6xl py-4 px-8" variant="secondary">{finalScore}%</Badge>
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <h3 className="text-xl font-semibold">{quiz.title}</h3>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{finalScore}%</p>
                <p className="text-sm text-muted-foreground">Final Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{attempts.filter(a => a.isCorrect).length + (selectedAnswer === questions[currentQuestionIndex]?.correct_answer ? 1 : 0)}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-sm text-muted-foreground">Total Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round((Date.now() - startTime) / 60000)}m</p>
                <p className="text-sm text-muted-foreground">Time Spent</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Performance Breakdown</h4>
              {finalScore >= 90 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">Excellent! Outstanding performance!</p>
                  <p className="text-green-600 dark:text-green-300 text-sm">You've mastered this topic.</p>
                </div>
              )}
              {finalScore >= 70 && finalScore < 90 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">Great job! Good understanding!</p>
                  <p className="text-blue-600 dark:text-blue-300 text-sm">You're doing well in this topic.</p>
                </div>
              )}
              {finalScore >= 50 && finalScore < 70 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">Not bad! Room for improvement.</p>
                  <p className="text-yellow-600 dark:text-yellow-300 text-sm">Consider reviewing this topic more.</p>
                </div>
              )}
              {finalScore < 50 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-red-800 dark:text-red-200 font-medium">Keep practicing!</p>
                  <p className="text-red-600 dark:text-red-300 text-sm">This topic needs more attention.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">What's next?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                  Browse More Quizzes
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Practice Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              <p className="text-muted-foreground">{quiz.topic}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{currentQuestionIndex + 1} of {questions.length}</Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {Math.round((Date.now() - startTime) / 60000)}m
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Question {currentQuestionIndex + 1}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentQuestion.difficulty}</Badge>
                <Badge variant="secondary">{currentQuestion.points} pts</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg leading-relaxed">{currentQuestion.question_text}</p>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => !showFeedback && setSelectedAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full p-4 text-left border rounded-lg transition-colors ${
                      selectedAnswer === option
                        ? showFeedback
                          ? option === currentQuestion.correct_answer
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200'
                          : 'bg-primary/10 border-primary'
                        : showFeedback && option === currentQuestion.correct_answer
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200'
                          : 'hover:bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </div>
                  </button>
                ))
              )}

              {currentQuestion.question_type === 'true_false' && (
                ['True', 'False'].map((option) => (
                  <button
                    key={option}
                    onClick={() => !showFeedback && setSelectedAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full p-4 text-left border rounded-lg transition-colors ${
                      selectedAnswer === option
                        ? showFeedback
                          ? option === currentQuestion.correct_answer
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                            : 'bg-red-100 dark:bg-red-900/30 border-red-500'
                          : 'bg-primary/10 border-primary'
                        : showFeedback && option === currentQuestion.correct_answer
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                          : 'hover:bg-muted/50 border-border'
                    }`}
                  >
                    {option}
                  </button>
                ))
              )}

              {currentQuestion.question_type === 'short_answer' && (
    <input
      type="text"
      value={selectedAnswer}
      onChange={(e) => !showFeedback && setSelectedAnswer(e.target.value)}
      disabled={showFeedback}
      placeholder="Type your answer..."
      className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
    />
  )}
            </div>

            {/* Feedback */}
            {showFeedback && currentQuestion.explanation && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Explanation:</h4>
                <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              {!showFeedback ? (
                <Button
                  onClick={handleAnswerSubmit}
                  disabled={!selectedAnswer}
                  className="min-w-32"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} className="min-w-32">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Complete Quiz'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizTaking;
