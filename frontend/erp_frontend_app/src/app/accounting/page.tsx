
// Accounting Page - Placeholder UI with modern theme

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Download } from 'lucide-react'; // Example icons

// Dummy interfaces - to be replaced with actual data models from backend
interface Account {
  account_id: string;
  account_name: string;
  account_type: string;
  balance?: number;
}

interface JournalEntryLine {
  account_id: string;
  account_name?: string; // For display
  debit: number;
  credit: number;
}

interface JournalEntry {
  journal_entry_id: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
  total_debits: number;
  total_credits: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Dummy data for placeholder UI
const dummyChartOfAccounts: Account[] = [
  { account_id: '1010', account_name: 'Cash', account_type: 'Asset', balance: 50000 },
  { account_id: '1200', account_name: 'Accounts Receivable', account_type: 'Asset', balance: 15000 },
  { account_id: '1400', account_name: 'Inventory', account_type: 'Asset', balance: 30000 },
  { account_id: '2010', account_name: 'Accounts Payable', account_type: 'Liability', balance: 10000 },
  { account_id: '3010', account_name: 'Common Stock', account_type: 'Equity', balance: 75000 },
  { account_id: '4010', account_name: 'Sales Revenue', account_type: 'Revenue', balance: 120000 },
  { account_id: '5010', account_name: 'Cost of Goods Sold', account_type: 'Expense', balance: 60000 },
];

const dummyJournalEntries: JournalEntry[] = [
  {
    journal_entry_id: 'JE001',
    date: '2025-05-01',
    description: 'Record sales on account',
    lines: [
      { account_id: '1200', account_name: 'Accounts Receivable', debit: 1200, credit: 0 },
      { account_id: '4010', account_name: 'Sales Revenue', debit: 0, credit: 1200 },
    ],
    total_debits: 1200,
    total_credits: 1200,
  },
  {
    journal_entry_id: 'JE002',
    date: '2025-05-03',
    description: 'Record cash received from customer',
    lines: [
      { account_id: '1010', account_name: 'Cash', debit: 500, credit: 0 },
      { account_id: '1200', account_name: 'Accounts Receivable', debit: 0, credit: 500 },
    ],
    total_debits: 500,
    total_credits: 500,
  },
];

export default function AccountingPage() {
  const [chartOfAccounts, setChartOfAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate fetching data - replace with actual API calls when backend is ready
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setChartOfAccounts(dummyChartOfAccounts);
      setJournalEntries(dummyJournalEntries);
      setLoading(false);
    }, 1000); // Simulate network delay
  }, []);

  if (loading) {
    return <p className="p-6">Loading accounting data...</p>;
  }

  if (error) {
    return <p className="p-6 text-destructive">Error fetching accounting data: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accounting Module</h1>
          <p className="text-muted-foreground">Manage your chart of accounts, journal entries, and financial statements.</p>
        </div>
        {/* Placeholder for future actions like "Add Journal Entry" */}
        <Button disabled> 
          <PlusCircle className="mr-2 h-4 w-4" /> Add Journal Entry (Coming Soon)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
          <CardDescription>List of all financial accounts in your general ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartOfAccounts.length === 0 ? (
            <p className="text-muted-foreground">No accounts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartOfAccounts.map(acc => (
                  <TableRow key={acc.account_id}>
                    <TableCell className="font-medium">{acc.account_id}</TableCell>
                    <TableCell>{acc.account_name}</TableCell>
                    <TableCell>{acc.account_type}</TableCell>
                    <TableCell className="text-right">${acc.balance?.toFixed(2) ?? 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>Record of all financial transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          {journalEntries.length === 0 ? (
            <p className="text-muted-foreground">No journal entries found.</p>
          ) : (
            <div className="space-y-4">
              {journalEntries.map(je => (
                <Card key={je.journal_entry_id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">JE-{je.journal_entry_id}</CardTitle>
                            <CardDescription>{je.description}</CardDescription>
                        </div>
                        <span className="text-sm text-muted-foreground">{new Date(je.date).toLocaleDateString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {je.lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell>{line.account_name || line.account_id}</TableCell>
                            <TableCell className="text-right">{line.debit > 0 ? `$${line.debit.toFixed(2)}` : ''}</TableCell>
                            <TableCell className="text-right">{line.credit > 0 ? `$${line.credit.toFixed(2)}` : ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell className="text-right">Totals:</TableCell>
                        <TableCell className="text-right">${je.total_debits.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${je.total_credits.toFixed(2)}</TableCell>
                      </TableRow>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>Generate and view key financial statements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" disabled className="w-full justify-start">
            <Download className="mr-2 h-4 w-4" /> Balance Sheet (Coming Soon)
          </Button>
          <Button variant="outline" disabled className="w-full justify-start">
            <Download className="mr-2 h-4 w-4" /> Income Statement (Coming Soon)
          </Button>
          <Button variant="outline" disabled className="w-full justify-start">
            <Download className="mr-2 h-4 w-4" /> Cash Flow Statement (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

