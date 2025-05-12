
'use client';

import { useEffect, useState } from 'react';

interface Account {
  account_id: string;
  account_name: string;
  account_type: string;
}

interface JournalEntryLine {
  account_id: string;
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

async function fetchAccountingData(endpoint: string): Promise<any | { error: string }> {
  try {
    const response = await fetch(`http://localhost:8000/api/accounting/${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${endpoint}`);
    }
    return await response.json();
  } catch (e: any) {
    console.error(`Error fetching ${endpoint}:`, e);
    return { error: e.message };
  }
}

export default function AccountingPage() {
  const [chartOfAccounts, setChartOfAccounts] = useState<Account[] | { error: string } | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[] | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccountingData() {
      setLoading(true);
      const [coaData, jeData] = await Promise.all([
        fetchAccountingData('chart-of-accounts'),
        fetchAccountingData('journal-entries'),
      ]);
      setChartOfAccounts(coaData);
      setJournalEntries(jeData);
      setLoading(false);
    }

    loadAccountingData();
  }, []);

  const renderChartOfAccounts = () => {
    if (!chartOfAccounts) return <p>Loading Chart of Accounts...</p>;
    if ('error' in chartOfAccounts) return <p>Error loading Chart of Accounts: {chartOfAccounts.error}</p>;
    if (chartOfAccounts.length === 0) return <p>No accounts found in the Chart of Accounts.</p>;

    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Chart of Accounts</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">Account ID</th>
                <th className="py-2 px-4 border-b text-left">Account Name</th>
                <th className="py-2 px-4 border-b text-left">Account Type</th>
              </tr>
            </thead>
            <tbody>
              {chartOfAccounts.map(acc => (
                <tr key={acc.account_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{acc.account_id}</td>
                  <td className="py-2 px-4 border-b">{acc.account_name}</td>
                  <td className="py-2 px-4 border-b">{acc.account_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderJournalEntries = () => {
    if (!journalEntries) return <p>Loading Journal Entries...</p>;
    if ('error' in journalEntries) return <p>Error loading Journal Entries: {journalEntries.error}</p>;
    if (journalEntries.length === 0) return <p>No journal entries found.</p>;

    return (
      <div>
        <h2 className="text-xl font-semibold mb-3">Journal Entries</h2>
        <div className="space-y-4">
          {journalEntries.map(je => (
            <div key={je.journal_entry_id} className="p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-medium">ID: {je.journal_entry_id} - {je.description}</h3>
              <p className="text-sm text-gray-600">Date: {je.date}</p>
              <table className="min-w-full text-sm mt-2">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-1 px-2 border-b text-left">Account ID</th>
                    <th className="py-1 px-2 border-b text-right">Debit</th>
                    <th className="py-1 px-2 border-b text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map((line, index) => (
                    <tr key={index}>
                      <td className="py-1 px-2 border-b">{line.account_id}</td>
                      <td className="py-1 px-2 border-b text-right">{line.debit > 0 ? line.debit.toFixed(2) : ''}</td>
                      <td className="py-1 px-2 border-b text-right">{line.credit > 0 ? line.credit.toFixed(2) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-semibold">
                  <tr>
                    <td className="py-1 px-2 border-b text-right">Totals:</td>
                    <td className="py-1 px-2 border-b text-right">{je.total_debits.toFixed(2)}</td>
                    <td className="py-1 px-2 border-b text-right">{je.total_credits.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <p className="container mx-auto p-4">Loading accounting data...</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Accounting Module</h1>
      {renderChartOfAccounts()}
      {renderJournalEntries()}
      {/* Placeholder for forms to add accounts/journal entries and view financial reports */}
    </div>
  );
}

