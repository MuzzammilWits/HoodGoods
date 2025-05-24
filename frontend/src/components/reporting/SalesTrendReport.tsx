// frontend/src/components/reporting/SalesTrendReport.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'chart.js';
import 'chartjs-adapter-date-fns';
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
);

const SalesTrendReport: React.FC = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [reportData, setReportData] = useState<SalesReportData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TimePeriod.WEEKLY);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const chartContainerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = await getAccessTokenSilently();
                const data = await getSalesTrendReport(token, selectedPeriod, selectedPeriod === TimePeriod.DAILY ? selectedDate : undefined);
                setReportData(data);
            } catch (err: any) {
                console.error("SalesTrendReport: Error fetching sales trend report:", err);
                setError(err.message || 'An unexpected error occurred while fetching sales trends.');
                setReportData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [getAccessTokenSilently, selectedPeriod, selectedDate]);

    const chartData = useMemo(() => {
        if (!reportData || !reportData.salesData || reportData.salesData.length === 0) {
            return null;
        }
        return {
            labels: reportData.salesData.map(d => new Date(d.date)),
            datasets: [{
                label: 'Daily Sales (R)',
                data: reportData.salesData.map(d => d.sales),
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
            }],
        };
    }, [reportData]);

    const chartOptions = useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                title: {
                    display: true,
                    text: `Sales Trends - ${reportData?.summary?.period || selectedPeriod}${reportData?.summary?.startDate && reportData?.summary?.endDate ? ` (${reportData.summary.startDate} to ${reportData.summary.endDate})` : ''}`,
                },
                tooltip: {
                    callbacks: {
                        label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
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
                        unit: (selectedPeriod === TimePeriod.DAILY ? 'day' : 'month') as 'day' | 'week' | 'month',
                        tooltipFormat: 'MMM dd, yyyy',
                        displayFormats: {
                            day: 'MMM dd',
                            week: 'MMM dd',
                            month: 'MMM yyyy',
                            year: 'yyyy'
                        }
                    },
                    title: { display: true, text: 'Date' },
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Sales (ZAR)' },
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
        } catch (err: any) {
            console.error("SalesTrendReport: Failed to download CSV:", err);
            setError(err.message || 'Failed to download CSV.');
        }
    };

    const handleDownloadPdf = async () => {
        if (!chartContainerRef.current || !reportData || !reportData.summary) {
            setError("Chart or report data is not available for PDF export.");
            return;
        }
        try {
            const canvas = await html2canvas(chartContainerRef.current, { 
                scale: 2,
                useCORS: true,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;

            const aspectRatio = canvas.width / canvas.height;
            let newImgWidth = pdfWidth - 2 * margin;
            let newImgHeight = newImgWidth / aspectRatio;

            if (newImgHeight > pdfHeight - 2 * margin - 50) {
                newImgHeight = pdfHeight - 2 * margin - 50;
                newImgWidth = newImgHeight * aspectRatio;
            }

            const x = (pdfWidth - newImgWidth) / 2;
            let y = margin;

            pdf.setFontSize(18);
            pdf.text(
                `Sales Trends - ${reportData.summary.period} (${reportData.summary.startDate} to ${reportData.summary.endDate})`, 
                pdfWidth / 2, y, { align: 'center' }
            );
            y += 30;

            pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
            y += newImgHeight + 20;

            if (reportData.summary) {
                pdf.setFontSize(10);
                pdf.text(`Total Sales: R ${reportData.summary.totalSales.toFixed(2)}`, margin, y); y += 15;
                pdf.text(`Average Daily Sales: R ${reportData.summary.averageDailySales.toFixed(2)}`, margin, y); y += 15;
                pdf.text(`Report Generated: ${new Date(reportData.reportGeneratedAt).toLocaleString()}`, margin, y);
            }
            
            pdf.save(`sales_trend_report_${reportData.summary.startDate}_to_${reportData.summary.endDate}.pdf`);

        } catch (err: any) {
            console.error("SalesTrendReport: Failed to generate or download PDF:", err);
            setError(err.message || 'Failed to generate PDF.');
        }
    };

    if (loading) {
        return <p className="loading-message">Loading sales data...</p>;
    }

    return (
        <article className="sales-trend-report">
            <header>
                <h3>Sales Trend Report</h3>
            </header>
            <form className="report-controls">
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
                        aria-label="Select Date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ marginLeft: '10px' }}
                    />
                )}
                <button type="button" onClick={handleDownloadCsv} className="csv-button" style={{ marginLeft: '10px' }}>
                    Download CSV
                </button>
                <button type="button" onClick={handleDownloadPdf} className="pdf-button" style={{ marginLeft: '10px' }} disabled={!chartData || loading}>
                    Download PDF
                </button>
            </form>

            {error && <p className="error-message">Error: {error}</p>}

            {!error && !chartData && !loading && (
                <p className="info-message">No sales data available for the selected period.</p>
            )}

            {chartData && (
                <figure 
                    ref={chartContainerRef} 
                    className="chart-container-st" 
                    style={{ backgroundColor: 'white', padding: '10px' }}
                >
                    <Line options={chartOptions} data={chartData} />
                </figure>
            )}
            {reportData && reportData.summary && (
                <section className="report-summary">
                    <h4>Report Summary</h4>
                    <p>Total Sales: R {reportData.summary.totalSales.toFixed(2)}</p>
                    <p>Average Daily Sales: R {reportData.summary.averageDailySales.toFixed(2)}</p>
                    <p>Period Covered: {reportData.summary.startDate} to {reportData.summary.endDate}</p>
                    <p>Report Generated: {new Date(reportData.reportGeneratedAt).toLocaleString()}</p>
                </section>
            )}
        </article>
    );
};

export default SalesTrendReport;