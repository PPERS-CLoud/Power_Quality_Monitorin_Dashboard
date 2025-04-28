import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faCalendarAlt, faBell, faUndo } from '@fortawesome/free-solid-svg-icons';

export const LoadingIndicator = ({ loading, progress }) => {
  if (!loading) return null;
  
  if (progress > 0 && progress < 100) {
    return (
      <div className="data-loading-progress">
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">Loading data: {Math.round(progress)}% complete</div>
      </div>
    );
  }
  
  return (
    <div className="loading-container">
      <div className="spinner-container">
        <FontAwesomeIcon icon={faSpinner} className="loading-spinner" />
        <span>Loading data...</span>
      </div>
    </div>
  );
};

export const ErrorDisplay = ({ error }) => {
  if (!error) return null;
  return <div className="error-message">{error}</div>;
};

export const NewDataNotification = ({ count }) => {
  if (count <= 0) return null;
  
  return (
    <div className="new-data-notification">
      <FontAwesomeIcon icon={faBell} />
      <span>{count} new reading{count !== 1 ? 's' : ''} received</span>
    </div>
  );
};

export const NoDataMessage = ({ filters, selectedYear, selectedMonth, resetFilters }) => {
  return (
    <div className="no-data-message">
      {filters.node === 'all' ? (
        <>
          <FontAwesomeIcon icon={faExclamationTriangle} size="2x" style={{marginBottom: '15px'}} />
          <p>Please select a specific node to view data.</p>
        </>
      ) : selectedYear && selectedMonth ? (
        <>
          <FontAwesomeIcon icon={faExclamationTriangle} size="2x" style={{marginBottom: '15px'}} />
          <p>No data available for the selected time period or filters.</p>
          <button className="reset-btn" onClick={resetFilters}>
            <FontAwesomeIcon icon={faUndo} /> Reset All Selections
          </button>
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faCalendarAlt} size="2x" style={{marginBottom: '15px'}} />
          <p>Please select a year and month to view data.</p>
        </>
      )}
    </div>
  );
};

export const FilterDisplay = ({ filters, show }) => {
  if (!show) return null;
  
  return (
    <div className="applied-filters">
      <div className="applied-filters-header">
        <h4>Applied Parameter Filters</h4>
      </div>
      <div className="filter-tags">
        {(filters.voltage.min || filters.voltage.max) && (
          <span className="filter-tag">
            <span className="filter-tag-label">Voltage:</span>
            <span className="filter-tag-value">{filters.voltage.min || '0'} - {filters.voltage.max || '∞'} V</span>
          </span>
        )}
        {(filters.current.min || filters.current.max) && (
          <span className="filter-tag">
            <span className="filter-tag-label">Current:</span>
            <span className="filter-tag-value">{filters.current.min || '0'} - {filters.current.max || '∞'} A</span>
          </span>
        )}
        {(filters.power.min || filters.power.max) && (
          <span className="filter-tag">
            <span className="filter-tag-label">Power:</span>
            <span className="filter-tag-value">{filters.power.min || '0'} - {filters.power.max || '∞'} W</span>
          </span>
        )}
        {(filters.frequency.min || filters.frequency.max) && (
          <span className="filter-tag">
            <span className="filter-tag-label">Frequency:</span>
            <span className="filter-tag-value">{filters.frequency.min || '0'} - {filters.frequency.max || '∞'} Hz</span>
          </span>
        )}
        {(filters.powerFactor.min || filters.powerFactor.max) && (
          <span className="filter-tag">
            <span className="filter-tag-label">Power Factor:</span>
            <span className="filter-tag-value">{filters.powerFactor.min || '0'} - {filters.powerFactor.max || '∞'}</span>
          </span>
        )}
        {filters.anomalyOnly && (
          <span className="filter-tag anomaly-tag">
            <span className="filter-tag-label">Status:</span>
            <span className="filter-tag-value">Anomalies Only</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default {
  LoadingIndicator,
  ErrorDisplay,
  NewDataNotification,
  NoDataMessage,
  FilterDisplay
};