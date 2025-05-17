// frontend/src/components/reporting/InventoryStatusReport.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { getInventoryStatusReport, downloadInventoryStatusCsv } from '../../services/reportingService';
import { InventoryStatusReportData, FullInventoryItem, LowStockItem, OutOfStockItem } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import './InventoryStatusReport.css';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface AutoTableHookData {
    table: any;
    pageNumber: number;
    settings: any;
    doc: jsPDF;
    cursor: { x: number; y: number } | null;
}

const InventoryStatusReport: React.FC = () => {
  const [reportData, setReportData] = useState<InventoryStatusReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const pieChartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAccessTokenSilently();
        const data = await getInventoryStatusReport(token);
        setReportData(data);
      } catch (err: any) {
        console.error("InventoryStatusReport: Error fetching report data:", err);
        setError(err.message || 'An error occurred while fetching the inventory report.');
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [getAccessTokenSilently]);

  const pieChartData = useMemo(() => {
    if (!reportData?.stockBreakdown) return null;
    const { stockBreakdown } = reportData;
    return {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [
        {
          label: 'Stock Status (%)',
          data: [
            stockBreakdown.inStockPercent,
            stockBreakdown.lowStockPercent,
            stockBreakdown.outOfStockPercent,
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(255, 99, 132, 0.7)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [reportData]);

  const categories = useMemo(() => {
    if (!reportData?.fullInventory) return [];
    return Array.from(new Set(reportData.fullInventory.map(item => item.category)));
  }, [reportData]);

  const filteredFullInventory = useMemo(() => {
    if (!reportData?.fullInventory) return [];
    return reportData.fullInventory.filter(item => {
      const matchesSearchTerm = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearchTerm && matchesCategory;
    });
  }, [reportData, searchTerm, selectedCategory]);

  const handleDownloadCsv = async () => {
    if (!reportData) {
        setError("Report data not available for CSV export.");
        return;
    }
    try {
      const token = await getAccessTokenSilently();
      const blob = await downloadInventoryStatusCsv(token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_status_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("InventoryStatusReport: Failed to download CSV:", err);
      setError(err.message || 'Failed to download CSV.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportData) {
      console.error("PDF Export: reportData is null. Cannot generate PDF.");
      setError("Report data not available to generate PDF.");
      return;
    }
    console.log("PDF Export: Starting PDF generation...");
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let yPos = margin;

      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      doc.setFontSize(18);
      doc.text('Inventory Status Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      doc.setFontSize(9);
      doc.text(`Report Generated: ${reportData.reportGeneratedAt ? new Date(reportData.reportGeneratedAt).toLocaleString() : 'N/A'}`, margin, yPos);
      doc.text(`Printed: ${formattedDate} ${formattedTime}`, pageWidth - margin, yPos, { align: 'right'});
      yPos += 25;

      if (pieChartContainerRef.current) {
        console.log("PDF Export: Capturing pie chart element...");
        const chartElementToCapture = pieChartContainerRef.current;
        // const originalWidth = chartElementToCapture.style.width; // Store original styles
        // const originalHeight = chartElementToCapture.style.height;
        // chartElementToCapture.style.width = '400px'; 
        // chartElementToCapture.style.height = '400px';

        const canvas = await html2canvas(chartElementToCapture, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        });
        
        // chartElementToCapture.style.width = originalWidth; // Reset styles
        // chartElementToCapture.style.height = originalHeight;

        const chartImgData = canvas.toDataURL('image/png');
        console.log("PDF Export: Pie chart captured.");

        const chartImgWidthOriginal = canvas.width / 2;
        const chartImgHeightOriginal = canvas.height / 2;
        const chartAspectRatio = chartImgWidthOriginal / chartImgHeightOriginal;
        
        let chartDisplayWidth = pageWidth * 0.6;
        chartDisplayWidth = Math.min(chartDisplayWidth, 300);
        let chartDisplayHeight = chartDisplayWidth / chartAspectRatio;
        
        if (yPos + chartDisplayHeight > pageHeight - margin - 20) {
            doc.addPage();
            yPos = margin;
        }
        
        const chartX = (pageWidth - chartDisplayWidth) / 2;
        doc.addImage(chartImgData, 'PNG', chartX, yPos, chartDisplayWidth, chartDisplayHeight);
        console.log(`PDF Export: Pie chart image added.`);
        yPos += chartDisplayHeight + 15;
      } else {
        console.warn("PDF Export: Pie chart container ref not found. Skipping chart image.");
        if (reportData.stockBreakdown) { // Fallback text summary if chart not captured
            if (yPos + 60 > pageHeight - margin) { doc.addPage(); yPos = margin; }
            doc.setFontSize(12);
            doc.text('Stock Breakdown Summary (No Chart Image):', margin, yPos); yPos += 15;
            doc.setFontSize(10);
            doc.text(`- Total Products: ${reportData.stockBreakdown.totalProducts}`, margin + 10, yPos); yPos += 12;
            doc.text(`- In Stock: ${reportData.stockBreakdown.inStockPercent}%`, margin + 10, yPos); yPos += 12;
            doc.text(`- Low Stock: ${reportData.stockBreakdown.lowStockPercent}%`, margin + 10, yPos); yPos += 12;
            doc.text(`- Out of Stock: ${reportData.stockBreakdown.outOfStockPercent}%`, margin + 10, yPos); yPos += 20;
        }
      }
      
      if (reportData.stockBreakdown && pieChartContainerRef.current) {
          const summaryLines = [
              `- Total Products: ${reportData.stockBreakdown.totalProducts}`,
              `- In Stock: ${reportData.stockBreakdown.inStockPercent}%`,
              `- Low Stock: ${reportData.stockBreakdown.lowStockPercent}%`,
              `- Out of Stock: ${reportData.stockBreakdown.outOfStockPercent}%`
          ];
          const summaryHeight = summaryLines.length * 12 + 15;
          if (yPos + summaryHeight > pageHeight - margin) {
              doc.addPage();
              yPos = margin;
          }
          doc.setFontSize(10);
          summaryLines.forEach(line => {
              doc.text(line, margin, yPos); yPos += 12;
          });
          yPos += 10;
          console.log("PDF Export: After itemized textual breakdown, yPos:", yPos);
      }

      const checkPageOverflow = (currentY: number, neededHeight: number = 20) => {
        if (currentY + neededHeight > pageHeight - margin) {
          doc.addPage();
          return margin;
        }
        return currentY;
      };
      
      const tableFontSize = 9;
      const titleFontSize = 11;
      const sectionTitleSpacing = 12; // Space after a section title text (e.g., "Low Stock Items")
      const afterTableSpacing = 15;   // Space after a table

      const drawTable = (title: string, head: any[][], body: any[][], headFillColor: string, currentY: number) => {
        let newY = checkPageOverflow(currentY, sectionTitleSpacing + 20); // Estimate space for title + one row
        doc.setFontSize(titleFontSize);
        doc.text(title, margin, newY); newY += sectionTitleSpacing;
        autoTable(doc, {
          startY: newY, head: head, body: body,
          theme: 'striped', 
          headStyles: { fillColor: headFillColor, fontSize: tableFontSize, textColor: '#ffffff' }, // White text on dark headers
          bodyStyles: { fontSize: tableFontSize - 1 },
          didDrawPage: (data: AutoTableHookData) => { newY = data.cursor?.y ? data.cursor.y + afterTableSpacing : margin; }
        });
        return (doc as any).lastAutoTable.finalY + afterTableSpacing;
      };

      if (reportData.lowStockItems && reportData.lowStockItems.length > 0) {
        yPos = drawTable('Low Stock Items', 
            [['Product ID', 'Product Name', 'Current Quantity']],
            reportData.lowStockItems.map(item => [item.prodId, item.productName, item.currentQuantity]),
            '#ffA500', // Orange hex (was [255, 165, 0])
            yPos
        );
        console.log('PDF Export: After Low Stock Table, yPos:', yPos);
      } else {
        yPos = checkPageOverflow(yPos, sectionTitleSpacing);
        doc.setFontSize(tableFontSize);
        doc.text('No items are currently low on stock.', margin, yPos); yPos += sectionTitleSpacing;
      }
      
      if (reportData.outOfStockItems && reportData.outOfStockItems.length > 0) {
         yPos = drawTable('Out of Stock Items', 
            [['Product ID', 'Product Name']],
            reportData.outOfStockItems.map(item => [item.prodId, item.productName]),
            '#dc3545', // Red hex (was [220, 53, 69])
            yPos
        );
        console.log('PDF Export: After Out of Stock Table, yPos:', yPos);
      } else {
        yPos = checkPageOverflow(yPos, sectionTitleSpacing);
        doc.setFontSize(tableFontSize);
        doc.text('No items are currently out of stock.', margin, yPos); yPos += sectionTitleSpacing;
      }
      
      if (filteredFullInventory.length > 0) {
        let fullInventoryTitle = 'Full Inventory List';
        if (selectedCategory) fullInventoryTitle += ` (Category: ${selectedCategory})`;
        if (searchTerm) fullInventoryTitle += ` (Search: "${searchTerm}")`;
        
        yPos = drawTable(fullInventoryTitle, 
            [['Product ID', 'Product Name', 'Category', 'Quantity', 'Price (R)']],
            filteredFullInventory.map(item => [
              item.prodId, item.productName, item.category, item.quantity, item.price.toFixed(2),
            ]),
            '#17a2b8', // Teal/Blue hex (was [23, 162, 184])
            yPos
        );
        console.log('PDF Export: After Full Inventory Table');
      } else {
        yPos = checkPageOverflow(yPos, sectionTitleSpacing);
        doc.setFontSize(tableFontSize);
        doc.text('No products in full inventory or matching current filters.', margin, yPos);
      }

      doc.save('inventory_status_report_final.pdf');
      console.log("PDF Export: doc.save() called successfully.");

    } catch (pdfGenError: any) {
      console.error("PDF Export: Error during PDF generation process:", pdfGenError);
      setError(`Failed to generate PDF: ${pdfGenError.message}`);
    }
  };

  if (loading) return <div className="loading-message">Loading inventory report...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!reportData) return <div className="info-message">No inventory data available.</div>;

  return (
    <div className="inventory-status-report">
      <h2>Inventory Status Report</h2>
      <p className="report-generated-at">
        Report generated at: {new Date(reportData.reportGeneratedAt).toLocaleString()}
      </p>

      <div className="export-buttons">
        <button onClick={handleDownloadCsv} className="csv-button">Download CSV</button>
        <button onClick={handleDownloadPdf} className="pdf-button">Download PDF</button>
      </div>

      {pieChartData && (
        <div 
          ref={pieChartContainerRef} 
          className="inventory-pie-chart-container"
        >
          <h3>Stock Breakdown (Total Products: {reportData.stockBreakdown.totalProducts})</h3>
          <Pie 
            data={pieChartData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: true,
              plugins: { 
                legend: { position: 'top' }, 
                title: { display: false } 
              } 
            }} 
          />
        </div>
      )}

      <div className="inventory-sections">
        <div className="inventory-section low-stock-section">
          <h3>Low Stock Items (Less than {LOW_STOCK_THRESHOLD} units)</h3>
          {reportData.lowStockItems.length > 0 ? (
            <table>
              <thead><tr><th>Product ID</th><th>Product Name</th><th>Current Quantity</th></tr></thead>
              <tbody>
                {reportData.lowStockItems.map((item: LowStockItem) => (
                  <tr key={`low-${item.prodId}`}><td>{item.prodId}</td><td>{item.productName}</td><td>{item.currentQuantity}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (<p>No items are currently low on stock.</p>)}
        </div>

        <div className="inventory-section out-of-stock-section">
          <h3>Out of Stock Items</h3>
          {reportData.outOfStockItems.length > 0 ? (
            <table>
              <thead><tr><th>Product ID</th><th>Product Name</th></tr></thead>
              <tbody>
                {reportData.outOfStockItems.map((item: OutOfStockItem) => (
                  <tr key={`out-${item.prodId}`}><td>{item.prodId}</td><td>{item.productName}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (<p>No items are currently out of stock.</p>)}
        </div>
      </div>

      <div className="inventory-section full-inventory-section">
        <h3>Full Inventory List</h3>
        <div className="filters">
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        {filteredFullInventory.length > 0 ? (
          <table>
            <thead><tr><th>Product ID</th><th>Product Name</th><th>Category</th><th>Current Quantity</th><th>Price</th></tr></thead>
            <tbody>
              {filteredFullInventory.map((item: FullInventoryItem) => (
                <tr key={`full-${item.prodId}`}>
                  <td>{item.prodId}</td><td>{item.productName}</td><td>{item.category}</td><td>{item.quantity}</td><td>R {item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No products match your current filters or the inventory is empty.</p>
        )}
      </div>
    </div>
  );
};

const LOW_STOCK_THRESHOLD = 5; // Make sure this matches your backend logic for consistency in display

export default InventoryStatusReport;