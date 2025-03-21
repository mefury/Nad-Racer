// Backend service for API calls
// Using absolute URL to avoid potential path issues
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.nadracer.xyz/api'  // In production, use the deployed API URL
  : 'https://api.nadracer.xyz/api';     // In development, use localhost

// Utility function to log API requests
const logApiRequest = (method, endpoint, data = null) => {
  console.log(`🔄 API ${method}: ${API_URL}${endpoint}${data ? ` with data: ${JSON.stringify(data)}` : ''}`);
};

// Utility function to handle API responses
const handleApiResponse = async (response, operation) => {
  console.log(`📡 Response status (${operation}):`, response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Error response for ${operation} (${response.status}):`, errorText);
    throw new Error(`Error during ${operation}: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`✅ ${operation} result:`, result);
  return result;
};

// Check if a player is registered
export const checkPlayerRegistration = async (walletAddress) => {
  logApiRequest('GET', `/player/${walletAddress}`);
  
  try {
    const response = await fetch(`${API_URL}/player/${walletAddress}`, {
      mode: 'cors',
      credentials: 'include'
    });
    return await handleApiResponse(response, 'Player registration check');
  } catch (error) {
    console.error('❌ Failed to check player registration:', error);
    return { registered: false, error: error.message };
  }
};

// Register a new player
export const registerPlayer = async (walletAddress, username) => {
  const data = { walletAddress, username };
  logApiRequest('POST', '/register', data);
  
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'include'
    });
    
    return await handleApiResponse(response, 'Player registration');
  } catch (error) {
    console.error('❌ Failed to register player:', error);
    return { success: false, error: error.message };
  }
};

// Get leaderboard data
export const getLeaderboard = async () => {
  logApiRequest('GET', '/leaderboard');
  
  try {
    const response = await fetch(`${API_URL}/leaderboard`, {
      mode: 'cors',
      credentials: 'include'
    });
    return await handleApiResponse(response, 'Leaderboard fetch');
  } catch (error) {
    console.error('❌ Failed to fetch leaderboard:', error);
    return [];
  }
};

// Save game score
export const saveScore = async (walletAddress, score) => {
  const data = { walletAddress, score };
  logApiRequest('POST', '/save-score', data);
  
  try {
    const response = await fetch(`${API_URL}/save-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'include'
    });
    
    return await handleApiResponse(response, 'Score saving');
  } catch (error) {
    console.error('❌ Failed to save score:', error);
    return { success: false, error: error.message };
  }
};

// Process coin collection - sends request to transfer tokens from treasury
export const processTokens = async (walletAddress, pointsToMint) => {
  console.log(`🔷 processTokens called with walletAddress: ${walletAddress}, pointsToMint: ${pointsToMint}`);

  if (!walletAddress) {
    console.error('❌ processTokens called with invalid wallet address');
    return { success: false, error: 'Invalid wallet address' };
  }

  if (!pointsToMint || pointsToMint <= 0) {
    console.error('❌ processTokens called with invalid points amount:', pointsToMint);
    return { success: false, error: 'Invalid points amount' };
  }

  // Use the correct parameter name expected by the backend
  const data = { walletAddress, coinsCollected: pointsToMint };
  console.log(`🔷 processTokens data payload:`, data);
  logApiRequest('POST', '/transfer-tokens', data);
  
  try {
    const requestStartTime = Date.now();
    console.log(`🔷 processTokens sending request to ${API_URL}/transfer-tokens`);
    
    const response = await fetch(`${API_URL}/transfer-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'include'
    });
    
    console.log(`🔷 processTokens received response in ${Date.now() - requestStartTime}ms`);
    const result = await handleApiResponse(response, 'Token transfer');
    
    // Log the transaction hash if available
    if (result.success && result.txHash) {
      console.log(`🔷 processTokens transfer successful with txHash: ${result.txHash}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to process token transfer:', error);
    return { success: false, error: error.message };
  }
};

// Test API connection and return connection status
export const testApiConnection = async () => {
  logApiRequest('GET', '/health/cors-test');
  
  try {
    console.log(`🔍 Testing API connection to ${API_URL}/health/cors-test`);
    const response = await fetch(`${API_URL}/health/cors-test`, {
      mode: 'cors',
      credentials: 'include'
    });
    
    const result = await handleApiResponse(response, 'API connection test');
    return {
      success: true,
      message: 'API connection successful',
      apiUrl: API_URL,
      corsResponse: result
    };
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return {
      success: false,
      message: `API connection failed: ${error.message}`,
      apiUrl: API_URL,
      error: error.message
    };
  }
};

// Get current API URL in use
export const getApiUrl = () => {
  return API_URL;
}; 