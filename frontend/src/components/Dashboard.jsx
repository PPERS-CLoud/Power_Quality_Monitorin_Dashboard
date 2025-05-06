import React, { useState } from 'react';
import '../css/Dashboard.css';
import { usePowerData } from '../hooks/usePowerData';
import { getDateRangeWarning } from '../services/dataProcessingService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, 
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
// Add these imports for PDF generation
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Component imports
import DashboardHeader from './DashboardHeader';
import StatusIndicators from './StatusIndicators';
import PowerQualityStatus from './PowerQualityStatus';
import InterruptionMetrics from './InterruptionMetrics';
import AnomalyMetrics from './AnomalyMetrics';
import DashboardGraph from './DashboardGraph';
import ModalDialog from './ModalDialog';

/**
 * Power Monitoring Dashboard
 * --------------------------
 * This dashboard visualizes and analyzes power quality metrics from multiple collection nodes.
 */
const Dashboard = () => {
  // Get data and handlers from custom hook
  const { 
    readings,
    latestReading,
    availableNodes,
    selectedNode,
    startDate,
    endDate,
    nodeMinDate,
    nodeMaxDate,
    nodeDateRangeInfo,
    isLoading,
    isLoadingNodes,
    isLoadingDateRange,
    dataLoadProgress,
    isProcessingAnomalies,
    anomalyProgress,
    currentLoadingDate,
    totalDays,
    daysLoaded,
    handleNodeChange,
    handleStartDateChange,
    handleEndDateChange
  } = usePowerData();
  
  // Local state for this component
  const [graphType, setGraphType] = useState('power');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });
  // Add state for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Handler for graph type change
  const handleGraphTypeChange = (type) => {
    setGraphType(type);
  };

  // Handler for PDF download
  const handleDownloadPDF = async () => {
    try {
      // Set up loading state
      setIsGeneratingPDF(true);
      console.log('Starting PDF generation...');
      
      // Create a new PDF document (A4 size in landscape)
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // Margin in mm
      
      // Helper function to capture an element and add to PDF
      const addElementToPDF = async (element, title, x, y, width, height) => {
        if (!element) return y;
        
        const canvas = await html2canvas(element, {
          scale: 2, // Higher scale for better quality
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Add title if provided
        if (title) {
          pdf.setFontSize(14);
          pdf.text(title, x, y);
          y += 8; // Move down after title
        }
        
        // Add the image
        pdf.addImage(imgData, 'PNG', x, y, width, height);
        return y + height + 10; // Return next Y position with margin
      };
      
      // ---- Page 1: Dashboard Overview ----
      
      // Add a title
      pdf.setFontSize(18);
      pdf.text(`Power Monitoring Dashboard: Node ${selectedNode}`, margin, margin + 5);
      pdf.setFontSize(12);
      pdf.text(`Date Range: ${startDate} to ${endDate}`, margin, margin + 15);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, margin + 22);
      
      // Get references to key elements
      const powerQualityElement = document.querySelector('.power-quality-card');
      const interruptionElement = document.querySelector('.interruption-metrics-card');
      const anomalyElement = document.querySelector('.anomaly-metrics-card');
      
      // Add metric cards (side by side)
      let yPos = margin + 30;
      const cardWidth = (pageWidth - (margin * 3)) / 2;
      const cardHeight = 60;
      
      // Add power quality card
      await addElementToPDF(powerQualityElement, 'Power Quality Status', margin, yPos, cardWidth, cardHeight);
      
      // Add interruption metrics next to it
      await addElementToPDF(interruptionElement, 'Interruption Metrics', margin + cardWidth + margin, yPos, cardWidth, cardHeight);
      
      // Add anomaly metrics below
      yPos += cardHeight + 15;
      await addElementToPDF(anomalyElement, 'Anomaly Metrics', margin, yPos, cardWidth, cardHeight);
      
      // Store the current graph type so we can restore it later
      const originalGraphType = graphType;
      
      // Array of all graph types to generate
      const allGraphTypes = ['voltage', 'current', 'power', 'frequency', 'powerFactor'];
      
      // Generate each graph type and add to PDF
      for (let i = 0; i < allGraphTypes.length; i++) {
        // Add a new page for each graph
        pdf.addPage();
        
        const currentType = allGraphTypes[i];
        
        // Temporarily change the graph type
        setGraphType(currentType);
        
        // Need to wait for the graph to render
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get the graph element after it has rendered with the new type
        const graphElement = document.querySelector('.graph-content');
        
        // Format title based on graph type
        const graphTitle = currentType === 'powerFactor' 
          ? `Power Factor Graph - Node ${selectedNode}`
          : `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} Graph - Node ${selectedNode}`;
        
        // Add the graph to the PDF
        await addElementToPDF(graphElement, graphTitle, margin, margin + 10, pageWidth - (margin * 2), 120);
      }
      
      // Restore the original graph type
      setGraphType(originalGraphType);
      
      // Save the PDF with a comprehensive filename
      pdf.save(`Power_Dashboard_${selectedNode}_${startDate}_to_${endDate}.pdf`);
      console.log('PDF generated successfully!');
      
      setIsGeneratingPDF(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsGeneratingPDF(false);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Modal handlers
  const openModal = (title, content) => {
    setModalContent({ title, content });
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
  };

  // Get date range warning
  const dateRangeWarning = getDateRangeWarning(startDate, endDate);

  return (
    <div className="dashboard-container">
      {/* Header and Controls */}
      <DashboardHeader 
        selectedNode={selectedNode}
        availableNodes={availableNodes}
        startDate={startDate}
        endDate={endDate}
        nodeMinDate={nodeMinDate}
        nodeMaxDate={nodeMaxDate}
        isLoadingNodes={isLoadingNodes}
        isLoading={isLoading || isGeneratingPDF}
        isLoadingDateRange={isLoadingDateRange}
        handleNodeChange={handleNodeChange}
        handleStartDateChange={handleStartDateChange}
        handleEndDateChange={handleEndDateChange}
        handleDownloadPDF={handleDownloadPDF}
        readings={readings}
        isGeneratingPDF={isGeneratingPDF}
      />

      {/* PDF Generation Indicator */}
      {isGeneratingPDF && (
        <div className="pdf-generating-banner">
          <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
          <span>Generating PDF report... Please wait.</span>
          <div className="progress-bar-container mini">
            <div className="progress-bar-indeterminate"></div>
          </div>
        </div>
      )}

      {/* Warning and Progress Indicators */}
      <StatusIndicators 
        dateRangeWarning={dateRangeWarning}
        dataLoadProgress={dataLoadProgress}
        daysLoaded={daysLoaded}
        totalDays={totalDays}
        currentLoadingDate={currentLoadingDate}
        isProcessingAnomalies={isProcessingAnomalies}
        anomalyProgress={anomalyProgress}
        nodeDateRangeInfo={nodeDateRangeInfo}
        selectedNode={selectedNode}
      />

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Metric Cards */}
        <div className="metric-cards-row">
          <PowerQualityStatus
            readings={readings}
            latestReading={latestReading}
            thresholds={{
              voltage: { 
                min: 217.4, 
                max: 242.6, 
                ideal: { min: 220, max: 240 }
              },
              frequency: { 
                min: 59.2, 
                max: 60.8, 
                ideal: { min: 59.8, max: 60.2 }
              },
              powerFactor: { 
                min: 0.792, 
                ideal: 0.1
              }
            }}
            method="combined"
            onModalOpen={openModal}
          />
          
          <InterruptionMetrics 
            readings={readings}
            voltageThreshold={180}
            minDurationSec={30}
            onModalOpen={openModal}
          />
          
          <AnomalyMetrics
            readings={readings}
            onModalOpen={openModal}
            isProcessing={isProcessingAnomalies}
          />
        </div>
        
        {/* Graph Section */}
        <div className="graph-row">
          <DashboardGraph 
            graphType={graphType}
            selectedNode={selectedNode}
            isProcessingAnomalies={isProcessingAnomalies}
            handleGraphTypeChange={handleGraphTypeChange}
            isLoading={isLoading}
            readings={readings}
            dataLoadProgress={dataLoadProgress}
          />
        </div>
      </div>

      {/* Modal */}
      <ModalDialog 
        showModal={showModal}
        modalContent={modalContent}
        closeModal={closeModal}
      />
    </div>
  );
};

export default Dashboard;