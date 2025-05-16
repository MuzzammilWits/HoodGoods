// frontend/src/components/reporting/SalesTrendReport.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react'; // Import useAuth0
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // If using time scale
  TimeSeriesScale, // If using time series scale
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Import adapter if using time scales

import { getSalesTrendReport, downloadSalesTrendCsv } from '../../services/reportingService';
import { SalesReportData, TimePeriod, SalesData } from '../../types'; // Make sure SalesData is imported if used individually
import './SalesTrendReport.css'; // Your existing CSS

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Register TimeScale if your x-axis is time-based
  TimeSeriesScale // Register TimeSeriesScale if appropriate
);

// Remove the prop type if getAccessTokenSilently is no longer a prop
// interface SalesTrendReportProps {
//   getAccessTokenSilently: () => Promise<string>;
// }

const SalesTrendReport: React.FC = (/* props: SalesTrendReportProps */) => { // Remove props if not used
  const { getAccessTokenSilently } = useAuth0(); // Use the hook directly

  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TimePeriod.WEEKLY);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today for daily/specific views

  useEffect(() => {
    const fetchReport = async () => {
      console.log(`SalesTrendReport: Fetching report for period: ${selectedPeriod}, date: ${selectedDate}`);
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessTokenSilently();
        console.log("SalesTrendReport: Token fetched successfully.");
        const data = await getSalesTrendReport(token, selectedPeriod, selectedPeriod === TimePeriod.DAILY ? selectedDate : undefined);
        console.log("SalesTrendReport: Data fetched:", data);
        setReportData(data);
      } catch (err: any) {
        console.error("SalesTrendReport: Error fetching sales trend report:", err);
        setError(err.message || 'An unexpected error occurred while fetching sales trends.');
        setReportData(null); // Clear previous data on error
      } finally {
        setLoading(false);
        console.log("SalesTrendReport: Fetch attempt finished.");
      }
    };

    fetchReport();
  }, [getAccessTokenSilently, selectedPeriod, selectedDate]);

  const chartData = useMemo(() => {
    if (!reportData || !reportData.salesData || reportData.salesData.length === 0) {
      console.log("SalesTrendReport: No sales data available for chart.");
      return null;
    }
    console.log("SalesTrendReport: Preparing chart data from:", reportData.salesData);
    return {
      labels: reportData.salesData.map(d => d.date), // Dates should be in a format Chart.js understands (e.g., YYYY-MM-DD)
      datasets: [
        {
          label: 'Daily Sales (R)',
          data: reportData.salesData.map(d => d.sales),
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        },
      ],
    };
  }, [reportData]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `Sales Trends - ${reportData?.summary?.period || selectedPeriod} (${reportData?.summary?.startDate} to ${reportData?.summary?.endDate})`,
        },
        tooltip: {
            callbacks: {
                label: function(context: any) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(context.parsed.y);
                    }
                    return label;
                }
            }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: (selectedPeriod === TimePeriod.DAILY ? 'day' :
                  selectedPeriod === TimePeriod.WEEKLY ? 'day' :
                  selectedPeriod === TimePeriod.MONTHLY ? 'day' :
                  'month') as 'day' | 'month',
            tooltipFormat: 'MMM dd, yyyy',
             displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy',
                year: 'yyyy'
            }
          },
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Sales (ZAR)',
          },
          ticks: {
            callback: function(value: any) {
              return 'R ' + value;
            }
          }
        },
      },
    };
  }, [reportData, selectedPeriod]);


  const handleDownloadCsv = async () => {
    console.log("SalesTrendReport: Attempting to download CSV...");
    try {
      const token = await getAccessTokenSilently();
      const blob = await downloadSalesTrendCsv(token, selectedPeriod, selectedPeriod === TimePeriod.DAILY ? selectedDate : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_trend_${selectedPeriod}_${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      console.log("SalesTrendReport: CSV download initiated.");
    } catch (err: any) {
      console.error("SalesTrendReport: Failed to download CSV:", err);
      setError(err.message || 'Failed to download CSV.');
    }
  };


  if (loading) {
    return <div className="loading-message">Loading sales data...</div>;
  }

  return (
    <div className="sales-trend-report">
      <h3>Sales Trend Report</h3>
      <div className="report-controls">
        <label htmlFor="period-select">Select Period: </label>
        <select
          id="period-select"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
        >
          {Object.values(TimePeriod).map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        {/* Optionally show date picker if period is 'daily' or for specific range selection */}
        {selectedPeriod === TimePeriod.DAILY && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ marginLeft: '10px' }}
          />
        )}
         <button onClick={handleDownloadCsv} className="csv-button" style={{ marginLeft: '10px' }}>
            Download CSV
        </button>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      {!error && !chartData && !loading && (
        <div className="info-message">No sales data available for the selected period.</div>
      )}

      {chartData && (
        <div className="chart-container-st"> {/* Used a different class to avoid conflict if any */}
          <Line options={chartOptions} data={chartData} />
        </div>
      )}
      {reportData && reportData.summary && (
        <div className="report-summary">
          <h4>Report Summary</h4>
          <p>Total Sales: R {reportData.summary.totalSales.toFixed(2)}</p>
          <p>Average Daily Sales: R {reportData.summary.averageDailySales.toFixed(2)}</p>
          <p>Period Covered: {reportData.summary.startDate} to {reportData.summary.endDate}</p>
          <p>Report Generated: {new Date(reportData.reportGeneratedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default SalesTrendReport;