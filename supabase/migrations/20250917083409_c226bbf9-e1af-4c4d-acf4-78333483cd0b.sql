-- Insert dummy quiz data for testing
INSERT INTO public.quizzes (id, title, topic, description, total_questions, is_published, created_by, is_adaptive, organization_id)
VALUES 
  (
    gen_random_uuid(),
    'Basic JavaScript Quiz',
    'Programming',
    'Test your fundamental JavaScript knowledge with this beginner-friendly quiz',
    5,
    true,
    '28b26c8e-ae1c-4e41-8ad0-98d351a5eed3',
    true,
    null
  ),
  (
    gen_random_uuid(),
    'World Geography Quiz',
    'Geography',
    'Explore your knowledge of world capitals, countries, and landmarks',
    5,
    true,
    '28b26c8e-ae1c-4e41-8ad0-98d351a5eed3',
    true,
    null
  ),
  (
    gen_random_uuid(),
    'Mathematics Fundamentals',
    'Mathematics',
    'Basic arithmetic and algebra questions for students',
    5,
    false,
    '28b26c8e-ae1c-4e41-8ad0-98d351a5eed3',
    true,
    null
  );

-- Get the quiz IDs for inserting questions
DO $$
DECLARE
    js_quiz_id UUID;
    geo_quiz_id UUID;
    math_quiz_id UUID;
BEGIN
    -- Get quiz IDs
    SELECT id INTO js_quiz_id FROM public.quizzes WHERE title = 'Basic JavaScript Quiz';
    SELECT id INTO geo_quiz_id FROM public.quizzes WHERE title = 'World Geography Quiz';
    SELECT id INTO math_quiz_id FROM public.quizzes WHERE title = 'Mathematics Fundamentals';

    -- Insert JavaScript Quiz Questions
    INSERT INTO public.questions (quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty, points, order_index)
    VALUES 
      (js_quiz_id, 'What does "var" declare in JavaScript?', 'multiple_choice', '["A function", "A variable", "A constant", "A method"]', 'A variable', 'The var keyword is used to declare variables in JavaScript.', 'easy', 1, 1),
      (js_quiz_id, 'Which symbol is used for single-line comments in JavaScript?', 'multiple_choice', '["//", "/*", "#", "--"]', '//', 'Double forward slashes (//) are used for single-line comments in JavaScript.', 'easy', 1, 2),
      (js_quiz_id, 'What will console.log(typeof null) output?', 'multiple_choice', '["null", "undefined", "object", "boolean"]', 'object', 'This is a known quirk in JavaScript - typeof null returns "object".', 'medium', 2, 3),
      (js_quiz_id, 'JavaScript is a case-sensitive language.', 'true_false', '[]', 'true', 'JavaScript treats uppercase and lowercase letters as different characters.', 'easy', 1, 4),
      (js_quiz_id, 'Which method is used to add an element to the end of an array?', 'multiple_choice', '["push()", "pop()", "shift()", "unshift()"]', 'push()', 'The push() method adds one or more elements to the end of an array.', 'easy', 1, 5);

    -- Insert Geography Quiz Questions
    INSERT INTO public.questions (quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty, points, order_index)
    VALUES 
      (geo_quiz_id, 'What is the capital of Australia?', 'multiple_choice', '["Sydney", "Melbourne", "Canberra", "Perth"]', 'Canberra', 'Canberra is the capital city of Australia, not Sydney or Melbourne as commonly thought.', 'medium', 2, 1),
      (geo_quiz_id, 'Which river is the longest in the world?', 'multiple_choice', '["Amazon", "Nile", "Mississippi", "Yangtze"]', 'Nile', 'The Nile River in Africa is considered the longest river in the world.', 'medium', 2, 2),
      (geo_quiz_id, 'Mount Everest is located in which mountain range?', 'multiple_choice', '["Andes", "Alps", "Himalayas", "Rockies"]', 'Himalayas', 'Mount Everest is part of the Himalayan mountain range on the border of Nepal and Tibet.', 'easy', 1, 3),
      (geo_quiz_id, 'Brazil is the largest country in South America.', 'true_false', '[]', 'true', 'Brazil covers about half of South America\'s land area and population.', 'easy', 1, 4),
      (geo_quiz_id, 'How many continents are there?', 'short_answer', '[]', '7', 'There are 7 continents: Asia, Africa, North America, South America, Antarctica, Europe, and Australia/Oceania.', 'easy', 1, 5);

    -- Insert Mathematics Quiz Questions
    INSERT INTO public.questions (quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty, points, order_index)
    VALUES 
      (math_quiz_id, 'What is 15 + 23?', 'short_answer', '[]', '38', 'Simple addition: 15 + 23 = 38', 'easy', 1, 1),
      (math_quiz_id, 'Solve for x: 2x + 6 = 14', 'short_answer', '[]', '4', 'Subtract 6 from both sides: 2x = 8, then divide by 2: x = 4', 'medium', 2, 2),
      (math_quiz_id, 'What is the area of a circle with radius 5?', 'multiple_choice', '["25π", "10π", "5π", "15π"]', '25π', 'Area of circle = πr², so π × 5² = 25π', 'medium', 2, 3),
      (math_quiz_id, 'The square root of 144 is 12.', 'true_false', '[]', 'true', '12 × 12 = 144, so √144 = 12', 'easy', 1, 4),
      (math_quiz_id, 'What is 7 × 8?', 'short_answer', '[]', '56', 'Basic multiplication: 7 × 8 = 56', 'easy', 1, 5);

END $$;