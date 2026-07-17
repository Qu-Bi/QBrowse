const { chromium } = require('playwright');
const { exec } = require('child_process');

(async () => {
  // Start vite server
  const server = exec('npx vite --port 1420');
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:1420/');
  await page.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  
  console.log('Page loaded. Checking for errors...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await browser.close();
  server.kill();
  process.exit(0);
})();
