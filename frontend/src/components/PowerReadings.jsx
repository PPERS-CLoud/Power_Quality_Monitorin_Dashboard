import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faSpinner, faSync } from '@fortawesome/free-solid-svg-icons';
import '../css/PowerReadings.css';

// Import custom hooks
import usePowerReadings from '../hooks/usePowerReadings';
import useFilters from '../hooks/useFilters';
import usePagination from '../hooks/usePagination';

// Import components
import NavigationBar from './NavigationBar';
import DataTable from './DataTable';
import PaginationControls from './PaginationControls';
import { 
  LoadingIndicator, 
  ErrorDisplay, 
  NewDataNotification, 
  NoDataMessage, 
  FilterDisplay 
} from './LoadingIndicator';
import ParameterFiltersModal from './ParameterFiltersModal';

// Utilities
import { getMonthName } from '../utils/powerReadingsUtils';

import axios from 'axios';

const PowerReadings = () => {
  // Set up hooks
  const {
    showFilterModal,
    filters,
    setFilters,
    tempFilters,
    openFilterModal,
    closeFilterModal,
    handleFilterChange,
    applyFilters,
    resetFilters,
    resetParameterFilters,
    hasActiveParameterFilters,
    applyFiltersToData
  } = useFilters();
  
  const {
    readings,
    loading,
    error,
    dataLoadProgress,
    newDataCount,
    realtimeUpdateInProgress,
    lastUpdateTimeRef,
    availableNodes,
    availableYears,
    availableMonths,
    availableDays,
    selectedYear,
    selectedMonth,
    selectedDay,
    displayLimit,
    isBackgroundFetching,
    totalAvailableRecords,
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    fetchDay,
    fetchLatestData,
    loadMoreData
  } = usePowerReadings(filters);
  
  // Filter the data based on parameter filters
  const filteredReadings = useMemo(() => {
    return applyFiltersToData(readings);
  }, [readings, filters, applyFiltersToData]);
  
  // Set up pagination
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    currentItems,
    nextPage,
    prevPage,
    changeItemsPerPage
  } = usePagination(filteredReadings, 10);
  
  // When filters change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, setCurrentPage]);
  
  // Handle filter application with node change check
  const handleApplyFilters = () => {
    const nodeChanged = applyFilters();
    
    if (nodeChanged) {
      setSelectedYear(null);
      setSelectedMonth(null);
      setSelectedDay(null);
    }
  };

// Add this state to track download progress
const [isDownloading, setIsDownloading] = useState(false);

