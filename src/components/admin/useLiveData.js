/**
 * Helper to enable live data for admin panel
 *
 * This script sets a localStorage flag that ensures we use live data
 * instead of falling back to mock data for API requests.
 */

export function enableLiveData() {
  console.log("Enabling live data for API requests");
  localStorage.setItem("use_live_data", "true");
  localStorage.removeItem("use_mock_api");
  localStorage.removeItem("force_mock_auth");
}

export function disableLiveData() {
  console.log("Disabling live data for API requests");
  localStorage.removeItem("use_live_data");
}

export function isLiveDataEnabled() {
  return localStorage.getItem("use_live_data") === "true";
}

export default {
  enableLiveData,
  disableLiveData,
  isLiveDataEnabled,
};
