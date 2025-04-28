import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faUndo } from '@fortawesome/free-solid-svg-icons';

const NavigationBar = ({
  filters,
  setFilters,
  availableNodes,
  availableYears,
  availableMonths,
  availableDays,
  selectedYear,
  selectedMonth,
  selectedDay,
  setSelectedYear,
  setSelectedMonth,
  fetchDay, // You're passing fetchDay instead of setSelectedDay
  loading,
  openFilterModal,
  hasActiveParameterFilters,
  resetParameterFilters,
  readings
}) => {
  return (
    <div className="navigation-bar">
      {/* Node Selection */}
      <div className="nav-item">
        <label>Node</label>
        <select 
          className="nav-select"
          value={filters.node}
          onChange={(e) => {
            setFilters(prev => ({...prev, node: e.target.value}));
          }}
          disabled={loading}
        >
          <option value="all">Select Node</option>
          {availableNodes.map(node => (
            <option key={node} value={node}>{node}</option>
          ))}
        </select>
      </div>
      
      {/* Year Selection */}
      <div className={`nav-item ${filters.node === 'all' ? 'disabled' : ''}`}>
        <label>Year</label>
        <select 
          className="nav-select"
          value={selectedYear || ''}
          onChange={(e) => setSelectedYear(e.target.value)}
          disabled={loading || availableYears.length === 0 || filters.node === 'all'}
        >
          <option value="">Year</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      
      {/* Month Selection */}
      <div className={`nav-item ${!selectedYear ? 'disabled' : ''}`}>
        <label>Month</label>
        <select 
          className="nav-select"
          value={selectedMonth || ''}
          onChange={(e) => setSelectedMonth(e.target.value)}
          disabled={loading || availableMonths.length === 0 || !selectedYear}
        >
          <option value="">Month</option>
          {availableMonths.map(month => (
            <option key={month} value={month}>{month.padStart(2, '0')}</option>
          ))}
        </select>
      </div>
      
      {/* Day Selection */}
      <div className={`nav-item ${!selectedMonth ? 'disabled' : ''}`}>
        <label>Day</label>
        <select 
          className="nav-select"
          value={selectedDay || ''}
          onChange={(e) => fetchDay(e.target.value)} // This should use fetchDay, not setSelectedDay
          disabled={loading || availableDays.length === 0 || !selectedMonth}
        >
          <option value="">All Days</option>
          {availableDays.map(day => (
            <option key={day} value={day}>{day.padStart(2, '0')}</option>
          ))}
        </select>
      </div>
      
      {/* Spacer to push parameter filters to the right */}
      <div className="nav-spacer"></div>
      
      {/* Filter Controls */}
      <div className="nav-filters">
        {/* Parameter Filters Button */}
        <button 
          className="parameter-filter-btn" 
          onClick={openFilterModal} 
          disabled={readings.length === 0}
        >
          <FontAwesomeIcon icon={faFilter} /> Parameter Filters
        </button>
        
        {/* Reset Button - Only shown when there are active parameter filters */}
        {hasActiveParameterFilters && (
          <button 
            className="reset-filters-button" 
            onClick={resetParameterFilters}
          >
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>
        )}
      </div>
    </div>
  );
};

export default NavigationBar;