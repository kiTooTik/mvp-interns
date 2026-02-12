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
import { UserPlus, Loader2 } from 'lucide-react';

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
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();

    // Add real-time listener for profile changes
    const channel = supabase
      .channel('intern_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Intern profile changed:', payload);
          // Update intern list when any profile changes
          if (payload.new) {
            setInterns(prev => 
              prev.map(intern => 
                intern.user_id === payload.new.user_id 
                  ? { ...intern, ...payload.new }
                  : intern
              )
            );
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

      // Get intern user IDs
      const { data: internRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'intern');

      const internUserIds = internRoles?.map((r) => r.user_id) || [];
      const internProfiles = profiles?.filter((p) =>
        internUserIds.includes(p.user_id)
      ) || [];

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
    if (!createEmail.trim() || !createFullName.trim() || !createPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in name, email, and password.',
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
      if (data && typeof data === 'object' && (data as { ok?: boolean }).ok === false) {
        throw new Error((data as { error?: string }).error || 'Failed to create intern account.');
      }

      setCreateEmail('');
      setCreateFullName('');
      setCreatePassword('');
      setDialogOpen(false);

      toast({
        title: 'Intern created',
        description: 'The intern account has been created successfully.',
      });

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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}