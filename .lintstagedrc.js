module.exports = {
  // TypeScript und JavaScript Dateien
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ],
  
  // Vue Dateien
  '*.vue': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ],
  
  // Style Dateien
  '*.{css,scss,sass,less}': [
    'prettier --write',
    'git add'
  ],
  
  // JSON, YAML, Markdown
  '*.{json,yml,yaml,md}': [
    'prettier --write',
    'git add'
  ],
  
  // Bilder optimieren (optional)
  '*.{png,jpeg,jpg,gif,svg}': [
    'imagemin-lint-staged',
    'git add'
  ]
};