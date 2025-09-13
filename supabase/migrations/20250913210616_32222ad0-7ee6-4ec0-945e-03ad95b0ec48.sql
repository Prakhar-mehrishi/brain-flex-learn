-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'user');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'trial', 'cancelled');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trial',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT subscription_owner_check CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR 
    (user_id IS NULL AND organization_id IS NOT NULL)
  )
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_adaptive BOOLEAN NOT NULL DEFAULT true,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'multiple_choice',
  options JSONB, -- For multiple choice options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question_attempts table
CREATE TABLE public.question_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for quizzes
CREATE POLICY "Users can view published quizzes" ON public.quizzes
  FOR SELECT USING (
    is_published = true OR 
    created_by = auth.uid() OR
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Quiz creators and admins can update quizzes" ON public.quizzes
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for questions
CREATE POLICY "Users can view questions for accessible quizzes" ON public.questions
  FOR SELECT USING (
    quiz_id IN (
      SELECT id FROM public.quizzes 
      WHERE is_published = true OR 
            created_by = auth.uid() OR
            public.get_user_role(auth.uid()) = 'admin'
    )
  );

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for quiz attempts
CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for question attempts
CREATE POLICY "Users can view their own question attempts" ON public.question_attempts
  FOR SELECT USING (
    quiz_attempt_id IN (
      SELECT id FROM public.quiz_attempts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own question attempts" ON public.question_attempts
  FOR INSERT WITH CHECK (
    quiz_attempt_id IN (
      SELECT id FROM public.quiz_attempts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all question attempts" ON public.question_attempts
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');