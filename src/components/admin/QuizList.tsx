import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Share, Search } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  topic: string;
  description: string;
  total_questions: number;
  is_published: boolean;
  created_at: string;
  created_by: string;
}

export const QuizList = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    const filtered = quizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredQuizzes(filtered);
  }, [quizzes, searchTerm]);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePublishStatus = async (quizId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !currentStatus })
        .eq('id', quizId);

      if (error) throw error;
      
      await fetchQuizzes();
      toast({
        title: "Success",
        description: `Quiz ${!currentStatus ? 'published' : 'unpublished'} successfully`,
      });
    } catch (error) {
      console.error('Error updating quiz status:', error);
      toast({
        title: "Error",
        description: "Failed to update quiz status",
        variant: "destructive",
      });
    }
  };

  const copyQuizLink = (quizId: string) => {
    const link = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Quiz link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Management</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'es' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQuizzes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No quizzes match your search.' : 'No quizzes created yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell>{quiz.topic}</TableCell>
                    <TableCell>{quiz.total_questions}</TableCell>
                    <TableCell>
                      <Badge variant={quiz.is_published ? "default" : "secondary"}>
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyQuizLink(quiz.id)}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePublishStatus(quiz.id, quiz.is_published)}
                        >
                          {quiz.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};