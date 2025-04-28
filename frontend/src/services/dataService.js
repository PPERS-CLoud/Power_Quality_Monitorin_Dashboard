import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

/**
 * Fetch available nodes from backend
 * @returns {Promise<string[]>} Array of node IDs
 */
export const fetchAvailableNodes = async () => {
    try {
        console.log('Fetching nodes from API...');
        const response = await axios.get(`${API_URL}firebase/nodes/`);
        
        if (response.data && response.data.length > 0) {
            console.log(`Successfully found ${response.data.length} nodes:`, response.data);
            return response.data;
        }
        throw new Error('No nodes returned from API');
    } catch (error) {
        console.error('Error fetching nodes from API:', error);
        // If backend fails, use fallback nodes
        const fallbackNodes = ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'];
        console.log('Using fallback nodes:', fallbackNodes);
        return fallbackNodes;
    }
};

/**
 * Fetch years for a specific node
 * @param {string} nodeId - Node ID
 * @returns {Promise<string[]>} Array of years
 */
export const fetchYearsForNode = async (nodeId) => {
    try {
        const response = await axios.get(`${API_URL}firebase/years/`, {
            params: { node: nodeId }
        });
        
        if (response.data) {
            console.log(`Available years for ${nodeId}:`, response.data);
            return response.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching years:", error);
        return [];
    }
};

/**
 * Fetch months for a specific node and year
 * @param {string} nodeId - Node ID
 * @param {string} year - Year
 * @returns {Promise<string[]>} Array of months
 */
export const fetchMonthsForNodeYear = async (nodeId, year) => {
    try {
        const response = await axios.get(`${API_URL}firebase/months/`, {
            params: { 
                node: nodeId,
                year: year
            }
        });
        
        if (response.data) {
            console.log(`Available months for ${nodeId}/${year}:`, response.data);
            return response.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching months:", error);
        return [];
    }
};

/**
 * Fetch days for a specific node, year and month
 * @param {string} nodeId - Node ID
 * @param {string} year - Year
 * @param {string} month - Month
 * @returns {Promise<string[]>} Array of days
 */
export const fetchDaysForNodeYearMonth = async (nodeId, year, month) => {
    try {
        const response = await axios.get(`${API_URL}firebase/days/`, {
            params: { 
                node: nodeId,
                year: year,
                month: month
            }
        });
        
        if (response.data) {
            console.log(`Available days for ${nodeId}/${year}/${month}:`, response.data);
            return response.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching days:", error);
        return [];
    }
};

/**
 * Fetch data for a specific day
 * @param {string} nodeId - Node ID
 * @param {string} year - Year
 * @param {string} month - Month
 * @param {string} day - Day
 * @returns {Promise<Array>} Array of readings
 */
export const fetchDayData = async (nodeId, year, month, day) => {
    try {
        const response = await axios.get(`${API_URL}firebase/node-data/`, {
            params: { 
                node: nodeId,
                year: year,
                month: month,
                day: day
            }
        });
        
        if (response.data) {
            console.log(`Loaded ${response.data.length} readings for ${nodeId}/${year}/${month}/${day}`);
            return response.data;
        }
        return [];
    } catch (error) {
        console.error(`Error fetching data for ${nodeId}/${year}/${month}/${day}:`, error);
        return [];
    }
};

/**
 * Fetch data for an entire month
 * @param {string} nodeId - Node ID
 * @param {string} year - Year
 * @param {string} month - Month
 * @returns {Promise<Array>} Array of readings
 */
export const fetchMonthData = async (nodeId, year, month) => {
    try {
        const response = await axios.get(`${API_URL}firebase/node-data/`, {
            params: { 
                node: nodeId,
                year: year,
                month: month
            }
        });
        
        if (response.data) {
            console.log(`Loaded ${response.data.length} readings for ${nodeId}/${year}/${month}`);
            return response.data;
        }
        return [];
    } catch (error) {
        console.error(`Error fetching data for ${nodeId}/${year}/${month}:`, error);
        return [];
    }
};

/**
 * Fetch only new data since a certain timestamp
 * @param {string} nodeId - Node ID
 * @param {string} year - Year
 * @param {string} month - Month
 * @param {string} day - Day
 * @param {string} sinceTimestamp - ISO timestamp to fetch data newer than this
 * @returns {Promise<Array>} Array of new readings
 */
export const fetchNewData = async (nodeId, year, month, day, sinceTimestamp) => {
    try {
        const response = await axios.get(`${API_URL}firebase/node-data/`, {
            params: { 
                node: nodeId,
                year: year,
                month: month,
                day: day,
                since_timestamp: sinceTimestamp
            }
        });
        
        if (response.data) {
            console.log(`Loaded ${response.data.length} new readings since ${sinceTimestamp}`);
            return response.data;
        }
        return [];
    } catch (error) {
        console.error(`Error fetching new data since ${sinceTimestamp}:`, error);
        return [];
    }
};