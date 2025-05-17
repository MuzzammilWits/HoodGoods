// frontend/src/components/reporting/SalesTrendReport.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react'; // NEW: Added useRef
import { useAuth0 } from '@auth0/auth0-react';
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
  TimeScale,
  // TimeSeriesScale, // Usually TimeScale is sufficient with date-fns adapter
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// NEW: Imports for PDF export
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { getSalesTrendReport, downloadSalesTrendCsv } from '../../services/reportingService';
import { SalesReportData, TimePeriod } from '../../types';
import './SalesTrendReport.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
  // TimeSeriesScale // Only if specifically needed and configured
);

const SalesTrendReport: React.FC = () => {
  const { getAccessTokenSilently } = useAuth0();

  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TimePeriod.WEEKLY);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // NEW: Ref for the chart container
  const chartContainerRef = useRef<HTMLDivElement>(null);

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
        setReportData(null);
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
      labels: reportData.salesData.map(d => new Date(d.date)), // Ensure dates are Date objects for time scale
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
          text: `Sales Trends - ${reportData?.summary?.period || selectedPeriod}${reportData?.summary?.startDate && reportData?.summary?.endDate ? ` (${reportData.summary.startDate} to ${reportData.summary.endDate})` : ''}`,
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
                  selectedPeriod === TimePeriod.WEEKLY ? 'day' : // For weekly, daily data points are fine
                  selectedPeriod === TimePeriod.MONTHLY ? 'day' : // For monthly, daily data points are fine
                  'month') as 'day' | 'week' | 'month', // unit can be day, week, month etc.
            tooltipFormat: 'MMM dd, yyyy',
             displayFormats: { // How dates are displayed on the axis
                day: 'MMM dd',
                week: 'MMM dd', // Consider 'wo' for week number if adapter supports
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
              return 'R ' + value; // Or new Intl.NumberFormat...
            }
          }
        },
      },
    };
  }, [reportData, selectedPeriod]);

  const handleDownloadCsv = async () => {
    console.log("SalesTrendReport: Attempting to download CSV...");
    if (!reportData || !reportData.summary) {
        setError("Report data not available for CSV export.");
        return;
    }
    try {
      const token = await getAccessTokenSilently();
      const blob = await downloadSalesTrendCsv(token, selectedPeriod, selectedPeriod === TimePeriod.DAILY ? selectedDate : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_trend_${selectedPeriod}_${reportData.summary.startDate}_to_${reportData.summary.endDate}.csv`;
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

  // NEW: PDF Download Handler
  const handleDownloadPdf = async () => {
    console.log("SalesTrendReport: Attempting to download PDF...");
    if (!chartContainerRef.current || !reportData || !reportData.summary) {
      setError("Chart or report data is not available for PDF export.");
      console.error("PDF Export: Chart ref or report data missing.");
      return;
    }

    const chartElement = chartContainerRef.current;
    // Temporarily ensure a background color for capture if needed, or set it via CSS
    // const originalBackgroundColor = chartElement.style.backgroundColor;
    // chartElement.style.backgroundColor = 'white';

    try {
      const canvas = await html2canvas(chartElement, { 
        scale: 2, // Higher scale for better resolution
        useCORS: true, // If images from other origins are on the chart
        logging: true, // Enable logging for html2canvas for debugging
        // backgroundColor: '#ffffff', // Explicitly set background for canvas
       });
      
      // chartElement.style.backgroundColor = originalBackgroundColor; // Reset if changed

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape', // Best for most charts
        unit: 'pt', // points are common for PDF
        format: 'a4' // Standard A4 size
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 40; // pt

      const imgWidthOriginal = canvas.width / 2; // html2canvas scale affects canvas.width, adjust if scale is not 1
      const imgHeightOriginal = canvas.height / 2;
      
      // Calculate aspect ratio to fit within A4 with margins
      const aspectRatio = imgWidthOriginal / imgHeightOriginal;
      let newImgWidth = pdfWidth - 2 * margin;
      let newImgHeight = newImgWidth / aspectRatio;

      if (newImgHeight > pdfHeight - 2 * margin - 50) { // 50 for title and summary space
          newImgHeight = pdfHeight - 2 * margin - 50;
          newImgWidth = newImgHeight * aspectRatio;
      }

      const x = (pdfWidth - newImgWidth) / 2;
      let y = margin;

      // Add Title
      pdf.setFontSize(18);
      pdf.text(
        `Sales Trends - ${reportData.summary.period} (${reportData.summary.startDate} to ${reportData.summary.endDate})`, 
        pdfWidth / 2, 
        y, 
        { align: 'center' }
      );
      y += 30; // Space after title

      // Add chart image
      pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
      y += newImgHeight + 20; // Space after chart

      // Add Summary (optional, but nice to have)
      if (reportData.summary) {
        pdf.setFontSize(10);
        pdf.text(`Total Sales: R ${reportData.summary.totalSales.toFixed(2)}`, margin, y); y += 15;
        pdf.text(`Average Daily Sales: R ${reportData.summary.averageDailySales.toFixed(2)}`, margin, y); y += 15;
        pdf.text(`Report Generated: ${new Date(reportData.reportGeneratedAt).toLocaleString()}`, margin, y);
      }
      
      pdf.save(`sales_trend_report_${reportData.summary.startDate}_to_${reportData.summary.endDate}.pdf`);
      console.log("SalesTrendReport: PDF download initiated.");

    } catch (err: any) {
      console.error("SalesTrendReport: Failed to generate or download PDF:", err);
      setError(err.message || 'Failed to generate PDF.');
      // if (chartElement) chartElement.style.backgroundColor = originalBackgroundColor; // Reset if changed
    }
  };


  if (loading) {
    return <div className="loading-message">Loading sales data...</div>;
  }

  return (
    <div className="sales-trend-report">
      <h3>Sales Trend Report</h3>
      <div className="report-controls">
        <label htmlFor="period-select">Custom View: </label>
        <select
          id="period-select"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
        >
          {Object.values(TimePeriod).map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
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
        {/* NEW: PDF Download Button */}
        <button onClick={handleDownloadPdf} className="pdf-button" style={{ marginLeft: '10px' }} disabled={!chartData || loading}>
            Download PDF
        </button>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      {!error && !chartData && !loading && (
        <div className="info-message">No sales data available for the selected period.</div>
      )}

      {/* MODIFIED: Add ref and a wrapper style for PDF capture if needed */}
      {chartData && (
        <div 
          ref={chartContainerRef} 
          className="chart-container-st" 
          style={{ backgroundColor: 'white', padding: '10px' }} // Ensure background for capture
        >
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