// frontend/src/components/reporting/InventoryStatusReport.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { getInventoryStatusReport, downloadInventoryStatusCsv } from '../../services/reportingService';
import { InventoryStatusReportData, FullInventoryItem, LowStockItem, OutOfStockItem } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Make sure this is installed (npm install jspdf jspdf-autotable)

// Import a CSS file for styling this component
import './InventoryStatusReport.css';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface UserForPdf extends jsPDF {
    autoTable: (options: any) => jsPDF;
}

const InventoryStatusReport: React.FC = () => {
  const [reportData, setReportData] = useState<InventoryStatusReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAccessTokenSilently();
        const data = await getInventoryStatusReport(token);
        setReportData(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching the report.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [getAccessTokenSilently]);

  const pieChartData = useMemo(() => {
    if (!reportData) return null;
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
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 99, 132, 0.6)',
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
    if (!reportData) return [];
    const allCategories = new Set(reportData.fullInventory.map(item => item.category));
    return Array.from(allCategories);
  }, [reportData]);

  const filteredFullInventory = useMemo(() => {
    if (!reportData) return [];
    return reportData.fullInventory.filter(item => {
      const matchesSearchTerm = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearchTerm && matchesCategory;
    });
  }, [reportData, searchTerm, selectedCategory]);


  const handleDownloadCsv = async () => {
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
      setError(err.message || 'Failed to download CSV.');
      console.error(err);
    }
  };

  const handleDownloadPdf = () => {
    if (!reportData) return;

    const doc = new jsPDF() as UserForPdf;
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;


    doc.setFontSize(18);
    doc.text('Inventory Status Report', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Report Generated: ${reportData.reportGeneratedAt ? new Date(reportData.reportGeneratedAt).toLocaleString() : 'N/A'}`, 14, 30);
    doc.text(`Printed: ${formattedDate} ${formattedTime}`, pageWidth - 14, 30, { align: 'right'});


    // Add Pie Chart as Image (if possible, or just skip for PDF if too complex for now)
    // For simplicity, we might skip the chart in PDF or add its summary.
    let yPos = 40;
    if (reportData.stockBreakdown) {
        doc.setFontSize(12);
        doc.text('Stock Breakdown:', 14, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.text(`- Total Products: ${reportData.stockBreakdown.totalProducts}`, 14, yPos); yPos += 5;
        doc.text(`- In Stock: ${reportData.stockBreakdown.inStockPercent}%`, 14, yPos); yPos += 5;
        doc.text(`- Low Stock: ${reportData.stockBreakdown.lowStockPercent}%`, 14, yPos); yPos += 5;
        doc.text(`- Out of Stock: ${reportData.stockBreakdown.outOfStockPercent}%`, 14, yPos); yPos += 10;
    }


    // Low Stock Items
    if (reportData.lowStockItems.length > 0) {
      doc.setFontSize(14);
      doc.text('Low Stock Items', 14, yPos); yPos += 7;
      doc.autoTable({
        startY: yPos,
        head: [['Product Name', 'Current Quantity']],
        body: reportData.lowStockItems.map((item: LowStockItem) => [item.productName, item.currentQuantity]),
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        margin: { top: yPos },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Out of Stock Items
    if (reportData.outOfStockItems.length > 0) {
      doc.setFontSize(14);
      doc.text('Out of Stock Items', 14, yPos); yPos +=7;
      doc.autoTable({
        startY: yPos,
        head: [['Product Name']],
        body: reportData.outOfStockItems.map((item: OutOfStockItem) => [item.productName]),
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60] },
        margin: { top: yPos },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Full Inventory List
    if (filteredFullInventory.length > 0) {
      doc.setFontSize(14);
      doc.text(`Full Inventory List ${selectedCategory ? `(Category: ${selectedCategory})` : ''}${searchTerm ? ` (Search: "${searchTerm}")` : ''}`, 14, yPos); yPos += 7;
      doc.autoTable({
        startY: yPos,
        head: [['Product Name', 'Category', 'Quantity', 'Price']],
        body: filteredFullInventory.map((item: FullInventoryItem) => [
          item.productName,
          item.category,
          item.quantity,
          `R ${item.price.toFixed(2)}`, // Assuming ZAR currency
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        margin: { top: yPos },
      });
    }

    doc.save('inventory_status_report.pdf');
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
        <div className="chart-container">
          <h3>Stock Breakdown (Total Products: {reportData.stockBreakdown.totalProducts})</h3>
          <Pie data={pieChartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } } }} />
        </div>
      )}

      <div className="inventory-sections">
        <div className="inventory-section low-stock-section">
          <h3>Low Stock Items (Less than 10 units)</h3>
          {reportData.lowStockItems.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Current Quantity</th>
                </tr>
              </thead>
              <tbody>
                {reportData.lowStockItems.map(item => (
                  <tr key={item.prodId}>
                    <td>{item.productName}</td>
                    <td>{item.currentQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No items are currently low on stock.</p>
          )}
        </div>

        <div className="inventory-section out-of-stock-section">
          <h3>Out of Stock Items</h3>
          {reportData.outOfStockItems.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                </tr>
              </thead>
              <tbody>
                {reportData.outOfStockItems.map(item => (
                  <tr key={item.prodId}>
                    <td>{item.productName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No items are currently out of stock.</p>
          )}
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
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Current Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredFullInventory.map(item => (
                <tr key={item.prodId}>
                  <td>{item.productName}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>R {item.price.toFixed(2)}</td> {/* Assuming ZAR */}
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

export default InventoryStatusReport;