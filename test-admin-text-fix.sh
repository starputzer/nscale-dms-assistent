#!/bin/bash

# Ensure admin CSS files are in the right place
echo "Copying updated admin CSS files to public directory..."
cp -v public/assets/styles/admin-sidebar.css public/assets/styles/admin-sidebar.css
cp -v public/assets/styles/admin-overrides.css public/assets/styles/admin-overrides.css
cp -v public/assets/styles/admin-direct-fix.css public/assets/styles/admin-direct-fix.css

# Create a simple HTML file to test just the admin sidebar
cat > public/admin-sidebar-test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Sidebar Test</title>
  <link rel="stylesheet" href="/assets/styles/admin-sidebar.css">
  <link rel="stylesheet" href="/assets/styles/admin-overrides.css">
  <link rel="stylesheet" href="/assets/styles/admin-direct-fix.css">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .test-container {
      display: flex;
      height: 100vh;
    }
    .content {
      flex: 1;
      padding: 20px;
    }
    h1 {
      margin-top: 0;
    }
    /* Emulating dark mode for testing */
    .dark-mode .admin-panel__nav {
      --admin-bg: #333;
      --admin-text: #fff;
      --admin-active-bg: #555;
      --admin-hover-bg: #444;
      --admin-border: #666;
    }
  </style>
</head>
<body>
  <div class="test-container">
    <!-- Sample admin nav with hard-coded labels for testing -->
    <div class="admin-panel__nav">
      <div class="admin-panel__nav-header">
        <h2>Admin Panel</h2>
      </div>
      <div class="admin-panel__nav-items">
        <button class="admin-panel__nav-item admin-panel__nav-item--active">
          <span class="admin-panel__nav-icon">📊</span>
          <span class="admin-panel__nav-label">Dashboard</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">👥</span>
          <span class="admin-panel__nav-label">Users</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">⚙️</span>
          <span class="admin-panel__nav-label">System</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">📝</span>
          <span class="admin-panel__nav-label">Logs</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">💬</span>
          <span class="admin-panel__nav-label">Feedback</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">🔀</span>
          <span class="admin-panel__nav-label">Feature Toggles</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">📣</span>
          <span class="admin-panel__nav-label">Message of the Day</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">📄</span>
          <span class="admin-panel__nav-label">Document Converter</span>
        </button>
        <button class="admin-panel__nav-item">
          <span class="admin-panel__nav-icon">🧪</span>
          <span class="admin-panel__nav-label">A/B Tests</span>
        </button>
      </div>
    </div>
    <div class="content">
      <h1>Admin Sidebar Test</h1>
      <p>This page tests the CSS styling of the admin sidebar navigation without requiring the full application to load.</p>
      
      <h2>Features implemented:</h2>
      <ul>
        <li>Fixed sidebar width (240px)</li>
        <li>Proper spacing and padding</li>
        <li>Active state with background color instead of border</li>
        <li>Hover effects without transform properties</li>
        <li>Text visibility fixes with multiple fallbacks</li>
        <li>High-specificity CSS rules to prevent conflicts</li>
        <li>Responsive styles for mobile</li>
      </ul>
      
      <button id="toggle-dark-mode">Toggle Dark Mode</button>
      <button id="toggle-mobile-view">Toggle Mobile View</button>
    </div>
  </div>

  <script>
    // Simple dark mode toggle
    document.getElementById('toggle-dark-mode').addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
    });
    
    // Simple mobile view simulator
    document.getElementById('toggle-mobile-view').addEventListener('click', function() {
      const nav = document.querySelector('.admin-panel__nav');
      nav.classList.toggle('admin-panel__nav--mobile');
    });
  </script>
</body>
</html>
EOF

echo "Created admin sidebar test page at public/admin-sidebar-test.html"

# Start the server
echo "Starting server on port 3009..."
echo "Visit http://localhost:3009/admin-sidebar-test.html in your browser to test the admin sidebar"
echo "Or visit http://localhost:3009/admin to test the full admin panel"
npm run serve -- --port 3009