-- Insert dummy quiz data for testing
INSERT INTO public.quizzes (title, topic, description, total_questions, is_published, created_by, is_adaptive)
VALUES 
  (
    'Basic JavaScript Quiz',
    'Programming',
    'Test your fundamental JavaScript knowledge with this beginner-friendly quiz',
    5,
    true,
    '28b26c8e-ae1c-4e41-8ad0-98d351a5eed3',
    true
  ),
  (
    'World Geography Quiz',
    'Geography',
    'Explore your knowledge of world capitals, countries, and landmarks',
    5,
    true,
    '28b26c8e-ae1c-4e41-8ad0-98d351a5eed3',
    true
  ),
  (
    'Mathematics Fundamentals',
    'Mathematics',
    'Basic arithmetic and algebra questions for students',
    5,
    false,
    '28b26c8e-ae1c-4e41-8ad0-98d351a5eed3',
    true
  );