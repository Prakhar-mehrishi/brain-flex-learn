-- Drop existing policy
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.quizzes;

-- Create updated policy that includes assigned quizzes
CREATE POLICY "Users can view accessible quizzes" ON public.quizzes
FOR SELECT
USING (
  is_published = true 
  OR created_by = auth.uid() 
  OR get_user_role(auth.uid()) = 'admin'::user_role
  OR id IN (
    SELECT quiz_id 
    FROM public.quiz_assignments 
    WHERE user_id = auth.uid()
  )
);