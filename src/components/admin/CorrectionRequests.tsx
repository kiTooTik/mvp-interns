import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CorrectionRequest {
  id: string;
  user_id: string;
  attendance_id: string;
  date: string;
  reason: string;
  requested_time_out?: string;
  status: string;
  admin_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  profiles?: any; // Using any to handle Supabase join response
  attendance?: any; // Using any to handle Supabase join response
}

export default function CorrectionRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('correction_requests')
        .select(`
          *,
          profiles:user_id (full_name, email),
          attendance:attendance_id (time_in, time_out, total_hours)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching correction requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load correction requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setReviewAction('approve');
    setAdminNotes('');
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (!selectedRequest || !user) return;

    try {
      const { error } = await supabase
        .from('correction_requests')
        .update({
          status: reviewAction,
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Correction request ${reviewAction}d successfully.`,
      });

      setShowReviewDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(req => req.status === filterStatus);

  const pendingCount = requests.filter(req => req.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Correction Requests</h1>
          <p className="text-muted-foreground">
            Review and manage intern attendance correction requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter">Filter:</Label>
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(req => req.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(req => req.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">Rejected requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Correction Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No correction requests found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intern</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{request.profiles?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(request.date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>In: {format(new Date(request.attendance?.time_in || ''), 'h:mm a')}</div>
                          <div>Out: {request.attendance?.time_out ? format(new Date(request.attendance.time_out), 'h:mm a') : '—'}</div>
                          <div>Hours: {request.attendance?.total_hours?.toFixed(1) || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{format(new Date(request.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleReview(request)}
                          >
                            Review
                          </Button>
                        )}
                        {request.status !== 'pending' && (
                          <div className="text-sm text-muted-foreground">
                            {request.admin_notes && (
                              <div title={request.admin_notes}>
                                {request.admin_notes.length > 20 
                                  ? request.admin_notes.substring(0, 20) + '...' 
                                  : request.admin_notes}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Correction Request</DialogTitle>
            <DialogDescription>
              Review the correction request from {selectedRequest?.profiles?.full_name} for {selectedRequest && format(new Date(selectedRequest.date), 'MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Intern</Label>
                  <div className="font-medium">{selectedRequest.profiles?.full_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedRequest.profiles?.email}</div>
                </div>
                <div>
                  <Label>Date</Label>
                  <div className="font-medium">{format(new Date(selectedRequest.date), 'MMMM dd, yyyy')}</div>
                </div>
              </div>
              
              <div>
                <Label>Reason for Request</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {selectedRequest.reason}
                </div>
              </div>

              <div>
                <Label>Current Attendance</Label>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Time In:</span>
                    <div className="font-medium">
                      {format(new Date(selectedRequest.attendance?.time_in || ''), 'h:mm a')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time Out:</span>
                    <div className="font-medium">
                      {selectedRequest.attendance?.time_out 
                        ? format(new Date(selectedRequest.attendance.time_out), 'h:mm a')
                        : 'Not recorded'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hours:</span>
                    <div className="font-medium">
                      {selectedRequest.attendance?.total_hours?.toFixed(1) || '—'} hrs
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="action">Action</Label>
                <Select value={reviewAction} onValueChange={(value: 'approve' | 'reject') => setReviewAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                      Approve Request
                    </SelectItem>
                    <SelectItem value="reject">
                      <XCircle className="w-4 h-4 mr-2 inline" />
                      Reject Request
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add notes about your decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitReview}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {reviewAction === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
