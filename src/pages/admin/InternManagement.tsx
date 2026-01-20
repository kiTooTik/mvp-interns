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
import { UserPlus, Copy, Loader2, Mail } from 'lucide-react';

interface Intern {
  id: string;
  email: string;
  full_name: string;
  required_hours: number;
  remaining_hours: number;
  created_at: string;
}

interface InviteLink {
  id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export default function InternManagement() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
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

      // Fetch invite links
      const { data: invites, error: invitesError } = await supabase
        .from('invite_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInviteLinks(invites || []);
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

  const createInviteLink = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingInvite(true);
    try {
      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          email: inviteEmail.trim(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setInviteLinks([data, ...inviteLinks]);
      setInviteEmail('');
      setDialogOpen(false);
      
      toast({
        title: 'Invite created',
        description: 'The invite link has been created successfully.',
      });
    } catch (error) {
      console.error('Error creating invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invite link.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copied!',
      description: 'Invite link copied to clipboard.',
    });
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
              Manage intern accounts and invite new interns.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Intern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invite Link</DialogTitle>
                <DialogDescription>
                  Enter the intern's email address to generate an invite link.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="intern@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isCreatingInvite}
                >
                  Cancel
                </Button>
                <Button onClick={createInviteLink} disabled={isCreatingInvite}>
                  {isCreatingInvite ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Invite'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pending Invites */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            {inviteLinks.filter((i) => !i.used_at).length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending invites.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inviteLinks
                    .filter((i) => !i.used_at)
                    .map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {invite.email}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(invite.expires_at)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              new Date(invite.expires_at) < new Date()
                                ? 'absent'
                                : 'pending'
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                No interns registered yet. Create an invite link to get started.
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