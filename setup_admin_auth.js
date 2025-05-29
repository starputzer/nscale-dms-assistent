// Setze einen gültigen Admin-Token im localStorage für das Frontend
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc0ODUwNjE1OCwidG9rZW5FeHBpcnkiOjE3NDg1MDYxNTh9.NCzgK9Vlo8PFY_Y34f_vVTlZ1KdR_5l6jriDJo0R98Y";

// Führe diesen Code in der Browser-Konsole aus:
console.log("Setting up admin authentication...");

// Setze Token
localStorage.setItem('nscale_access_token', token);
localStorage.setItem('nscale_token', token);

// Setze Benutzerinformationen
const userInfo = {
  id: 5,
  email: "martin@danglefeet.com",
  role: "admin",
  isAuthenticated: true
};

localStorage.setItem('nscale_user', JSON.stringify(userInfo));
localStorage.setItem('nscale_user_role', 'admin');
localStorage.setItem('nscale_is_authenticated', 'true');

// Token Expiry setzen (1 Tag in der Zukunft)
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 1);
localStorage.setItem('nscale_token_expiry', expiryDate.getTime().toString());

console.log("Admin authentication setup complete!");
console.log("Token:", token.substring(0, 50) + "...");
console.log("User:", userInfo);
console.log("Expiry:", new Date(expiryDate));
console.log("\nYou can now refresh the page and access the admin panel.");