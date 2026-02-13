import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Edit, Trash2 } from 'lucide-react';

interface Intern {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  required_hours: number;
  remaining_hours: number;
  created_at: string;
}

export default function InternManagement() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingIntern, setIsCreatingIntern] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createInternshipHours, setCreateInternshipHours] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<Intern | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    required_hours: 0,
    remaining_hours: 0
  });

  useEffect(() => {
    fetchData();

    // Add real-time listener for profile changes
    const channel = supabase
      .channel('intern_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Intern profile changed:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New intern added - add to list
            setInterns(prev => [...prev, payload.new as Intern]);
          } else if (payload.eventType === 'UPDATE') {
            // Existing intern updated - update in list
            setInterns(prev => 
              prev.map(intern => 
                intern.user_id === payload.new.user_id 
                  ? { ...intern, ...payload.new as Intern }
                  : intern
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Intern removed - remove from list
            setInterns(prev => prev.filter(intern => intern.user_id !== payload.old.user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch interns (profiles with intern role)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      console.log('All profiles:', profiles); // Debug log

      // Get intern user IDs
      const { data: internRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'intern');

      console.log('Intern roles:', internRoles); // Debug log

      const internUserIds = internRoles?.map((r) => r.user_id) || [];
      const internProfiles = profiles?.filter((p) =>
        internUserIds.includes(p.user_id)
      ) || [];

      console.log('Filtered intern profiles:', internProfiles); // Debug log

      setInterns(internProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load intern data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createInternAccount = async () => {
    if (!createEmail.trim() || !createFullName.trim() || !createPassword || !createInternshipHours.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in name, email, password, and internship hours.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingIntern(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('You must be signed in to create interns.');

      const res = await fetch('/api/create-intern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword,
          fullName: createFullName.trim(),
          internshipHours: parseInt(createInternshipHours.trim()),
        }),
      });

      const responseData = await res.json();
      console.log('Create intern response:', responseData); // Debug log

      if (!res.ok) throw new Error(responseData?.error || `Request failed: ${res.status}`);
      if (responseData && typeof responseData === 'object' && (responseData as { ok?: boolean }).ok === false) {
        throw new Error((responseData as { error?: string }).error || 'Failed to create intern account.');
      }

      setCreateEmail('');
      setCreateFullName('');
      setCreatePassword('');
      setCreateInternshipHours('');
      setDialogOpen(false);

      toast({
        title: 'Intern created',
        description: 'The intern account has been created successfully.',
      });

      // Refresh data to show the new intern
      await fetchData();
    } catch (error) {
      console.error('Error creating intern:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create intern account.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingIntern(false);
    }
  };

  const handleEditIntern = (intern: Intern) => {
    setEditingIntern(intern);
    setEditForm({
      full_name: intern.full_name,
      email: intern.email,
      required_hours: intern.required_hours,
      remaining_hours: intern.remaining_hours
    });
    setEditDialogOpen(true);
  };

  const updateInternAccount = async () => {
    if (!editingIntern) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          required_hours: editForm.required_hours,
          remaining_hours: editForm.remaining_hours
        })
        .eq('user_id', editingIntern.user_id);

      if (error) throw error;

      toast({
        title: 'Intern updated',
        description: 'The intern account has been updated successfully.',
      });

      setEditDialogOpen(false);
      setEditingIntern(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating intern:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update intern account.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteIntern = async (intern: Intern) => {
    if (!confirm(`Are you sure you want to delete ${intern.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from auth.users first (due to foreign key constraint)
      const { error: authError } = await supabase.auth.admin.deleteUser(
        editingIntern?.user_id || intern.user_id
      );

      if (authError) throw authError;

      toast({
        title: 'Intern deleted',
        description: 'The intern account has been deleted successfully.',
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting intern:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete intern account.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Intern Management</h1>
            <p className="text-muted-foreground">
              Manage intern accounts.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Intern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Intern Account</DialogTitle>
                <DialogDescription>
                  Create an intern account by setting their email and initial password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Intern Name"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="intern@company.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internshipHours">Internship Hours</Label>
                  <Input
                    id="internshipHours"
                    type="number"
                    placeholder="200"
                    value={createInternshipHours}
                    onChange={(e) => setCreateInternshipHours(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isCreatingIntern}
                >
                  Cancel
                </Button>
                <Button onClick={createInternAccount} disabled={isCreatingIntern}>
                  {isCreatingIntern ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Intern'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Intern List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Registered Interns</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : interns.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No interns yet. Create an intern account to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Remaining Hours</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interns.map((intern) => (
                    <TableRow key={intern.id}>
                      <TableCell className="font-medium">
                        {intern.full_name}
                      </TableCell>
                      <TableCell>{intern.email}</TableCell>
                      <TableCell>
                        {intern.remaining_hours} / {intern.required_hours} hrs
                      </TableCell>
                      <TableCell>{formatDate(intern.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditIntern(intern)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteIntern(intern)}
                          >
                            <Trash2 className="h-4 w-4" />
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
        
        {/* Edit Intern Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Intern Account</DialogTitle>
              <DialogDescription>
                Update intern account information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email Address</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRequiredHours">Required Hours</Label>
                <Input
                  id="editRequiredHours"
                  type="number"
                  value={editForm.required_hours}
                  onChange={(e) => setEditForm(prev => ({ ...prev, required_hours: parseInt(e.target.value) }))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRemainingHours">Remaining Hours</Label>
                <Input
                  id="editRemainingHours"
                  type="number"
                  value={editForm.remaining_hours}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remaining_hours: parseInt(e.target.value) }))}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateInternAccount}>
                Update Intern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}