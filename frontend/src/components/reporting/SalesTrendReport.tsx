// frontend/src/components/reporting/SalesTrendReport.tsx
import React, { useEffect, useState, useRef } from 'react';
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
  TimeScale, // Ensure TimeScale is imported
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Adapter for date handling
import {
  fetchSalesTrendsForSeller,
  downloadSalesTrendsForSellerCSV,
  SalesTrendDataPointAPI
} from '../../services/reportingService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './SalesTrendReport.css'; // Ensure this CSS file exists or create it

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler
);

// Define the props for this component
interface SalesTrendReportProps {
  // storeId is not strictly needed if the backend infers it from the token,
  // but can be kept if you have other client-side uses for it.
  // For now, we assume backend infers it, so it's commented out.
  // storeId: string;
  getAccessTokenSilently: () => Promise<string>; // Function to get Auth0 token
}

const SalesTrendReport: React.FC<SalesTrendReportProps> = ({ getAccessTokenSilently }) => {
  const [reportData, setReportData] = useState<SalesTrendDataPointAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartsExportRef = useRef<HTMLDivElement>(null); // Changed from HTMLElement to HTMLDivElement for more specificity if it wraps both charts

  useEffect(() => {
    const loadSalesData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getAccessTokenSilently(); // Get the token
        const data = await fetchSalesTrendsForSeller(token); // Pass token to service function
        // Sort data by date to ensure charts display correctly
        data.sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());
        setReportData(data);
      } catch (err: any) {
        console.error("Failed to load sales trends data:", err);
        setError(err.message || "Failed to load sales trends data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSalesData();
    // Dependency array: getAccessTokenSilently is a stable function from useAuth0,
    // but including it is good practice if it's used directly in the effect.
  }, [getAccessTokenSilently]);

  const handleDownloadPDF = async () => {
    if (chartsExportRef.current) {
      const originalBackgroundColor = chartsExportRef.current.style.backgroundColor;
      chartsExportRef.current.style.backgroundColor = 'white';

      try {
        // Using a higher scale can improve resolution for PDF
        const canvas = await html2canvas(chartsExportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        chartsExportRef.current.style.backgroundColor = originalBackgroundColor;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' }); // Removed compress:true, it's not a standard option here
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate aspect ratio
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        const margin = 20; // px
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin - 30; // Extra margin for title

        const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

        const newImgWidth = imgWidth * ratio;
        const newImgHeight = imgHeight * ratio;
        
        const imgX = (pdfWidth - newImgWidth) / 2;
        const imgY = margin + 30; // Position below title

        pdf.setFontSize(18);
        pdf.text("My Store Sales Trends", pdfWidth / 2, margin + 15, { align: 'center' });
        pdf.addImage(imgData, 'PNG', imgX, imgY, newImgWidth, newImgHeight);
        pdf.save('my_sales_trends_report.pdf');

      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
        if (chartsExportRef.current) { // Check again as it might be null in async error handling
            chartsExportRef.current.style.backgroundColor = originalBackgroundColor;
        }
        alert("Could not generate PDF report. Please try again.");
      }
    } else {
      alert("Chart data not available for PDF export.");
    }
  };

  const handleDownloadCSV = async () => { // Made async to use await
    try {
      const token = await getAccessTokenSilently(); // Get the token
      const blob = await downloadSalesTrendsForSellerCSV(token); // Pass token
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_sales_trends.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (csvError: any) {
      console.error("Failed to download CSV:", csvError);
      alert(`Could not download CSV report: ${csvError.message}`);
    }
  };

  if (isLoading) return <p className="report-loading centered-message">Loading sales trends data...</p>;
  if (error) return <p className="report-error centered-message" style={{ color: 'red' }}>Error: {error}</p>;

  const commonChartOptions: any = { // Consider typing this more strictly if possible
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const, // Important for date-fns adapter
        time: {
          unit: reportData.length > 60 ? 'month' : reportData.length > 7 ? 'week' : 'day', // Dynamic unit
          tooltipFormat: 'MMM dd, yyyy', // e.g., Jan 01, 2023
          displayFormats: {
            day: 'MMM dd',     // e.g., Jan 01
            week: 'MMM dd',    // e.g., Jan 01 (start of week)
            month: 'MMM yyyy'  // e.g., Jan 2023
          }
        },
        title: { display: true, text: 'Date', font: { size: 14 } },
        grid: { display: false }
      },
      // Y-axis defined per chart below for clarity
    },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) { label += ': '; }
            if (context.parsed.y !== null) {
              if (context.dataset.label?.toLowerCase().includes('revenue')) {
                label += new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(context.parsed.y);
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    interaction: { mode: 'index' as const, intersect: false },
    elements: { point: { radius: 2, hoverRadius: 4 } }
  };

  if (!reportData || reportData.length === 0) {
    return (
      <article className="sales-trend-report card" aria-labelledby="sales-trends-main-heading">
        <div className="card-header">
            <h3 id="sales-trends-main-heading" className="report-title h5 mb-0">Sales Trends</h3>
        </div>
        <div className="card-body">
            <p className="report-no-data centered-message card-text">No sales data found for the current period.</p>
        </div>
        <footer className="report-actions card-footer text-end">
          <button onClick={handleDownloadCSV} className="btn btn-secondary btn-sm me-2">Download CSV</button>
          <button onClick={handleDownloadPDF} disabled className="btn btn-secondary btn-sm">Download PDF</button>
        </footer>
      </article>
    );
  }

  // Ensure date strings are converted to Date objects for the time scale
  const chartLabels = reportData.map(d => new Date(d.order_date));

  const revenueChartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Total Revenue (ZAR)',
      data: reportData.map(d => d.total_revenue),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true,
      tension: 0.1
    }]
  };

  const ordersChartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Number of Orders',
      data: reportData.map(d => d.order_count),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      fill: true,
      tension: 0.1
    }]
  };

  return (
    <article className="sales-trend-report card" aria-labelledby="sales-trends-main-heading">
        <div className="card-header">
            <h3 id="sales-trends-main-heading" className="report-title h5 mb-0">Sales Trends</h3>
        </div>
      {/* chartsExportRef should wrap the content intended for PDF export */}
      <div ref={chartsExportRef} className="charts-export-area card-body"> {/* Ensure this div has a white background if needed for PDF */}
        <section className="chart-container mb-4" aria-labelledby="revenue-chart-heading">
          {/* <h4 id="revenue-chart-heading" className="chart-title">Revenue Over Time</h4> */}
          <div className="chart-canvas-wrapper" style={{ height: '300px', position: 'relative' }}>
            <Line
              options={{
                ...commonChartOptions,
                plugins: { ...commonChartOptions.plugins, title: { display: true, text: 'Revenue Over Time' } },
                scales: { ...commonChartOptions.scales, y: { beginAtZero: true, title: { display: true, text: 'Revenue (ZAR)', font: {size: 14} } } }
              }}
              data={revenueChartData}
            />
          </div>
        </section>

        <section className="chart-container" aria-labelledby="orders-chart-heading">
          {/* <h4 id="orders-chart-heading" className="chart-title">Orders Over Time</h4> */}
           <div className="chart-canvas-wrapper" style={{ height: '300px', position: 'relative' }}>
            <Line
              options={{
                ...commonChartOptions,
                plugins: { ...commonChartOptions.plugins, title: { display: true, text: 'Orders Over Time' } },
                scales: { ...commonChartOptions.scales, y: { beginAtZero: true, title: { display: true, text: 'Number of Orders', font: {size: 14} } } }
              }}
              data={ordersChartData}
            />
          </div>
        </section>
      </div>

      <footer className="report-actions card-footer text-end">
        <button onClick={handleDownloadCSV} className="btn btn-primary btn-sm me-2">Download Sales Data (CSV)</button>
        <button onClick={handleDownloadPDF} className="btn btn-primary btn-sm">Download Sales Charts (PDF)</button>
      </footer>
    </article>
  );
};

export default SalesTrendReport;