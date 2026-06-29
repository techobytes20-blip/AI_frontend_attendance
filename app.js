/* WordPress-Safe Scoped JavaScript for Attendance Admin Panel */
(function () {
  // Application State
  const state = {
    baseUrl: 'http://localhost:3000/api/v1',
    token: localStorage.getItem('tams_jwt_token') || '',
    adminEmail: localStorage.getItem('tams_admin_email') || '',
    activeTab: 'dashboard',
    activeCheckpoint: 'day1',
    isBackendOnline: false,
    mockMode: false,
    logs: JSON.parse(localStorage.getItem('tams_scan_logs')) || [
      { studentName: 'John Doe', studentEmail: 'student@example.com', studentPhone: '1234567890', workshop: 'React Basics', token: 'token_john_doe_react_basics_123', checkpoint: 'day1', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success' },
      { studentName: 'Jane Smith', studentEmail: 'janesmith@example.com', studentPhone: '9876543210', workshop: 'Node API Design', token: 'token_jane_smith_node_api_456', checkpoint: 'day2', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success' },
      { studentName: 'Failed Scan', studentEmail: '', studentPhone: '', workshop: '', token: 'invalid_token_xyz_789', checkpoint: 'day1', timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'error' },
      { studentName: 'Alice Johnson', studentEmail: 'alice@example.com', studentPhone: '1112223333', workshop: 'CSS Secrets', token: 'token_alice_css_secrets_101', checkpoint: 'day1', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'success' },
      { studentName: 'Bob Vance', studentEmail: 'bob@example.com', studentPhone: '4445556666', workshop: 'Refrigeration', token: 'token_bob_refrigeration_202', checkpoint: 'day2', timestamp: new Date(Date.now() - 18000000).toISOString(), status: 'success' },
      { studentName: 'Charlie Kelly', studentEmail: 'charlie@example.com', studentPhone: '7778889999', workshop: 'Bird Law', token: 'token_charlie_bird_law_303', checkpoint: 'day1', timestamp: new Date(Date.now() - 21600000).toISOString(), status: 'success' },
      { studentName: 'Dee Reynolds', studentEmail: 'dee@example.com', studentPhone: '0001112222', workshop: 'Acting 101', token: 'token_dee_acting_404', checkpoint: 'day2', timestamp: new Date(Date.now() - 25200000).toISOString(), status: 'success' }
    ],
    scanner: null,
    searchQuery: '',
    dashboardSearchQuery: '',
    dashboardPage: 1,
    dashboardPageSize: 5,
    syncPage: 1,
    syncPageSize: 5,
    mockRows: [
      { Name: 'John Doe', Email: 'student@example.com', Phone: '1234567890', College: 'Example College', Topic: 'React Fundamentals', Workshop: 'TestEvent' },
      { Name: 'Jane Smith', Email: 'janesmith@example.com', Phone: '9876543210', College: 'State Tech', Topic: 'Node.js API Design', Workshop: 'TestEvent' }
    ]
  };

  // UI Elements Selectors (Scoped inside #tams-admin-panel)
  const getEl = (selector) => document.querySelector(`#tams-admin-panel ${selector}`);
  const getAllEl = (selector) => document.querySelectorAll(`#tams-admin-panel ${selector}`);

  // Initialize Application
  function init() {
    setupEventListeners();
    checkBackendHealth();
    renderLogs();
    
    // Check Authentication state
    if (state.token) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  // Check server health
  async function checkBackendHealth() {
    try {
      // Send a quick ping to check if server is reachable
      const response = await fetch(`${state.baseUrl}/auth/send-otp`, {
        method: 'OPTIONS',
        headers: { 'Access-Control-Request-Method': 'POST' }
      }).catch(() => null);
      
      // If server responded (or rejected but was reachable), we consider it online
      state.isBackendOnline = true;
      updateConnectionStatus('online');
    } catch (err) {
      state.isBackendOnline = false;
      // If backend is offline, enable mockMode by default so UI works
      state.mockMode = true;
      updateConnectionStatus('mock');
      showToast('Offline Mode', 'Backend server offline. Automatically running in Mock Mode.', 'warning');
    }
    
    // Sync settings view controls
    const mockToggle = getEl('#mock-mode-toggle');
    if (mockToggle) mockToggle.checked = state.mockMode;
  }

  function updateConnectionStatus(status) {
    const dot = getEl('#connection-dot');
    const label = getEl('#connection-label');
    if (!dot || !label) return;

    dot.className = 'status-dot';
    if (status === 'online') {
      dot.classList.add('online');
      label.textContent = 'Server Online';
    } else if (status === 'mock') {
      dot.classList.add('mock');
      label.textContent = 'Mock Sandbox';
    } else {
      dot.classList.add('offline');
      label.textContent = 'Server Offline';
    }
  }

  // Toast System
  function showToast(title, desc, type = 'info') {
    const container = getEl('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${desc}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      dismissToast(toast);
    }, 4000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timer);
      dismissToast(toast);
    });
  }

  function dismissToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Navigation and UI Switches
  function showLogin() {
    getEl('#auth-view').style.display = 'flex';
    getEl('#main-dashboard-view').classList.remove('active');
  }

  function showDashboard() {
    getEl('#auth-view').style.display = 'none';
    getEl('#main-dashboard-view').classList.add('active');
    
    // Set user info
    getEl('#sidebar-user-email').textContent = state.adminEmail || 'Admin';
    getEl('#sidebar-avatar').textContent = (state.adminEmail || 'A')[0].toUpperCase();
    
    // Switch to active tab
    switchTab(state.activeTab);
    updateStats();
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update active nav links
    getAllEl('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active view panes
    getAllEl('.view-pane').forEach(pane => {
      if (pane.id === `${tabId}-pane`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Handle special initialization on tab activation
    if (tabId === 'scanner') {
      // If QR scanner code is not loaded, we load it dynamically
      loadQrScannerLibrary();
    } else {
      // Stop scanner if active when leaving tab
      stopScanner();
    }

    if (tabId === 'sync') {
      renderMockRowsEditor();
    }

    if (tabId === 'settings') {
      const mockToggle = getEl('#mock-mode-toggle');
      if (mockToggle) mockToggle.checked = state.mockMode;
    }
  }

  // Load standard QR code scanner library dynamically
  function loadQrScannerLibrary() {
    if (window.Html5Qrcode) {
      startScanner();
      return;
    }

    showToast('Loading Scanner', 'Initializing camera libraries, please wait...', 'info');
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode';
    script.onload = () => {
      startScanner();
    };
    script.onerror = () => {
      showToast('Load Failed', 'Failed to load QR scanner library. You can still use manual entry.', 'error');
    };
    document.head.appendChild(script);
  }

  // Stats Counters
  function updateStats() {
    const totalScans = state.logs.length;
    const day1Scans = state.logs.filter(l => l.checkpoint === 'day1' && l.status === 'success').length;
    const day2Scans = state.logs.filter(l => l.checkpoint === 'day2' && l.status === 'success').length;
    const certificates = state.logs.filter(l => l.checkpoint === 'certificateCollected' && l.status === 'success').length;

    // Render Stats to Dashboard Tab
    getEl('#stat-total-scans').textContent = totalScans;
    getEl('#stat-day1-scans').textContent = day1Scans;
    getEl('#stat-day2-scans').textContent = day2Scans;
    getEl('#stat-certificates').textContent = certificates;
  }

  // Render scan log history table
  function renderLogs() {
    const tbody = getEl('#recent-scans-tbody');
    if (!tbody) return;

    const query = (state.dashboardSearchQuery || '').trim().toLowerCase();
    const filteredLogs = state.logs.filter(log => {
      if (!query) return true;
      const name = (log.studentName || '').toLowerCase();
      const email = (log.studentEmail || '').toLowerCase();
      const phone = (log.studentPhone || '').toLowerCase();
      const workshop = (log.workshop || '').toLowerCase();
      const token = (log.token || '').toLowerCase();
      const checkpoint = (log.checkpoint || '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query) || workshop.includes(query) || token.includes(query) || checkpoint.includes(query);
    });

    // Pagination calculations
    const totalItems = filteredLogs.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.dashboardPageSize));
    
    // Clamp current page
    if (state.dashboardPage > totalPages) {
      state.dashboardPage = totalPages;
    }
    if (state.dashboardPage < 1) {
      state.dashboardPage = 1;
    }

    const startIndex = (state.dashboardPage - 1) * state.dashboardPageSize;
    const endIndex = Math.min(startIndex + state.dashboardPageSize, totalItems);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    // Update Pagination UI Info & Buttons
    const infoEl = getEl('#dashboard-pagination-info');
    if (infoEl) {
      infoEl.textContent = `Page ${state.dashboardPage} of ${totalPages}`;
    }
    const prevBtn = getEl('#btn-dashboard-prev');
    if (prevBtn) {
      prevBtn.disabled = state.dashboardPage <= 1;
    }
    const nextBtn = getEl('#btn-dashboard-next');
    if (nextBtn) {
      nextBtn.disabled = state.dashboardPage >= totalPages;
    }

    if (paginatedLogs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 30px;">
            ${query ? 'No matching logs found.' : 'No scans recorded yet. Select \'QR Scanner\' to start recording attendance.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = paginatedLogs.map(log => {
      const badgeClass = log.status === 'success' ? 'badge-success' : (log.status === 'duplicate' ? 'badge-warning' : 'badge-danger');
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      
      const emailPhoneText = (log.studentEmail || log.studentPhone) ? 
        `<div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">
          ${log.studentEmail ? `<span>${log.studentEmail}</span>` : ''} 
          ${log.studentPhone ? `<span style="margin-left: 8px; color: var(--color-text-muted);">${log.studentPhone}</span>` : ''}
         </div>` : '';
      
      const workshopText = log.workshop ? 
        `<div style="font-size: 11px; color: var(--color-yellow); margin-top: 2px;">
          Workshop: ${log.workshop}
         </div>` : '';

      return `
        <tr>
          <td>
            <div style="font-weight: 500;">${log.studentName || 'Unknown Student'}</div>
            ${emailPhoneText}
          </td>
          <td>
            <code>${log.token.substring(0, 12)}...</code>
            ${workshopText}
          </td>
          <td style="text-transform: capitalize; font-size: 13px;">${log.checkpoint}</td>
          <td style="font-size: 13px; color: var(--color-text-secondary);">${timeStr}</td>
          <td><span class="badge-status ${badgeClass}">${log.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // API INTEGRATION AND LOGIC
  // ==========================================================================
  
  // Submit Email to request OTP
  async function handleSendOtp(email) {
    if (!email) {
      showToast('Validation Error', 'Please enter a valid email address.', 'error');
      return;
    }

    const submitBtn = getEl('#btn-send-otp');
    submitBtn.classList.add('btn-disabled');
    submitBtn.textContent = 'Sending OTP...';

    try { 
      let otpResponse = null;
      if (state.mockMode) {
        // Simulate OTP API
        await new Promise(resolve => setTimeout(resolve, 800));
        otpResponse = { message: 'OTP sent successfully to email.', otp: '123456' };
      } else {
        const response = await fetch(`${state.baseUrl}/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Failed to send OTP.');
        }
        otpResponse = await response.json();
      }

      state.adminEmail = email;
      localStorage.setItem('tams_admin_email', email);
      
      // Auto-fill OTP in Dev/Mock Mode for helper testing
      if (otpResponse.otp) {
        showToast('OTP Received (Dev Mode)', `Your OTP code is: ${otpResponse.otp}`, 'success');
        // Pre-fill the first OTP boxes or alert
        getEl('#otp-help-message').innerHTML = `OTP sent. In development mode, auto-saved: <span>${otpResponse.otp}</span>`;
      } else {
        getEl('#otp-help-message').innerHTML = 'Please check your email for the 6-digit OTP code.';
      }

      // Transition to OTP view
      getEl('#auth-step-email').classList.remove('active');
      getEl('#auth-step-otp').classList.add('active');
      
      // Focus on first OTP digit
      const firstOtpInput = getEl('.otp-input');
      if (firstOtpInput) firstOtpInput.focus();

    } catch (err) {
      showToast('Request Failed', err.message, 'error');
    } finally {
      submitBtn.classList.remove('btn-disabled');
      submitBtn.textContent = 'Get OTP';
    }
  }

  // Submit OTP to Login
  async function handleVerifyOtp() {
    // Gather OTP code
    let otpCode = '';
    getAllEl('.otp-input').forEach(input => {
      otpCode += input.value;
    });

    if (otpCode.length !== 6) {
      showToast('Validation Error', 'Please enter the complete 6-digit OTP code.', 'error');
      return;
    }

    const submitBtn = getEl('#btn-verify-otp');
    submitBtn.classList.add('btn-disabled');
    submitBtn.textContent = 'Verifying...';

    try {
      let loginData = null;
      if (state.mockMode) {
        await new Promise(resolve => setTimeout(resolve, 600));
        if (otpCode === '123456' || otpCode) {
          loginData = { token: 'mock-jwt-token-xyz-123456' };
        } else {
          throw new Error('Invalid OTP code.');
        }
      } else {
        const response = await fetch(`${state.baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.adminEmail, otp: otpCode })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Invalid OTP code.');
        }
        loginData = await response.json();
      }

      // Save token state
      state.token = loginData.token;
      localStorage.setItem('tams_jwt_token', loginData.token);

      showToast('Login Success', 'Welcome back to Attendance Dashboard.', 'success');
      showDashboard();

    } catch (err) {
      showToast('Authentication Failed', err.message, 'error');
    } finally {
      submitBtn.classList.remove('btn-disabled');
      submitBtn.textContent = 'Verify & Login';
    }
  }

  // Scan QR Code API Wrapper
  async function processScan(scannedToken) {
    if (!scannedToken) return;
    
    // Stop scanning temporarily during processing
    const checkpoint = state.activeCheckpoint;
    showToast('Processing Scan', 'Registering attendance at checkpoint...', 'info');

    try {
      let scanResult = null;
      if (state.mockMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock scan states based on token structure
        if (scannedToken.includes('duplicate')) {
          scanResult = {
            status: 'duplicate',
            message: 'Attendance already checked for this checkpoint.',
            student: { Name: 'Jane Smith', College: 'State Tech', Email: 'janesmith@example.com', Phone: '9876543210', Workshop: 'TestEvent' }
          };
        } else if (scannedToken.includes('invalid')) {
          throw new Error('Invalid QR Token barcode.');
        } else {
          scanResult = {
            status: 'success',
            message: 'Attendance marked successfully!',
            student: { Name: 'John Doe', College: 'Example College', Email: 'student@example.com', Phone: '1234567890', Workshop: 'TestEvent' }
          };
        }
      } else {
        const response = await fetch(`${state.baseUrl}/attendance/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({ token: scannedToken, checkpoint: checkpoint })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Scan verification failed.');
        }
        scanResult = await response.json();
      }

      // Process and save log
      const studentName = scanResult.student?.Name || scanResult.student?.name || 'Registered Student';
      const studentEmail = scanResult.student?.Email || scanResult.student?.email || '';
      const studentPhone = scanResult.student?.Phone || scanResult.student?.phone || '';
      const workshop = scanResult.workshop || scanResult.student?.Workshop || scanResult.student?.workshop || 'N/A';

      const newLog = {
        studentName,
        studentEmail,
        studentPhone,
        workshop,
        token: scannedToken,
        checkpoint: checkpoint,
        timestamp: new Date().toISOString(),
        status: scanResult.status || 'success'
      };

      state.logs.unshift(newLog);
      state.dashboardPage = 1;
      // Limit to last 50 logs
      if (state.logs.length > 50) state.logs.pop();
      localStorage.setItem('tams_scan_logs', JSON.stringify(state.logs));

      // Display scanning visual result card
      renderScanResult(newLog.status, scanResult.message || 'Scan registered.', newLog.studentName, scanResult.student);
      renderLogs();
      updateStats();

    } catch (err) {
      showToast('Scan Error', err.message, 'error');
      renderScanResult('error', err.message, 'Failed verification', null);
      
      const errorLog = {
        studentName: 'Failed Scan',
        studentEmail: '',
        studentPhone: '',
        workshop: '',
        token: scannedToken,
        checkpoint: checkpoint,
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      state.logs.unshift(errorLog);
      state.dashboardPage = 1;
      localStorage.setItem('tams_scan_logs', JSON.stringify(state.logs));
      renderLogs();
    }
  }

  function renderScanResult(status, message, name, student) {
    const card = getEl('#scan-result-card');
    const iconContainer = getEl('#scan-result-icon');
    const title = getEl('#scan-result-title');
    const desc = getEl('#scan-result-desc');
    const details = getEl('#scan-student-details');

    if (!card) return;

    card.className = 'scan-result-card active';
    
    // Clear icons
    iconContainer.innerHTML = '';
    
    if (status === 'success') {
      card.style.borderColor = 'var(--success-color)';
      iconContainer.className = 'scan-result-status-icon badge-success';
      iconContainer.innerHTML = `<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
      title.textContent = 'Scan Success';
      title.style.color = 'var(--success-color)';
    } else if (status === 'duplicate') {
      card.style.borderColor = 'var(--color-yellow)';
      iconContainer.className = 'scan-result-status-icon badge-warning';
      iconContainer.innerHTML = `<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
      title.textContent = 'Duplicate Scan';
      title.style.color = 'var(--color-yellow)';
    } else {
      card.style.borderColor = 'var(--color-red)';
      iconContainer.className = 'scan-result-status-icon badge-danger';
      iconContainer.innerHTML = `<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
      title.textContent = 'Scan Failed';
      title.style.color = 'var(--color-red)';
    }

    desc.textContent = message;

    if (student) {
      details.style.display = 'flex';
      details.style.borderLeftColor = status === 'success' ? 'var(--success-color)' : 'var(--color-yellow)';
      details.innerHTML = `
        <div><strong>Name:</strong> ${name}</div>
        <div><strong>Email:</strong> ${student.Email || student.email || 'N/A'}</div>
        <div><strong>College:</strong> ${student.College || student.college || 'N/A'}</div>
      `;
    } else {
      details.style.display = 'none';
    }
  }

  // Trigger Google Sheet Synchronization
  async function handleTriggerSync() {
    const eventIdInput = getEl('#sync-event-id');
    const eventId = eventIdInput ? eventIdInput.value : 'TestEvent';
    
    // Console log elements
    const consoleBox = getEl('#sync-console');
    if (consoleBox) consoleBox.textContent = `[${new Date().toLocaleTimeString()}] Triggering sync for event: ${eventId}...\n`;

    const triggerBtn = getEl('#btn-trigger-sync');
    triggerBtn.classList.add('btn-disabled');
    triggerBtn.textContent = 'Synchronizing...';

    // Prepare body
    const bodyData = { eventId };
    
    // Check if we are doing mock synchronization
    const mockCheck = getEl('#sync-mock-toggle');
    if (mockCheck && mockCheck.checked) {
      // Normalize to lowercase keys expected by the backend sheet-sync service
      bodyData.mockRows = state.mockRows.map(row => ({
        name: row.Name || '',
        email: row.Email || '',
        phone: row.Phone || '',
        topic: row.Topic || '',
        college: row.College || ''
      }));
      logConsole(consoleBox, `Injecting ${state.mockRows.length} offline testing mock rows.\n`);
    }

    try {
      let syncResult = null;
      if (state.mockMode) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        syncResult = {
          message: 'Synchronization processed successfully.',
          testToken: `mock-qr-token-for-${eventId}-student-${Math.floor(Math.random() * 1000)}`,
          addedCount: bodyData.mockRows ? bodyData.mockRows.length : 12
        };
        if (!bodyData.mockRows) {
          syncResult.syncedRows = [
            { Name: 'Alice Green', Email: 'alice@example.com', Phone: '5551234567', College: 'Green University', Topic: 'Machine Learning Basics', Token: 'mock-token-alice' },
            { Name: 'Bob Brown', Email: 'bob@example.com', Phone: '5557654321', College: 'Brown College', Topic: 'Cloud Computing', Token: 'mock-token-bob-duplicate' },
            { Name: 'Charlie White', Email: 'charlie@example.com', Phone: '5559998888', College: 'White Academy', Topic: 'Cybersecurity 101', Token: 'mock-token-charlie-invalid' }
          ];
        } else {
          // Map mockRows to include generated mock tokens
          syncResult.syncedRows = bodyData.mockRows.map((r, i) => ({
            ...r,
            Token: `mock-token-${r.Name.toLowerCase().replace(/\s+/g, '-') || 'student'}-${i}`
          }));
        }
      } else {
        const response = await fetch(`${state.baseUrl}/sync/sheet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify(bodyData)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Synchronization request failed.');
        }
        syncResult = await response.json();
      }

      logConsole(consoleBox, `Success! ${syncResult.message}\n`);
      if (syncResult.addedCount !== undefined) {
        logConsole(consoleBox, `Rows Sync Count: ${syncResult.addedCount}\n`);
      }

      if (syncResult.syncedRows && syncResult.syncedRows.length > 0) {
        state.mockRows = syncResult.syncedRows;
        state.syncPage = 1;
        renderMockRowsEditor();
        logConsole(consoleBox, `Loaded ${syncResult.syncedRows.length} registration records into builder.\n`);
      }
      
      if (syncResult.testToken) {
        logConsole(consoleBox, `Test QR Token Received: ${syncResult.testToken}\n`);
        
        // Render helper button to auto-copy testToken to manual scanner
        const testTokenDiv = document.createElement('div');
        testTokenDiv.style.marginTop = '12px';
        testTokenDiv.innerHTML = `
          <button class="btn btn-yellow" id="btn-quick-scan-test" style="padding: 6px 12px; font-size: 12px; width: auto;">
            Quick Fill Scan Token
          </button>
        `;
        consoleBox.appendChild(testTokenDiv);
        
        document.getElementById('btn-quick-scan-test').addEventListener('click', () => {
          // Fill input token and switch tab
          localStorage.setItem('tams_qr_token', syncResult.testToken);
          switchTab('scanner');
          const tokenInput = getEl('#manual-token-input');
          if (tokenInput) {
            tokenInput.value = syncResult.testToken;
            // Highlight it
            tokenInput.focus();
            showToast('Token Copied', 'Mock test token filled into scanning field.', 'success');
          }
        });
      }

      showToast('Sync Succeeded', 'Sheet data sync completed.', 'success');

    } catch (err) {
      logConsole(consoleBox, `[ERROR] Sync failed: ${err.message}\n`);
      showToast('Sync Failed', err.message, 'error');
    } finally {
      triggerBtn.classList.remove('btn-disabled');
      triggerBtn.textContent = 'Trigger Sheet Sync';
    }
  }

  function logConsole(box, text) {
    if (!box) return;
    box.appendChild(document.createTextNode(text));
    box.scrollTop = box.scrollHeight;
  }

  // ==========================================================================
  // SCANNER MANAGEMENT (Html5Qrcode wrapper)
  // ==========================================================================
  function startScanner() {
    const viewport = getEl('#qr-video-reader');
    const placeholder = getEl('#camera-placeholder');
    const select = getEl('#camera-select');
    const hud = getEl('#scanner-hud');

    if (!viewport) return;

    // Show hud and viewport, hide placeholder
    viewport.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (hud) {
      hud.style.display = 'block';
      hud.className = 'scanner-hud scanning';
    }

    // Initialize list of cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        // Build camera options
        if (select) {
          select.innerHTML = devices.map(d => `<option value="${d.id}">${d.label || 'Camera ' + d.id}</option>`).join('');
          select.style.display = 'block';
        }

        const selectedCameraId = devices[0].id;
        
        // Start streaming
        if (state.scanner) {
          state.scanner.stop().then(() => startScannerWithDevice(selectedCameraId));
        } else {
          startScannerWithDevice(selectedCameraId);
        }
      } else {
        showToast('No Camera Found', 'Webcam was not detected. Please use manual entry.', 'error');
        stopScanner();
      }
    }).catch(err => {
      showToast('Camera Permission Denied', 'Unable to access cameras: ' + err.message, 'error');
      stopScanner();
    });
  }

  function startScannerWithDevice(cameraId) {
    const html5QrCode = new Html5Qrcode('qr-video-reader');
    state.scanner = html5QrCode;

    html5QrCode.start(
      cameraId,
      {
        fps: 10,
        qrbox: 200
      },
      qrCodeMessage => {
        // Trigger scan processor
        processScan(qrCodeMessage);
      },
      errorMessage => {
        // Verbose error logging omitted for performance
      }
    ).catch(err => {
      showToast('Scanner Start Error', err.message, 'error');
    });
  }

  function stopScanner() {
    const viewport = getEl('#qr-video-reader');
    const placeholder = getEl('#camera-placeholder');
    const select = getEl('#camera-select');
    const hud = getEl('#scanner-hud');

    if (viewport) viewport.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (select) select.style.display = 'none';
    if (hud) hud.style.display = 'none';

    if (state.scanner && state.scanner.isScanning) {
      state.scanner.stop().then(() => {
        state.scanner = null;
      }).catch(() => {
        state.scanner = null;
      });
    }
  }

  // ==========================================================================
  // EVENT LISTENERS AND RENDERS
  // ==========================================================================
  function setupEventListeners() {
    // 1. Authentication Handlers
    const emailForm = getEl('#auth-email-form');
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = getEl('#admin-email-input');
        handleSendOtp(emailInput ? emailInput.value : '');
      });
    }

    const otpForm = getEl('#auth-otp-form');
    if (otpForm) {
      otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleVerifyOtp();
      });
    }

    const switchBack = getEl('#auth-switch-back');
    if (switchBack) {
      switchBack.addEventListener('click', () => {
        getEl('#auth-step-otp').classList.remove('active');
        getEl('#auth-step-email').classList.add('active');
        // Clear inputs
        getAllEl('.otp-input').forEach(i => i.value = '');
      });
    }

    // OTP Inputs Auto-Tab navigation
    const otpFields = getAllEl('.otp-input');
    otpFields.forEach((field, index) => {
      field.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpFields.length - 1) {
          otpFields[index + 1].focus();
        }
      });
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
          otpFields[index - 1].focus();
        }
      });
    });

    // 2. Sidebar Navigation Click Listeners
    getAllEl('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tabId = item.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
      });
    });

    // Dashboard log search event listener
    const dashboardSearchInput = getEl('#dashboard-search-input');
    if (dashboardSearchInput) {
      dashboardSearchInput.addEventListener('input', (e) => {
        state.dashboardSearchQuery = e.target.value;
        state.dashboardPage = 1;
        renderLogs();
      });
    }

    // Dashboard Pagination Buttons Click Listeners
    const btnDashboardPrev = getEl('#btn-dashboard-prev');
    if (btnDashboardPrev) {
      btnDashboardPrev.addEventListener('click', () => {
        if (state.dashboardPage > 1) {
          state.dashboardPage--;
          renderLogs();
        }
      });
    }

    const btnDashboardNext = getEl('#btn-dashboard-next');
    if (btnDashboardNext) {
      btnDashboardNext.addEventListener('click', () => {
        state.dashboardPage++;
        renderLogs();
      });
    }

    // Logout Click
    const logoutBtn = getEl('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        state.token = '';
        state.adminEmail = '';
        localStorage.removeItem('tams_jwt_token');
        localStorage.removeItem('tams_admin_email');
        stopScanner();
        showLogin();
        showToast('Logged Out', 'Successfully logged out of the session.', 'info');
      });
    }

    // 3. QR Scanner View Controls
    const checkpointSelect = getEl('#checkpoint-select');
    if (checkpointSelect) {
      checkpointSelect.addEventListener('change', (e) => {
        state.activeCheckpoint = e.target.value;
        showToast('Checkpoint Changed', `Active checkpoint set to ${state.activeCheckpoint}`, 'success');
      });
    }

    // Manual Scan Submit
    const manualScanForm = getEl('#manual-scan-form');
    if (manualScanForm) {
      manualScanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tokenInput = getEl('#manual-token-input');
        if (tokenInput && tokenInput.value) {
          processScan(tokenInput.value);
          tokenInput.value = '';
        } else {
          showToast('Validation Error', 'Please enter a valid QR token barcode.', 'error');
        }
      });
    }

    // Camera Choice selector change
    const cameraSelect = getEl('#camera-select');
    if (cameraSelect) {
      cameraSelect.addEventListener('change', (e) => {
        if (state.scanner) {
          startScannerWithDevice(e.target.value);
        }
      });
    }

    // 4. Data Sync View Controls
    const syncForm = getEl('#sync-form');
    if (syncForm) {
      syncForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleTriggerSync();
      });
    }

    const addRowBtn = getEl('#btn-add-mock-row');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        state.mockRows.push({ Name: '', Email: '', Phone: '', College: '', Topic: '', Workshop: '', Token: '' });
        // Automatically go to the last page so user can see and fill the new row
        const totalPages = Math.max(1, Math.ceil(state.mockRows.length / state.syncPageSize));
        state.syncPage = totalPages;
        renderMockRowsEditor();
      });
    }

    // Search bar event listener
    const searchInput = getEl('#sync-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.syncPage = 1;
        renderMockRowsEditor();
      });
    }

    // Sync Pagination Buttons Click Listeners
    const btnSyncPrev = getEl('#btn-sync-prev');
    if (btnSyncPrev) {
      btnSyncPrev.addEventListener('click', () => {
        if (state.syncPage > 1) {
          state.syncPage--;
          renderMockRowsEditor();
        }
      });
    }

    const btnSyncNext = getEl('#btn-sync-next');
    if (btnSyncNext) {
      btnSyncNext.addEventListener('click', () => {
        state.syncPage++;
        renderMockRowsEditor();
      });
    }

    // 5. Settings Tab Handlers
    const saveSettingsBtn = getEl('#btn-save-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        const mockToggle = getEl('#mock-mode-toggle');
        if (mockToggle) state.mockMode = mockToggle.checked;

        updateConnectionStatus(state.mockMode ? 'mock' : (state.isBackendOnline ? 'online' : 'offline'));
        showToast('Settings Saved', 'Configuration updated successfully.', 'success');
      });
    }
  }

  // Render mock rows in spreadsheet-style editor
  function renderMockRowsEditor() {
    const tableBody = getEl('#mock-rows-tbody');
    if (!tableBody) return;

    // Filter rows based on search query
    const query = (state.searchQuery || '').trim().toLowerCase();
    const filteredRows = state.mockRows.filter(row => {
      if (!query) return true;
      const name = (row.Name || '').toLowerCase();
      const email = (row.Email || '').toLowerCase();
      const phone = (row.Phone || '').toLowerCase();
      const college = (row.College || '').toLowerCase();
      const topic = (row.Topic || '').toLowerCase();
      const workshop = (row.Workshop || row.workshop || '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query) || college.includes(query) || topic.includes(query) || workshop.includes(query);
    });

    // Pagination calculations
    const totalItems = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.syncPageSize));

    // Clamp current page
    if (state.syncPage > totalPages) {
      state.syncPage = totalPages;
    }
    if (state.syncPage < 1) {
      state.syncPage = 1;
    }

    const startIndex = (state.syncPage - 1) * state.syncPageSize;
    const endIndex = Math.min(startIndex + state.syncPageSize, totalItems);
    const paginatedRows = filteredRows.slice(startIndex, endIndex);

    // Update Pagination UI Info & Buttons
    const infoEl = getEl('#sync-pagination-info');
    if (infoEl) {
      infoEl.textContent = `Page ${state.syncPage} of ${totalPages}`;
    }
    const prevBtn = getEl('#btn-sync-prev');
    if (prevBtn) {
      prevBtn.disabled = state.syncPage <= 1;
    }
    const nextBtn = getEl('#btn-sync-next');
    if (nextBtn) {
      nextBtn.disabled = state.syncPage >= totalPages;
    }

    if (paginatedRows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--color-text-muted); padding: 20px;">
            ${query ? 'No matching rows found.' : 'No mock rows defined. Click \'Add Row\' to insert one.'}
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = paginatedRows.map((row) => {
      const originalIndex = state.mockRows.indexOf(row);
      const rowToken = row.Token || row.token || '';
      return `
        <tr data-index="${originalIndex}">
          <td><input type="text" class="mock-input cell-name" value="${row.Name}" placeholder="John Doe"></td>
          <td><input type="email" class="mock-input cell-email" value="${row.Email}" placeholder="john@example.com"></td>
          <td><input type="text" class="mock-input cell-phone" value="${row.Phone}" placeholder="1234567890"></td>
          <td><input type="text" class="mock-input cell-workshop" value="${row.Workshop || ''}" placeholder="TestEvent"></td>
          <td><input type="text" class="mock-input cell-college" value="${row.College}" placeholder="City College"></td>
          <td><input type="text" class="mock-input cell-topic" value="${row.Topic || ''}" placeholder="e.g. React, ML, Cloud"></td>
          <td>
            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
              ${rowToken ? `
                <button type="button" class="btn-icon-only btn-scan-row" data-token="${rowToken}" title="Copy Student Token for Scanning" style="border-color: var(--color-yellow-glow); color: var(--color-yellow);">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                </button>
              ` : ''}
              <button type="button" class="btn-icon-only btn-delete-row" data-index="${originalIndex}">&times;</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind event inputs listener to update state in real-time
    getAllEl('.mock-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        const index = parseInt(tr.getAttribute('data-index'));
        
        if (e.target.classList.contains('cell-name')) state.mockRows[index].Name = e.target.value;
        if (e.target.classList.contains('cell-email')) state.mockRows[index].Email = e.target.value;
        if (e.target.classList.contains('cell-phone')) state.mockRows[index].Phone = e.target.value;
        if (e.target.classList.contains('cell-workshop')) state.mockRows[index].Workshop = e.target.value;
        if (e.target.classList.contains('cell-college')) state.mockRows[index].College = e.target.value;
        if (e.target.classList.contains('cell-topic')) state.mockRows[index].Topic = e.target.value;
      });
    });

    // Bind quick scan buttons
    getAllEl('.btn-scan-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const token = btn.closest('button').getAttribute('data-token');
        if (token) {
          localStorage.setItem('tams_qr_token', token);
          switchTab('scanner');
          const tokenInput = getEl('#manual-token-input');
          if (tokenInput) {
            tokenInput.value = token;
            tokenInput.focus();
            showToast('Token Copied', 'Student QR token filled into manual scanning field.', 'success');
          }
        }
      });
    });

    // Bind row delete buttons
    getAllEl('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.getAttribute('data-index'));
        state.mockRows.splice(index, 1);
        renderMockRowsEditor();
      });
    });
  }

  // Run initial loading
  window.addEventListener('DOMContentLoaded', () => {
    init();
  });

  // Expose safety namespace
  window.TAMSAdminPanel = {
    state,
    init,
    showToast,
    checkBackendHealth,
    processScan,
    switchTab
  };

})();
