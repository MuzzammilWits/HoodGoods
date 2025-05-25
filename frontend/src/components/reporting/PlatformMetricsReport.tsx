// frontend/src/components/reporting/PlatformMetricsReport.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { getAdminPlatformMetrics, downloadAdminPlatformMetricsCsv } from '../../services/reportingService';
import { AdminPlatformMetricsData, TimePeriod, PlatformMetricPoint } from '../../types';
import './PlatformMetricsReport.css'; // Ensure this CSS file is imported

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const PlatformMetricsReport: React.FC = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [reportData, setReportData] = useState<AdminPlatformMetricsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Main data loading
    const [pdfLoading, setPdfLoading] = useState<boolean>(false); // Specific PDF generation loading
    const [error, setError] = useState<string | null>(null);

    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | 'allTime' | 'custom'>('allTime');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const reportContentRef = useRef<HTMLElement>(null);
    const pdfIgnoreClassName = 'pdf-ignore'; // Class to mark elements to be ignored by html2canvas

    const fetchReportData = useCallback(async (isInitialLoad = false) => {
        if(isInitialLoad) setLoading(true); else setPdfLoading(true);
        setError(null);
        try {
            const token = await getAccessTokenSilently();
            let periodParam: TimePeriod | 'allTime' | 'custom' = selectedPeriod;
            let startParam: string | undefined = undefined;
            let endParam: string | undefined = undefined;

            if (selectedPeriod === 'custom' && startDate && endDate) {
                startParam = startDate;
                endParam = endDate;
            } else if (selectedPeriod === TimePeriod.DAILY && startDate) {
                startParam = startDate;
            }
            const data = await getAdminPlatformMetrics(token, periodParam, startParam, endParam);
            setReportData(data);
        } catch (err: any) {
            console.error("PlatformMetricsReport: Error fetching report data:", err);
            setError(err.message || 'An error occurred while fetching the platform metrics report.');
            setReportData(null);
        } finally {
            if(isInitialLoad) setLoading(false); else setPdfLoading(false);
        }
    }, [getAccessTokenSilently, selectedPeriod, startDate, endDate]);

    useEffect(() => {
        fetchReportData(true);
    }, [fetchReportData]);

    const handleDownloadCsv = async () => {
        if (!reportData) { setError("Report data not available for CSV export."); return; }
        setPdfLoading(true);
        try {
            const token = await getAccessTokenSilently();
            let periodParam: TimePeriod | 'allTime' | 'custom' = selectedPeriod;
            let startParam: string | undefined = undefined;
            let endParam: string | undefined = undefined;
            if (selectedPeriod === 'custom' && startDate && endDate) {
                startParam = startDate;
                endParam = endDate;
            } else if (selectedPeriod === TimePeriod.DAILY && startDate) {
                startParam = startDate;
            }
            const blob = await downloadAdminPlatformMetricsCsv(token, periodParam, startParam, endParam);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin_platform_metrics_${selectedPeriod}${startDate ? `_${startDate}` : ''}${endDate ? `_to_${endDate}` : ''}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) { console.error("PlatformMetricsReport: Failed to download CSV:", err); setError(err.message || 'Failed to download CSV.');}
        finally { setPdfLoading(false); }
    };

    const handleDownloadPdf = async () => {
        if (!reportData || !reportContentRef.current) {
            setError("Report content not available for PDF export.");
            console.error("PDF Export: Report data or content ref is missing.");
            return;
        }
        setPdfLoading(true); 

        ChartJS.defaults.animation = false; 

        setTimeout(async () => {
            try {
                if (!reportContentRef.current) { 
                    throw new Error("Report content ref became null before capture.");
                }
                const canvas = await html2canvas(reportContentRef.current, {
                    scale: 2,
                    useCORS: true,
                    logging: false, 
                    backgroundColor: '#ffffff',
                    scrollX: 0, 
                    scrollY: -window.scrollY, 
                    windowWidth: reportContentRef.current.scrollWidth, 
                    windowHeight: reportContentRef.current.scrollHeight,
                    ignoreElements: (element) => element.classList.contains(pdfIgnoreClassName),
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'pt',
                    format: 'a4',
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const margin = 40;

                const imgProps = pdf.getImageProperties(imgData);
                const aspectRatio = imgProps.width / imgProps.height;

                let newImgWidth = pdfWidth - 2 * margin;
                let newImgHeight = newImgWidth / aspectRatio;

                if (newImgHeight > pdfHeight - (2 * margin) - 60) { 
                    newImgHeight = pdfHeight - (2 * margin) - 60;
                    newImgWidth = newImgHeight * aspectRatio;
                }
                
                const x = (pdfWidth - newImgWidth) / 2;
                let y = margin;

                pdf.setFontSize(18);
                pdf.text('Admin Platform Performance Overview', pdfWidth / 2, y, { align: 'center' });
                y += 30; 

                pdf.setFontSize(10);
                if (reportData.periodCovered) {
                    let periodText = `Period Covered: ${reportData.periodCovered.period.charAt(0).toUpperCase() + reportData.periodCovered.period.slice(1)}`;
                    if (reportData.periodCovered.startDate) periodText += ` (From: ${reportData.periodCovered.startDate}`;
                    if (reportData.periodCovered.endDate) periodText += ` To: ${reportData.periodCovered.endDate}${reportData.periodCovered.startDate ? ')' : ''}`;
                    else if (reportData.periodCovered.startDate) periodText += `)`;

                    pdf.text(periodText, margin, y);
                    y += 15;
                }
                pdf.text(`Report Generated: ${new Date(reportData.reportGeneratedAt).toLocaleString()}`, margin, y);
                y += 25; 

                pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
                
                const filename = `admin_platform_metrics_${selectedPeriod}${startDate ? `_${startDate}` : ''}${endDate ? `_to_${endDate}` : ''}.pdf`;
                pdf.save(filename);

            } catch (err: any) {
                console.error("PlatformMetricsReport: Failed to generate PDF:", err);
                setError(err.message || 'Failed to generate PDF.');
            } finally {
                ChartJS.defaults.animation = {} as any; 
                setPdfLoading(false); 
            }
        }, 200); 
    };

    const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPeriod = event.target.value as TimePeriod | 'allTime' | 'custom';
        setSelectedPeriod(newPeriod);
        if (newPeriod !== 'custom' && newPeriod !== TimePeriod.DAILY) {
            setStartDate('');
            setEndDate('');
        }
    };

    const salesChartData = useMemo(() => {
        if (!reportData?.timeSeriesMetrics || reportData.timeSeriesMetrics.length === 0) return null;
        const labels = reportData.timeSeriesMetrics.map((dataPoint: PlatformMetricPoint) => new Date(dataPoint.date));
        const salesValues = reportData.timeSeriesMetrics.map((dataPoint: PlatformMetricPoint) => dataPoint.totalSales);
        return { labels, datasets: [{ label: 'Total Platform Sales (R)', data: salesValues, borderColor: 'rgb(151, 201, 186)', backgroundColor: 'rgba(151, 201, 186, 0.2)', tension: 0.1, fill: true }] };
    }, [reportData]);

    const ordersChartData = useMemo(() => {
        if (!reportData?.timeSeriesMetrics || reportData.timeSeriesMetrics.length === 0) return null;
        const labels = reportData.timeSeriesMetrics.map((dataPoint: PlatformMetricPoint) => new Date(dataPoint.date));
        const ordersValues = reportData.timeSeriesMetrics.map((dataPoint: PlatformMetricPoint) => dataPoint.totalOrders);
        return { labels, datasets: [{ label: 'Total Platform Orders', data: ordersValues, borderColor: 'rgb(151, 201, 186)', backgroundColor: 'rgba(151, 201, 186, 0.2)', tension: 0.1, fill: true }] };
    }, [reportData]);

    const commonChartOptions = useMemo(() => {
        let timeUnit: 'day' | 'week' | 'month' | 'year' = 'day';
        if (reportData?.timeSeriesMetrics && reportData.timeSeriesMetrics.length > 0) {
            const firstDate = new Date(reportData.timeSeriesMetrics[0].date);
            const lastDate = new Date(reportData.timeSeriesMetrics[reportData.timeSeriesMetrics.length - 1].date);
            const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 365 * 2) timeUnit = 'year';
            else if (diffDays > 60) timeUnit = 'month';
            else if (diffDays > 14) timeUnit = 'week';
        }
        return {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const }, tooltip: { mode: 'index' as const, intersect: false } },
        scales: { x: { type: 'time' as const, time: { unit: timeUnit, tooltipFormat: 'MMM dd, yy', displayFormats: { day: 'MMM dd', week: 'MMM dd', month: 'MMM yy', year: 'yyyy' } }, title: { display: true, text: 'Date' } }, y: { beginAtZero: true, title: { display: true, text: 'Value' } } }
        };
    }, [reportData]);

    const salesChartOptions = useMemo(() => ({ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { display: true, text: 'Platform Sales Trend' }, tooltip: { ...commonChartOptions.plugins?.tooltip, callbacks: { label: function(context: any) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(context.parsed.y); } return label; } } } }, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, title: { display: true, text: 'Sales (R)' }, ticks: { callback: function(value: any) { return 'R ' + value; } } } } }), [commonChartOptions]);
    const ordersChartOptions = useMemo(() => ({ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { display: true, text: 'Platform Order Volume Trend' } }, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, title: { display: true, text: 'Number of Orders' } } } }), [commonChartOptions]);

    if (loading) return <p className="loading-message">Loading platform metrics...</p>;
    if (error) return <p className="error-message">Error: {error} {error === "User not authenticated. Please log in." ? "" : <button onClick={() => fetchReportData(true)} disabled={pdfLoading}>Try Again</button>}</p>;
    if (!reportData) return <p className="info-message">No platform metrics data available. <button onClick={() => fetchReportData(true)} disabled={pdfLoading}>Refresh</button></p>;

    const { overallMetrics, periodCovered, reportGeneratedAt } = reportData;

    return (
        <article className="platform-metrics-report report-container card" ref={reportContentRef}>
            <header className="card-header report-header">
                <h2>Platform Performance Overview</h2>
                <form className={`report-controls ${pdfIgnoreClassName}`}>
                    <label htmlFor="period-select-admin">Report Period: </label>
                    <select id="period-select-admin" value={selectedPeriod} onChange={handlePeriodChange} disabled={pdfLoading}>
                        <option value="allTime">All Time</option>
                        {Object.values(TimePeriod).map(p => (
                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                        <option value="custom">Custom Range</option>
                    </select>
                    {(selectedPeriod === TimePeriod.DAILY || selectedPeriod === 'custom') && (
                        <input type="date" aria-label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ marginLeft: '10px' }} disabled={pdfLoading}/>
                    )}
                    {selectedPeriod === 'custom' && (
                        <input type="date" aria-label="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ marginLeft: '10px' }} disabled={pdfLoading}/>
                    )}
                    {/* Removed marginLeft from this button */}
                    <button type="button" onClick={() => fetchReportData(false)} disabled={pdfLoading || loading}>
                        {pdfLoading && !loading ? 'Refreshing...' : 'Refresh Report'}
                    </button>
                </form>
            </header>

            <section className="card-body report-content">
                <section className="report-summary">
                    <p className="report-generated-at">Report Generated: {new Date(reportGeneratedAt).toLocaleString()}</p>
                    <p className="period-covered">
                        Period Covered: {periodCovered.period.charAt(0).toUpperCase() + periodCovered.period.slice(1)}
                        {periodCovered.startDate && ` (From: ${periodCovered.startDate}`}
                        {periodCovered.endDate && ` To: ${periodCovered.endDate}`}{periodCovered.startDate ? ')' : ''}
                    </p>
                </section>

                <ul className="metrics-grid">
                    <li className="metric-card"><h4>Total Sales</h4><p>R {overallMetrics.totalSales.toFixed(2)}</p></li>
                    <li className="metric-card"><h4>Total Orders</h4><p>{overallMetrics.totalOrders}</p></li>
                    <li className="metric-card"><h4>Average Order Value</h4><p>R {overallMetrics.averageOrderValue.toFixed(2)}</p></li>
                    <li className="metric-card"><h4>Active Sellers</h4><p>{overallMetrics.totalActiveSellers}</p></li>
                    <li className="metric-card"><h4>Registered Buyers</h4><p>{overallMetrics.totalRegisteredBuyers}</p></li>
                </ul>

                {(reportData.timeSeriesMetrics && reportData.timeSeriesMetrics.length > 0) ? (
                    <section className="charts-grid">
                        {salesChartData && (
                            <figure className="chart-container">
                                <Line options={salesChartOptions as any} data={salesChartData} />
                            </figure>
                        )}
                        {ordersChartData && (
                            <figure className="chart-container">
                                <Line options={ordersChartOptions as any} data={ordersChartData} />
                            </figure>
                        )}
                    </section>
                ) : (
                    <p className="info-message" style={{marginTop: '20px'}}>No time series data available for graphs for the selected period.</p>
                )}
                <section className={`export-buttons ${pdfIgnoreClassName}`} aria-label="Export options">
                    <button onClick={handleDownloadCsv} className="csv-button" disabled={pdfLoading || loading}>Download CSV</button>
                    <button onClick={handleDownloadPdf} className="pdf-button" disabled={pdfLoading || loading} style={{ marginLeft: '10px' }}>
                        {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                </section>
            </section>
        </article>
    );
};

export default PlatformMetricsReport;
