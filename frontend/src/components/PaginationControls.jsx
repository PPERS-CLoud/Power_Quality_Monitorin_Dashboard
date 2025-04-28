import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const PaginationControls = ({
  currentPage,
  totalPages,
  itemsPerPage,
  indexOfFirstItem,
  indexOfLastItem,
  totalItems,
  prevPage,
  nextPage,
  changeItemsPerPage
}) => {
  return (
    <div className="pagination-controls">
      <div className="pagination-info">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
      </div>
      <div className="pagination-buttons">
        <button 
          className="pagination-btn" 
          onClick={prevPage} 
          disabled={currentPage === 1}
        >
          <FontAwesomeIcon icon={faChevronLeft} /> Previous
        </button>
        <span className="pagination-page-info">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button 
          className="pagination-btn" 
          onClick={nextPage} 
          disabled={currentPage >= totalPages}
        >
          Next <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      <div className="items-per-page">
        <label htmlFor="items-select">Items per page:</label>
        <select 
          id="items-select" 
          value={itemsPerPage} 
          onChange={(e) => changeItemsPerPage(e.target.value)}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
};

export default React.memo(PaginationControls);