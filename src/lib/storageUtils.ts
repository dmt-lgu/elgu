// Storage utility functions to handle quota exceeded errors

export const clearStorageIfNeeded = () => {
  try {
    const storageUsed = JSON.stringify(localStorage).length;
    const maxStorage = 20 * 1024 * 1024; // Increased to 20MB limit for more data capacity

    if (storageUsed > maxStorage * 0.9) { // Increased threshold to 90% of limit
      console.warn('Storage usage high, clearing old data...');
      // Clear specific keys that might be large
      const keysToRemove = [
        'persist:transaction',
        'persist:status', 
        'persist:wp',
        'persist:brgy'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('Cleared large data from storage');
    }
  } catch (error) {
    console.error('Error checking storage:', error);
    // If we can't even check, clear everything except essential data
    try {
      const essentialKeys = [
        'persist:region',
        'persist:dates', 
        'persist:datas',
        'persist:load2'
      ];
      
      const essentialData: {[key: string]: string | null} = {};
      essentialKeys.forEach(key => {
        essentialData[key] = localStorage.getItem(key);
      });
      
      localStorage.clear();
      
      // Restore essential data
      Object.entries(essentialData).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
        }
      });
      
      console.log('Cleared storage but preserved essential data');
    } catch (clearError) {
      console.error('Error clearing storage:', clearError);
      // Last resort - clear everything
      localStorage.clear();
    }
  }
};

export const getStorageUsage = () => {
  try {
    const storageUsed = JSON.stringify(localStorage).length;
    const storageUsedMB = storageUsed / (1024 * 1024);
    return {
      used: storageUsed,
      usedMB: Math.round(storageUsedMB * 100) / 100,
      percentage: Math.round((storageUsed / (8 * 1024 * 1024)) * 100) // Updated to 8MB
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, usedMB: 0, percentage: 0 };
  }
};

export const handleStorageError = (error: any, fallbackAction?: () => void) => {
  if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
    console.warn('Storage quota exceeded, attempting to clear space...');
    clearStorageIfNeeded();
    
    if (fallbackAction) {
      try {
        fallbackAction();
      } catch (fallbackError) {
        console.error('Fallback action also failed:', fallbackError);
      }
    }
    
    return true; // Indicates we handled the error
  }
  
  return false; // Not a storage error
};