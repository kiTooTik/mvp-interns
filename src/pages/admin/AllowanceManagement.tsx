import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface AllowanceCalculation {
  daysCovered: number;
  totalUsed: number;
  remainingBalance: number;
  dailyAllowance: number;
  totalInterns: number;
}

export default function AllowanceManagement() {
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculation, setCalculation] = useState<AllowanceCalculation | null>(null);
  const [activeInterns, setActiveInterns] = useState(0);

  // Fetch active interns count
  useEffect(() => {
    const fetchActiveInterns = async () => {
      try {
        const { count, error } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'intern');

        if (error) {
          console.error('Error fetching interns:', error);
          return;
        }

        setActiveInterns(count || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchActiveInterns();
  }, []);

  const calculateAllowance = async () => {
    const budget = parseFloat(totalBudget);

    // Validation
    if (!budget || budget <= 0) {
      toast.error('Invalid Input', {
        description: 'Please enter a valid total budget amount.',
      });
      return;
    }

    if (activeInterns === 0) {
      toast.error('No Interns', {
        description: 'There are no active interns to allocate allowance to.',
      });
      return;
    }

    setIsCalculating(true);

    try {
      // Get session token
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        toast.error('Authentication Error', {
          description: 'You must be logged in to calculate allowance.',
        });
        return;
      }

      // Call API endpoint
      const response = await fetch(`${API_BASE_URL}/api/admin/calculate-allowance`, {
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
        toast.error('Calculation Failed', {
          description: responseData?.error || 'Failed to calculate allowance.',
        });
        return;
      }

      setCalculation(responseData.calculation);
      toast.success('Calculation Complete', {
        description: `Allowance calculated and saved successfully!`,
      });

    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation Failed', {
        description: 'An error occurred during calculation.',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculation = () => {
    setTotalBudget('');
    setCalculation(null);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Allowance Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalBudget">Intern Allowance Budget (Pesos)</Label>
              <Input
                id="totalBudget"
                type="number"
                placeholder="Enter total company budget for intern allowances"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                disabled={isCalculating}
              />
            </div>
            <div>
              <Label>Active Interns</Label>
              <div className="text-2xl font-bold text-blue-600">
                {activeInterns}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={calculateAllowance}
              disabled={isCalculating || !totalBudget || parseFloat(totalBudget) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Allowance'}
            </Button>
            <Button
              variant="outline"
              onClick={resetCalculation}
              disabled={isCalculating}
            >
              Reset
            </Button>
          </div>

          {calculation && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Calculation Results</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Daily Rate per Intern</div>
                  <div className="text-xl font-bold text-green-600">
                    ₱{calculation.dailyAllowance}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Days Covered</div>
                  <div className="text-xl font-bold text-blue-600">
                    {calculation.daysCovered} days
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
                    ₱{calculation.totalUsed.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Remaining Balance</div>
                  <div className="text-xl font-bold text-red-600">
                    ₱{calculation.remainingBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">Business Rules Applied:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Daily allowance per intern: ₱150 (fixed rate)</li>
                  <li>• Company budget: ₱{totalBudget} split equally among {calculation.totalInterns} interns</li>
                  <li>• Days covered: ₱{totalBudget} ÷ {calculation.totalInterns} ÷ ₱150 = {calculation.daysCovered} days</li>
                  <li>• No partial day payments allowed</li>
                  <li>• Remaining balance: ₱{calculation.remainingBalance} (carried over)</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
