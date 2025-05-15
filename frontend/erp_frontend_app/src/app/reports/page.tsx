
// Reports Page - Placeholder UI with modern theme

'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, BarChart3, PieChart, LineChart, DollarSign, PackageSearch } from 'lucide-react'; // Example icons

// Dummy interfaces - to be replaced with actual data models from backend
interface ReportSummary {
  title: string;
  value: string | number;
  description?: string;
}

// interface ReportDataPoint {
//   label: string;
//   value: number;
// }

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Dummy data for placeholder UI
const dummySalesSummary: ReportSummary[] = [
  { title: 'Total Sales Revenue', value: '$150,750.25', description: 'For the current fiscal year' },
  { title: 'Total Orders', value: 1245, description: 'Completed and shipped orders' },
  { title: 'Average Order Value', value: '$121.08', description: 'Across all customers' },
];

const dummyInventorySummary: ReportSummary[] = [
  { title: 'Total Inventory Value', value: '$85,300.00', description: 'Based on average cost' },
  { title: 'Items in Stock', value: 7890, description: 'Across all product lines' },
  { title: 'Out of Stock Items', value: 12, description: 'Requiring reorder' },
];

export default function ReportsPage() {
  const [salesSummary, setSalesSummary] = useState<ReportSummary[]>([]);
  const [inventorySummary, setInventorySummary] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, ] = useState<string | null>(null);

  // Simulate fetching data - replace with actual API calls when backend is ready
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setSalesSummary(dummySalesSummary);
      setInventorySummary(dummyInventorySummary);
      setLoading(false);
    }, 1000); // Simulate network delay
  }, []);

  if (loading) {
    return <p className="p-6">Loading reports data...</p>;
  }

  if (error) {
    return <p className="p-6 text-destructive">Error fetching reports data: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports Dashboard</h1>
          <p className="text-muted-foreground">Key metrics and insights for your business.</p>
        </div>
        {/* Placeholder for future actions like "Customize Dashboard" or "Export All" */}
        <Button disabled>
          <Download className="mr-2 h-4 w-4" /> Export Reports (Coming Soon)
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {salesSummary.map((item, index) => (
          <Card key={`sales-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {inventorySummary.map((item, index) => (
          <Card key={`inventory-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <PackageSearch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Reports (Coming Soon)</CardTitle>
          <CardDescription>Generate and view detailed financial and operational reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Button variant="outline" disabled className="w-full justify-start">
            <BarChart3 className="mr-2 h-4 w-4" /> Sales by Product
          </Button>
          <Button variant="outline" disabled className="w-full justify-start">
            <PieChart className="mr-2 h-4 w-4" /> Inventory Aging
          </Button>
          <Button variant="outline" disabled className="w-full justify-start">
            <LineChart className="mr-2 h-4 w-4" /> Profit & Loss Trend
          </Button>
          <Button variant="outline" disabled className="w-full justify-start">
            <Download className="mr-2 h-4 w-4" /> Customer Purchase History
          </Button>
          <Button variant="outline" disabled className="w-full justify-start">
            <Download className="mr-2 h-4 w-4" /> Supplier Performance
          </Button>
        </CardContent>
      </Card>
      
      {/* Placeholder for Grafana integration */}
      <Card>
        <CardHeader>
            <CardTitle>Interactive Dashboards (Grafana Integration - Planned)</CardTitle>
            <CardDescription>Visualize your data with powerful, interactive dashboards.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Future integration with Grafana will allow for dynamic and customizable dashboards here.
            </p>
            {/* Example of where an embedded Grafana panel might go */}
            <div className="mt-4 p-4 border border-dashed rounded-md h-64 flex items-center justify-center bg-muted/30">
                <p className="text-center text-muted-foreground">
                    Grafana Dashboard Panel Placeholder
                    <br />
                    (Requires backend setup and Grafana configuration)
                </p>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}

