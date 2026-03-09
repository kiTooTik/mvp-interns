import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  status: 'present' | 'absent' | 'paid';
  time_in?: string;
  time_out?: string;
}

interface AllowanceCalculation {
  totalPaidDays: number;
  totalUsedAmount: number;
  remainingBalance: number;
  dailyRate: number;
  totalInterns: number;
  processedDays: string[];
  stopAllocation: boolean;
}

export default function AllowanceManagementAdvanced() {
  const [companyBudget, setCompanyBudget] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [calculation, setCalculation] = useState<AllowanceCalculation | null>(null);
  const [unpaidRecords, setUnpaidRecords] = useState<AttendanceRecord[]>([]);

  // Fetch unpaid attendance records
  useEffect(() => {
    const fetchUnpaidRecords = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('status', 'present')
          .is('time_out', null)
          .order('date', { ascending: true });

        if (error) {
          console.error('Error fetching unpaid records:', error);
          return;
        }

        setUnpaidRecords(data || []);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUnpaidRecords();
  }, []);

  const processAllowanceDaily = async () => {
    const budget = parseFloat(companyBudget);

    // Validation
    if (!budget || budget <= 0) {
      toast.error('Invalid Input', {
        description: 'Please enter a valid company budget amount.',
      });
      return;
    }

    if (unpaidRecords.length === 0) {
      toast.error('No Unpaid Days', {
        description: 'There are no unpaid attendance days to process.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get session token
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        toast.error('Authentication Error', {
          description: 'You must be logged in to process allowance.',
        });
        return;
      }

      // Call API endpoint
      const response = await fetch(`${API_BASE_URL}/api/admin/process-allowance-daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyBudget: budget
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        toast.error('Processing Failed', {
          description: responseData?.error || 'Failed to process allowance.',
        });
        return;
      }

      setCalculation(responseData.calculation);
      toast.success('Processing Complete', {
        description: `Processed ${responseData.calculation.totalPaidDays} days successfully!`,
      });

      // Refresh unpaid records
      const { data: refreshedData } = await supabase
        .from('attendance')
        .select('*')
        .eq('status', 'present')
        .is('time_out', null)
        .order('date', { ascending: true });

      setUnpaidRecords(refreshedData || []);

    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Processing Failed', {
        description: 'An error occurred during processing.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProcessing = () => {
    setCompanyBudget('');
    setCalculation(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Allowance Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyBudget">Company Budget (Pesos)</Label>
              <Input
                id="companyBudget"
                type="number"
                placeholder="Enter total company budget for intern allowances"
                value={companyBudget}
                onChange={(e) => setCompanyBudget(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div>
              <Label>Unpaid Days Available</Label>
              <div className="text-2xl font-bold text-blue-600">
                {unpaidRecords.length}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={processAllowanceDaily}
              disabled={isProcessing || !companyBudget || parseFloat(companyBudget) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Processing...' : 'Process Allowance Daily'}
            </Button>
            <Button
              variant="outline"
              onClick={resetProcessing}
              disabled={isProcessing}
            >
              Reset
            </Button>
          </div>

          {calculation && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Processing Results</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Daily Rate per Intern</div>
                  <div className="text-xl font-bold text-green-600">
                    ₱{calculation.dailyRate}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Total Paid Days</div>
                  <div className="text-xl font-bold text-blue-600">
                    {calculation.totalPaidDays} days
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Total Interns</div>
                  <div className="text-xl font-bold text-purple-600">
                    {calculation.totalInterns}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Total Used</div>
                  <div className="text-xl font-bold text-orange-600">
                    ₱{calculation.totalUsedAmount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Remaining Balance</div>
                  <div className="text-xl font-bold text-red-600">
                    ₱{calculation.remainingBalance.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Allocation Status</div>
                  <div className="text-xl font-bold">
                    {calculation.stopAllocation ? (
                      <span className="text-red-600">Stopped</span>
                    ) : (
                      <span className="text-green-600">Completed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">Business Rules Applied:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Daily allowance per intern: ₱150 (fixed rate)</li>
                  <li>• Only interns marked PRESENT are paid</li>
                  <li>• Day-by-day budget consumption based on attendance</li>
                  <li>• Processing stops when budget insufficient</li>
                  <li>• Double payments prevented via status checks</li>
                  <li>• Remaining balance: ₱{calculation.remainingBalance} (carried over)</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unpaid Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No unpaid attendance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Intern ID</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Time In</th>
                    <th className="text-left p-2">Time Out</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{record.date}</td>
                      <td className="p-2">{record.user_id}</td>
                      <td className="p-2">{getStatusBadge(record.status)}</td>
                      <td className="p-2">{record.time_in || '-'}</td>
                      <td className="p-2">{record.time_out || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