// Replace your handleDownloadCSV function with this implementation
const handleDownloadCSV = async () => {
  try {
    // Only proceed if we have a selected node
    if (!filters.node) {
      alert('Please select a node first');
      return;
    }
    
    // Show loading state
    setIsDownloading(true);
    
    // Prepare the query parameters
    const params = {
      node: filters.node,
      // Include parameter filters if they exist
      ...(filters.voltage_min && { voltage_min: filters.voltage_min }),
      ...(filters.voltage_max && { voltage_max: filters.voltage_max }),
      ...(filters.current_min && { current_min: filters.current_min }),
      ...(filters.current_max && { current_max: filters.current_max }),
      ...(filters.power_min && { power_min: filters.power_min }),
      ...(filters.power_max && { power_max: filters.power_max }),
      ...(filters.frequency_min && { frequency_min: filters.frequency_min }),
      ...(filters.frequency_max && { frequency_max: filters.frequency_max }),
      ...(filters.power_factor_min && { power_factor_min: filters.power_factor_min }),
      ...(filters.power_factor_max && { power_factor_max: filters.power_factor_max }),
      ...(filters.show_anomalies !== undefined && { show_anomalies: filters.show_anomalies }),
    };
    
    console.log('Requesting CSV download with parameters:', params);
    
    // Use the full URL to your Django backend
    const backendUrl = `${import.meta.env.VITE_API_URL}power-readings/export-csv/`;
    console.log('Using backend URL:', backendUrl);
    
    // Make the API request (set responseType to blob to handle the file)
    const response = await axios.get(backendUrl, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv, application/octet-stream, */*'
      }
    });
    
    // Check if the response is actually a CSV
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      throw new Error('Received HTML instead of CSV. The server might have returned an error.');
    }
    
    // Create a download link and trigger the download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Generate a descriptive filename
    let filename = `${filters.node}_power_data`;

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    filename += `_export_${dateStr}.csv`;
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    setIsDownloading(false);
    
    console.log('CSV download completed');
  } catch (error) {
    console.error('Error downloading CSV:', error);
    setIsDownloading(false);
    alert('Failed to download CSV: ' + (error.message || 'Unknown error'));
  }
};
  
  return (
    <div className="readings-container">
      {/* Title Row */}
      <div className="header-row">
        <h2 className="main-title">Power Quality Tabled Data</h2>
        <button 
          className="download-btn" 
          onClick={handleDownloadCSV} 
          disabled={!filters.node || isDownloading}
        >
          {isDownloading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Downloading...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faDownload} /> Download All Node Data
            </>
          )}
        </button>
      </div>
      
      {/* Navigation Bar */}
      <NavigationBar
        filters={filters}
        setFilters={setFilters}
        availableNodes={availableNodes}
        availableYears={availableYears}
        availableMonths={availableMonths}
        availableDays={availableDays}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedDay={selectedDay}
        setSelectedYear={setSelectedYear}
        setSelectedMonth={setSelectedMonth}
        setSelectedDay={setSelectedDay}
        fetchDay={fetchDay}
        loading={loading}
        openFilterModal={openFilterModal}
        hasActiveParameterFilters={hasActiveParameterFilters}
        resetParameterFilters={resetParameterFilters}
        readings={readings}
      />
      
      {/* Data Refresh Button */}
      {readings.length > 0 && filters.node && selectedYear && selectedMonth && (
        <div className="data-refresh-container">
          <button 
            className="data-refresh-btn"
            onClick={fetchLatestData}
            disabled={realtimeUpdateInProgress}
          >
            <FontAwesomeIcon icon={faSync} className={realtimeUpdateInProgress ? 'fa-spin' : ''} />
            {realtimeUpdateInProgress ? 'Refreshing Data...' : 'Refresh Data'}
          </button>
          {lastUpdateTimeRef.current && (
            <span className="last-update">
              Last update: {new Date(lastUpdateTimeRef.current).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
      
      {/* New data notification */}
      <NewDataNotification count={newDataCount} />
      
      {/* Loading & Error States */}
      <LoadingIndicator loading={loading} progress={dataLoadProgress} />
      <ErrorDisplay error={error} />
      
      {/* Filter Display */}
      <FilterDisplay 
        show={!loading && hasActiveParameterFilters}
        filters={filters}
      />
      
      {/* No Data Message */}
      {!loading && !error && filteredReadings.length === 0 && (
        <NoDataMessage 
          filters={filters}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          resetFilters={resetFilters}
        />
      )}
      
      {/* Data Table with Pagination */}
      {!loading && !error && filteredReadings.length > 0 && (
        <>
          <DataTable readings={currentItems} />
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
            totalItems={filteredReadings.length}
            prevPage={prevPage}
            nextPage={nextPage}
            changeItemsPerPage={changeItemsPerPage}
          />
        </>
      )}

      {/* Load More Button */}
      {!loading && !error && 
      filteredReadings.length > 0 && 
      (isBackgroundFetching || totalAvailableRecords > displayLimit) && 
      currentPage >= totalPages && (
        <div className="load-more-container">
          <button 
            className="load-more-btn"
            onClick={loadMoreData}
            disabled={isBackgroundFetching}
          >
            {isBackgroundFetching ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> 
                Fetching more data...
              </>
            ) : (
              <>
                Load More Data 
                <span className="load-more-count">
                  +{Math.min(200, totalAvailableRecords - displayLimit)}
                </span>
              </>
            )}
          </button>
          <div className="load-more-info">
            Showing {displayLimit} of {totalAvailableRecords} total readings
          </div>
        </div>
      )}
      
      {/* Filter Modal */}
      <ParameterFiltersModal 
        show={showFilterModal}
        onClose={closeFilterModal}
        tempFilters={tempFilters}
        handleFilterChange={handleFilterChange}
        applyFilters={handleApplyFilters}
      />

      {/* Data Summary */}
      {!loading && filteredReadings.length > 0 && (
        <div className="data-stats">
          <p>
            {selectedYear && selectedMonth ? (
              selectedDay ? 
              `Viewing data for ${filters.node} on ${selectedYear}-${selectedMonth}-${selectedDay}` :
              `Viewing data for ${filters.node} in ${getMonthName(selectedMonth)} ${selectedYear}`
            ) : ''}
            {' • '} 
            {filteredReadings.length} readings 
            {filteredReadings.filter(r => r.is_anomaly).length > 0 && 
             ` (including ${filteredReadings.filter(r => r.is_anomaly).length} anomalies)`}
          </p>
        </div>
      )}
    </div>
  );
};

export default PowerReadings;