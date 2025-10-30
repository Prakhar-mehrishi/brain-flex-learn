-- Create quiz_assignments table for assigning quizzes to specific users
CREATE TABLE public.quiz_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- Enable RLS
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins can manage quiz assignments"
ON public.quiz_assignments
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Users can view their own assignments
CREATE POLICY "Users can view their assignments"
ON public.quiz_assignments
FOR SELECT
USING (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX idx_quiz_assignments_user_id ON public.quiz_assignments(user_id);
CREATE INDEX idx_quiz_assignments_quiz_id ON public.quiz_assignments(quiz_id);

-- Create user_engagement_metrics table for tracking daily activity
CREATE TABLE public.user_engagement_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  total_time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can view all engagement metrics
CREATE POLICY "Admins can view all engagement metrics"
ON public.user_engagement_metrics
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Users can view their own engagement metrics
CREATE POLICY "Users can view their engagement metrics"
ON public.user_engagement_metrics
FOR SELECT
USING (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX idx_engagement_metrics_user_date ON public.user_engagement_metrics(user_id, date);
CREATE INDEX idx_engagement_metrics_date ON public.user_engagement_metrics(date);

-- Create trigger to update engagement metrics
CREATE OR REPLACE FUNCTION update_engagement_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO public.user_engagement_metrics (user_id, date, quizzes_completed, total_time_spent_seconds, total_score)
    VALUES (
      NEW.user_id,
      DATE(NEW.completed_at),
      1,
      NEW.time_spent_seconds,
      NEW.score
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      quizzes_completed = user_engagement_metrics.quizzes_completed + 1,
      total_time_spent_seconds = user_engagement_metrics.total_time_spent_seconds + NEW.time_spent_seconds,
      total_score = user_engagement_metrics.total_score + NEW.score,
      updated_at = now();
      
    -- Update assignment as completed if exists
    UPDATE public.quiz_assignments
    SET is_completed = true, completed_at = NEW.completed_at
    WHERE quiz_id = NEW.quiz_id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER track_user_engagement
AFTER UPDATE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION update_engagement_metrics();