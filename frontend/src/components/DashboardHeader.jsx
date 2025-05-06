import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faSpinner } from '@fortawesome/free-solid-svg-icons';

const DashboardHeader = ({ 
  selectedNode, 
  availableNodes, 
  startDate, 
  endDate,
  nodeMinDate,
  nodeMaxDate, 
  isLoadingNodes,
  isLoading,
  isLoadingDateRange,
  handleNodeChange,
  handleStartDateChange,
  handleEndDateChange,
  handleDownloadPDF,
  readings,
  isGeneratingPDF  // Add this prop to the destructuring
}) => {
  return (
    <div className="dashboard-header">
      <div className="header-left">
        <h2 className="dashboard-title">Power Monitoring Dashboard</h2>
      </div>
      
      <div className="header-right">
        <div className="selector-container">
          {/* Node Selection */}
          <div className="node-selector">
            <div className="node-label">Node:</div>
            <select 
              className="node-dropdown"
              value={selectedNode}
              onChange={handleNodeChange}
              disabled={isLoadingNodes || isLoading}
            >
              {isLoadingNodes ? (
                <option value="">Loading nodes...</option>
              ) : availableNodes.length > 0 ? (
                availableNodes.map(node => (
                  <option key={node} value={node}>{node}</option>
                ))
              ) : (
                <option value="">No nodes available</option>
              )}
            </select>
          </div>
          
          {/* Date Range Selector */}
          <div className="date-range-selector">
            <div className="date-range-label">
              Date Range:
              {isLoadingDateRange && (
                <FontAwesomeIcon icon={faSpinner} spin className="date-range-loader" />
              )}
            </div>
            <div className="date-range-inputs">
              <input 
                type="date" 
                className="date-picker" 
                name="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                disabled={isLoading || isLoadingDateRange}
                min={nodeMinDate || ''}
                max={endDate || nodeMaxDate || ''}
              />
              <span className="date-separator">-</span>
              <input 
                type="date" 
                className="date-picker" 
                name="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                disabled={isLoading || isLoadingDateRange}
                min={startDate || nodeMinDate || ''}
                max={nodeMaxDate || ''}
              />
            </div>
          </div>
        </div>
        
        <button 
            className="download-button" 
            onClick={handleDownloadPDF}
            disabled={isLoading || readings.length === 0 || isGeneratingPDF}
            >
            {isGeneratingPDF ? (
                <>
                <FontAwesomeIcon icon={faSpinner} spin /> Generating PDF...
                </>
            ) : (
                <>
                <FontAwesomeIcon icon={faFileDownload} /> Download as PDF
                </>
            )}
            </button>
      </div>
    </div>
  );
};

export default DashboardHeader;