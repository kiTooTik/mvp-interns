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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Edit, Trash2, Building } from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';

interface Intern {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  required_hours: number;
  remaining_hours: number;
  department: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

const DEPARTMENTS = [
  'IT',
  'HR',
  'Software Development',
  'Marketing',
  'Finance',
  'Operations',
  'Design',
  'Sales',
  'Customer Support',
  'Other'
];

export default function InternManagement() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingIntern, setIsCreatingIntern] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createInternshipHours, setCreateInternshipHours] = useState('');
  const [createDepartment, setCreateDepartment] = useState('Other');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<Intern | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    required_hours: 0,
    remaining_hours: 0,
    department: 'Other'
  });

  // Reset password states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingIntern, setResettingIntern] = useState<Intern | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
      ).map((p: any) => ({
        ...p,
        department: p.department || 'Other' // Ensure department field exists
      })) || [];

      console.log('Filtered intern profiles:', internProfiles); // Debug log

      setInterns(internProfiles as Intern[]);
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
    console.log('Form values:', {
      createEmail: createEmail,
      createFullName: createFullName,
      createInternshipHours: createInternshipHours,
      createDepartment: createDepartment
    });

    console.log('Trimmed values:', {
      email: createEmail.trim(),
      fullName: createFullName.trim(),
      internshipHours: createInternshipHours.trim()
    });

    console.log('Validation checks:', {
      emailValid: !!createEmail.trim(),
      fullNameValid: !!createFullName.trim(),
      internshipHoursValid: !!createInternshipHours.trim()
    });

    if (!createEmail.trim() || !createFullName.trim() || !createInternshipHours.trim()) {
      console.log('Frontend validation failed');
      toast({
        title: 'Error',
        description: 'Please fill in name, email, and internship hours.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingIntern(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('You must be signed in to create interns.');

      const internshipHoursNum = parseInt(createInternshipHours.trim(), 10);
      if (Number.isNaN(internshipHoursNum) || internshipHoursNum < 0) {
        throw new Error('Internship hours must be a non-negative number.');
      }

      let res: Response;
      try {
        const payload = {
          email: createEmail.trim(),
          fullName: createFullName.trim(),
          internshipHours: internshipHoursNum,
          department: createDepartment,
        };
        console.log('Sending payload:', payload);

        res = await fetch(`${API_BASE_URL}/api/create-intern`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        console.error('Network error:', networkErr);
        throw new Error(
          'Cannot reach the API server. Start it in a terminal: node server/create-intern.js'
        );
      }

      const text = await res.text();
      if (!res.ok) {
        console.error('Create intern API response:', { status: res.status, bodyLength: text?.length ?? 0, bodyPreview: text?.slice(0, 200) ?? '(empty)' });
      }
      let responseData: { ok?: boolean; error?: string } = {};
      if (text?.trim()) {
        try {
          responseData = JSON.parse(text);
        } catch {
          throw new Error(res.ok ? 'Invalid server response.' : `Request failed: ${res.status}${text?.trim() ? `. ${text.trim().slice(0, 150)}` : ''}`);
        }
      }

      if (!res.ok) {
        const msg =
          responseData?.error ||
          (res.status === 502 || res.status === 503
            ? 'Start the API server: in a terminal run — node server/create-intern.js'
            : text?.trim()
              ? `Server error: ${text.trim().slice(0, 300)}`
              : `Request failed: ${res.status}. Check the terminal where node server/create-intern.js is running for the error.`);
        throw new Error(msg);
      }
      if (responseData && typeof responseData === 'object' && responseData.ok === false) {
        throw new Error(responseData.error || 'Failed to create intern account.');
      }

      setCreateEmail('');
      setCreateFullName('');
      setCreateInternshipHours('');
      setDialogOpen(false);

      toast({
        title: 'Intern created',
        description: 'The intern account has been created successfully. Default password: Password123!@#',
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
      remaining_hours: intern.remaining_hours,
      department: intern.department || 'Other'
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
          remaining_hours: editForm.remaining_hours,
          department: editForm.department
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
      // Use API endpoint with service role for deletion
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('You must be signed in to delete interns.');

      console.log('Attempting to delete intern:', { userId: intern.user_id, internName: intern.full_name });
      console.log('Using token:', token ? 'present' : 'missing');

      const res = await fetch(`${API_BASE_URL}/api/admin/delete-intern`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: intern.user_id
        }),
      });

      console.log('Delete response status:', res.status, res.statusText);
      const text = await res.text();
      console.log('Delete response body:', text);
      let responseData: { error?: string } = {};
      if (text && text.trim()) {
        try {
          responseData = JSON.parse(text);
        } catch {
          throw new Error(!res.ok ? `Request failed: ${res.status}` : 'Server returned invalid response.');
        }
      }

      if (!res.ok) throw new Error(responseData?.error || `Request failed: ${res.status}`);

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

  // Filter and pagination logic
  const filteredInterns = interns.filter((intern) => {
    const matchesSearch = intern.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || intern.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const totalPages = Math.ceil(filteredInterns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInterns = filteredInterns.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
    setCurrentPage(1); // Reset to first page when filtering
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
                  Create an intern account by setting their email and details. A default password will be assigned.
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
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={createDepartment} onValueChange={setCreateDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {/* Search and Filter Controls */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="sm:w-48">
                <Label htmlFor="departmentFilter" className="sr-only">Department Filter</Label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {currentInterns.length} of {filteredInterns.length} interns
            </div>
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
                No interns yet. Create an intern account to get started.
              </p>
            ) : filteredInterns.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No interns found matching your search criteria.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Remaining Hours</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInterns.map((intern) => (
                      <TableRow key={intern.id}>
                        <TableCell className="font-medium">
                          {intern.full_name}
                        </TableCell>
                        <TableCell>{intern.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{intern.department || 'Other'}</span>
                          </div>
                        </TableCell>
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
              <div className="space-y-2">
                <Label htmlFor="editDepartment">Department</Label>
                <Select value={editForm.department} onValueChange={(value) => setEditForm(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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