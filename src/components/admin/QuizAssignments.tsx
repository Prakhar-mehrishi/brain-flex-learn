import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CalendarIcon, CheckCircle2, XCircle, Search } from "lucide-react";
import { format } from "date-fns";

interface Quiz {
  id: string;
  title: string;
}

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface Assignment {
  id: string;
  quiz_id: string;
  user_id: string;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  assigned_at: string;
  quizzes: { title: string };
  profiles: { full_name: string; email: string };
}

export const QuizAssignments = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date>();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = assignments.filter(a =>
        (a.profiles as any)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.profiles as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.quizzes as any)?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssignments(filtered);
    } else {
      setFilteredAssignments(assignments);
    }
  }, [searchTerm, assignments]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quizzesRes, usersRes, assignmentsRes] = await Promise.all([
        supabase.from('quizzes').select('id, title').eq('is_published', true),
        supabase.from('profiles').select('id, user_id, full_name, email').neq('role', 'admin'),
        supabase.from('quiz_assignments').select('*').order('assigned_at', { ascending: false })
      ]);

      if (quizzesRes.data) setQuizzes(quizzesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      
      // Fetch related data separately
      if (assignmentsRes.data) {
        const assignmentsWithDetails = await Promise.all(
          assignmentsRes.data.map(async (assignment) => {
            const [quizRes, profileRes] = await Promise.all([
              supabase.from('quizzes').select('title').eq('id', assignment.quiz_id).single(),
              supabase.from('profiles').select('full_name, email').eq('user_id', assignment.user_id).single()
            ]);
            
            return {
              ...assignment,
              quizzes: quizRes.data,
              profiles: profileRes.data
            } as Assignment;
          })
        );
        setAssignments(assignmentsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignQuiz = async () => {
    if (!selectedQuiz || selectedUsers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a quiz and at least one user",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const assignmentData = selectedUsers.map(userId => ({
        quiz_id: selectedQuiz,
        user_id: userId,
        assigned_by: user.id,
        due_date: dueDate ? dueDate.toISOString() : null
      }));

      const { error } = await supabase
        .from('quiz_assignments')
        .insert(assignmentData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quiz assigned to ${selectedUsers.length} user(s)`
      });

      setDialogOpen(false);
      setSelectedQuiz("");
      setSelectedUsers([]);
      setDueDate(undefined);
      fetchData();
    } catch (error) {
      console.error('Error assigning quiz:', error);
      toast({
        title: "Error",
        description: "Failed to assign quiz",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('quiz_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted"
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading assignments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quiz Assignments</CardTitle>
              <CardDescription>Assign quizzes to specific users</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assign Quiz to Users</DialogTitle>
                  <DialogDescription>Select a quiz and users to assign it to</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Quiz</Label>
                    <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a quiz" />
                      </SelectTrigger>
                      <SelectContent>
                        {quizzes.map(quiz => (
                          <SelectItem key={quiz.id} value={quiz.id}>
                            {quiz.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Users (select multiple)</Label>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                      {users.map(user => (
                        <label key={user.user_id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.user_id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{user.full_name} ({user.email})</span>
                        </label>
                      ))}
                    </div>
                    {selectedUsers.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedUsers.length} user(s) selected
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "Select due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button onClick={handleAssignQuiz} className="w-full">
                    Assign Quiz
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, email, or quiz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No assignments found</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map(assignment => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{(assignment.profiles as any)?.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {(assignment.profiles as any)?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{(assignment.quizzes as any)?.title}</TableCell>
                      <TableCell>
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {assignment.due_date
                          ? new Date(assignment.due_date).toLocaleDateString()
                          : 'No due date'}
                      </TableCell>
                      <TableCell>
                        {assignment.is_completed ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};