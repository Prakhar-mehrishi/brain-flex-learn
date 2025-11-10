import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ExcelQuizImport = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV or Excel file",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    
    // Parse CSV for preview
    if (selectedFile.name.endsWith('.csv')) {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
      const preview = lines.slice(1, 4).map(line => {
        const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
        return headers.reduce((obj, header, idx) => {
          obj[header] = values[idx] || '';
          return obj;
        }, {} as any);
      });
      setPreviewData(preview);
    }
  };

  const downloadSampleCSV = () => {
    const link = document.createElement('a');
    link.href = '/sample-quiz-template.csv';
    link.download = 'quiz-template.csv';
    link.click();
  };

  const handleImport = async () => {
    if (!file || !quizTitle || !quizTopic) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Parse CSV
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      
      // Validate headers
      const requiredHeaders = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));
      
      if (!hasAllHeaders) {
        throw new Error(`CSV must contain headers: ${requiredHeaders.join(', ')}`);
      }

      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizTitle,
          description: quizDescription,
          topic: quizTopic,
          created_by: user.id,
          is_published: false,
          total_questions: lines.length - 1
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Parse questions
      const questions = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line).map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        return {
          quiz_id: quiz.id,
          question_text: row.question,
          question_type: 'multiple_choice' as const,
          options: {
            A: row.option_a,
            B: row.option_b,
            C: row.option_c,
            D: row.option_d
          },
          correct_answer: row.correct_answer.toUpperCase(),
          explanation: row.explanation || null,
          difficulty: (row.difficulty?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard',
          points: parseInt(row.points || '1'),
          order_index: index
        };
      });

      // Insert questions
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questions);

      if (questionsError) throw questionsError;

      toast({
        title: "Success",
        description: `Quiz created with ${questions.length} questions`
      });

      // Reset form
      setFile(null);
      setQuizTitle("");
      setQuizDescription("");
      setQuizTopic("");
      setPreviewData([]);
      
    } catch (error: any) {
      console.error('Error importing quiz:', error);
      toast({
        title: "Import Error",
        description: error.message || "Failed to import quiz",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Quiz from Excel/CSV
          </CardTitle>
          <CardDescription>Upload a CSV or Excel file to create a quiz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Required CSV columns:</strong> question, option_a, option_b, option_c, option_d, correct_answer
              <br />
              <strong>Optional columns:</strong> explanation, difficulty (easy/medium/hard), points
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="quizTitle">Quiz Title *</Label>
            <Input
              id="quizTitle"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Enter quiz title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quizTopic">Topic *</Label>
            <Input
              id="quizTopic"
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
              placeholder="e.g., Mathematics, Science, History"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quizDescription">Description</Label>
            <Textarea
              id="quizDescription"
              value={quizDescription}
              onChange={(e) => setQuizDescription(e.target.value)}
              placeholder="Optional quiz description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload CSV/Excel File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (First 3 rows)</Label>
              <div className="border rounded-lg p-4 bg-muted/50 overflow-x-auto">
                <pre className="text-xs">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={loading || !file || !quizTitle || !quizTopic}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Quiz
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Template</CardTitle>
          <CardDescription>Download or copy this template to create your quiz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={downloadSampleCSV} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Sample CSV Template
          </Button>
          
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-xs overflow-x-auto">
{`question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty,points
What is 2+2?,3,4,5,6,B,Addition of two numbers,easy,1
What is the capital of France?,London,Berlin,Paris,Madrid,C,Paris is the capital city of France,medium,1
Which planet is closest to the Sun?,Venus,Mercury,Earth,Mars,B,Mercury is the closest planet to the Sun,medium,1`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};