import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Sparkles } from "lucide-react";

const quizFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  topic: z.string().min(1, "Topic is required"),
  description: z.string().optional(),
  questionCount: z.number().min(1).max(50),
  sourceType: z.enum(["text", "file"]),
  textContent: z.string().optional(),
});

type QuizFormData = z.infer<typeof quizFormSchema>;

interface GeneratedQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  order_index: number;
}

export const QuizCreationForm = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'form' | 'review' | 'published'>('form');

  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      title: "",
      topic: "",
      description: "",
      questionCount: 10,
      sourceType: "text",
      textContent: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const generateQuiz = async (data: QuizFormData) => {
    setIsGenerating(true);
    try {
      let fileContent = "";
      if (data.sourceType === "file" && selectedFile) {
        // For demo, we'll use the filename. In production, you'd want to extract file content
        fileContent = `File: ${selectedFile.name}`;
      }

      const { data: functionData, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          title: data.title,
          topic: data.topic,
          questionCount: data.questionCount,
          content: data.textContent,
          fileContent: fileContent
        }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      setGeneratedQuestions(functionData.questions);
      setStep('review');
      
      toast({
        title: "Quiz Generated!",
        description: `Successfully generated ${functionData.questions.length} questions.`,
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const publishQuiz = async () => {
    try {
      const formData = form.getValues();
      
      // Create the quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: formData.title,
          description: formData.description,
          topic: formData.topic,
          total_questions: generatedQuestions.length,
          is_published: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions
      const questionsToInsert = generatedQuestions.map(q => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points,
        order_index: q.order_index
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      setStep('published');
      
      toast({
        title: "Quiz Published!",
        description: "Your quiz has been successfully created and published.",
      });
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast({
        title: "Publishing Failed",
        description: "Failed to publish quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    form.reset();
    setGeneratedQuestions([]);
    setSelectedFile(null);
    setStep('form');
  };

  if (step === 'published') {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <div className="mb-4">
            <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Quiz Published Successfully!</h3>
            <p className="text-muted-foreground">Your quiz is now live and available to users.</p>
          </div>
          <Button onClick={resetForm}>Create Another Quiz</Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'review') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Review Generated Questions</h3>
          <Badge variant="outline">{generatedQuestions.length} questions</Badge>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {generatedQuestions.map((question, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Question {index + 1}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{question.difficulty}</Badge>
                    <Badge variant="outline">{question.points} pts</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2">{question.question_text}</p>
                {question.options && (
                  <div className="space-y-1 mb-2">
                    {question.options.map((option, optIndex) => (
                      <div 
                        key={optIndex}
                        className={`p-2 rounded text-sm ${
                          option === question.correct_answer 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                            : 'bg-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </div>
                    ))}
                  </div>
                )}
                {question.explanation && (
                  <p className="text-sm text-muted-foreground italic">
                    Explanation: {question.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setStep('form')}>
            Back to Edit
          </Button>
          <Button onClick={publishQuiz} className="flex-1">
            Publish Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(generateQuiz)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quiz Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter quiz title..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Topic/Subject</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Mathematics, History..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of the quiz..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="questionCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Questions</FormLabel>
              <FormControl>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value.toString()}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sourceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Source</FormLabel>
              <Tabs value={field.value} onValueChange={field.onChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Text Input
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text">
                  <FormField
                    control={form.control}
                    name="textContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Paste your content here (lesson material, article, etc.)..."
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="file">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-sm text-muted-foreground">
                        Upload a file (PDF, DOCX, TXT)
                      </span>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </Label>
                    {selectedFile && (
                      <p className="mt-2 text-sm text-primary">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Quiz with AI
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};