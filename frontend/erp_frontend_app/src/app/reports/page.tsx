
'use client';

import { useEffect, useState } from 'react';

interface Report {
  report_name: string;
  [key: string]: any; // For other dynamic fields in reports
}

async function fetchReport(endpoint: string): Promise<Report | { error: string }> {
  try {
    const response = await fetch(`http://localhost:8000/api/reports/${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${endpoint}`);
    }
    return await response.json();
  } catch (e: any) {
    console.error(`Error fetching ${endpoint}:`, e);
    return { error: e.message };
  }
}

export default function ReportsPage() {
  const [salesReport, setSalesReport] = useState<Report | { error: string } | null>(null);
  const [inventoryReport, setInventoryReport] = useState<Report | { error: string } | null>(null);
  const [purchaseReport, setPurchaseReport] = useState<Report | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const [salesData, inventoryData, purchaseData] = await Promise.all([
        fetchReport('sales?start_date=2024-01-01&end_date=2024-12-31'), // Example params
        fetchReport('inventory?as_of_date=2024-12-31'), // Example params
        fetchReport('purchases?start_date=2024-01-01&end_date=2024-12-31') // Example params
      ]);
      setSalesReport(salesData);
      setInventoryReport(inventoryData);
      setPurchaseReport(purchaseData);
      setLoading(false);
    }

    loadReports();
  }, []);

  const renderReportCard = (title: string, reportData: Report | { error: string } | null) => {
    if (!reportData) return <p>Loading {title}...</p>;
    if ('error' in reportData) return <p>Error loading {title}: {reportData.error}</p>;

    return (
      <div className="p-4 border rounded-md shadow-sm">
        <h2 className="text-xl font-semibold mb-2">{reportData.report_name || title}</h2>
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
          {JSON.stringify(reportData, null, 2)}
        </pre>
      </div>
    );
  };

  if (loading) {
    return <p className="container mx-auto p-4">Loading reports...</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">ERP Reports</h1>
      <div className="space-y-6">
        {renderReportCard("Sales Report", salesReport)}
        {renderReportCard("Inventory Report", inventoryReport)}
        {renderReportCard("Purchase Report", purchaseReport)}
      </div>
    </div>
  );
}

