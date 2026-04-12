// =========================================================
//  admin-dashboard.js — Role-aware admin SPA module
//  Wrapped in IIFE to avoid conflict with dashboard.js globals.
//  Exposed: window.initAdminDashboard, window.approveClaim, window.rejectClaim
// =========================================================

(function () {

  var _adReports  = [];
  var _adClaims   = [];
  var _adCategory = '';
  var _adStatus   = '';
  var _adInitialized = false;
  var ADMIN_CACHE_KEY = 'lf_admin_reports_cache_v2';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    var parts = String(dateString).split('-');
    if (parts.length === 3) return parts[1] + '-' + parts[2] + '-' + parts[0];
    return String(dateString);
  }

  function showDetailModal(html) {
    var body = document.getElementById('detailBody');
    var modal = document.getElementById('detailModal');
    if (body) body.innerHTML = html;
    if (modal) modal.classList.add('show');
  }

  function hideDetailModal() {
    var modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('show');
  }

  function wireFilters() {
    var searchInput = document.getElementById('globalSearch');
    var clearBtn    = document.getElementById('searchClearBtn');
    if (searchInput) {
      var fresh = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(fresh, searchInput);
      fresh.addEventListener('input', function () {
        if (clearBtn) clearBtn.style.display = fresh.value ? 'flex' : 'none';
        renderAdminCards();
      });
    }
    document.querySelectorAll('.chip[data-category]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.chip[data-category]').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        _adCategory = chip.dataset.category;
        renderAdminCards();
      });
    });
    document.querySelectorAll('.status-tab[data-status]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.status-tab[data-status]').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        _adStatus = tab.dataset.status;
        renderAdminCards();
      });
    });
  }

  function updateStats(reports) {
    var total   = reports.length;
    var claimed = reports.filter(function (r) { return (r.claimStatus || '').toLowerCase() === 'claimed'; }).length;
    var pending = reports.filter(function (r) { return (r.claimStatus || '').toLowerCase() !== 'claimed'; }).length;
    var nums = document.querySelectorAll('.stat-number');
    if (nums.length >= 3) { nums[0].textContent = total; nums[1].textContent = claimed; nums[2].textContent = pending; }
  }

  function showSkeletonCards() {
    var grid = document.getElementById('reportCards');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 6 }).map(function () {
      return '<div class="rc-card rc-skeleton"><div class="rc-img-wrap skel-block"></div><div class="rc-body"><div class="skel-line skel-title"></div><div class="skel-line skel-meta"></div></div></div>';
    }).join('');
  }

  function getPendingClaim(reportId) {
    return _adClaims.find(function (c) {
      return String(c.report_id) === String(reportId) && (c.status || '').toLowerCase() === 'pending';
    }) || null;
  }

  function approveClaim(claimId) {
    fetch(BASE_URL + '/claims/' + claimId, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    .then(function (res) { return res.ok ? res.json() : res.json().then(function (e) { throw e; }); })
    .then(function () {
      localStorage.removeItem(ADMIN_CACHE_KEY);
      if (typeof showSuccessToast === 'function') showSuccessToast('Claim approved.');
      hideDetailModal(); loadData();
    })
    .catch(function (e) { if (typeof showErrorToast === 'function') showErrorToast((e && e.error) || 'Approval failed.'); });
  }

  function rejectClaim(claimId) {
    fetch(BASE_URL + '/claims/' + claimId, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    .then(function (res) { return res.ok ? res.json() : res.json().then(function (e) { throw e; }); })
    .then(function () {
      localStorage.removeItem(ADMIN_CACHE_KEY);
      if (typeof showSuccessToast === 'function') showSuccessToast('Claim rejected.');
      hideDetailModal(); loadData();
    })
    .catch(function (e) { if (typeof showErrorToast === 'function') showErrorToast((e && e.error) || 'Rejection failed.'); });
  }

  function renderAdminCards() {
    var searchEl  = document.getElementById('globalSearch');
    var searchVal = searchEl ? searchEl.value.trim().toLowerCase() : '';
    var filtered  = _adReports.filter(function (r) {
      var ms = !searchVal || (r.itemName || '').toLowerCase().includes(searchVal) || (r.location || '').toLowerCase().includes(searchVal);
      var mc = !_adCategory || (r.category || '').toLowerCase() === _adCategory.toLowerCase();
      var mt = !_adStatus   || (r.claimStatus || '').toLowerCase() === _adStatus.toLowerCase();
      return ms && mc && mt;
    });
    var grid = document.getElementById('reportCards');
    if (!grid) return;
    grid.innerHTML = '';
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="rc-empty"><i class="fas fa-box-open"></i><p>No reports found</p></div>';
      return;
    }
    filtered.forEach(function (report) {
      var isClaimed   = (report.claimStatus || '').toLowerCase() === 'claimed';
      var statusClass = isClaimed ? 'claimed' : 'pending';
      var statusLabel = isClaimed ? 'Claimed' : 'Pending';
      var imgSrc      = report.imageUrl ? (report.imageUrl.startsWith('http') ? report.imageUrl : BASE_URL + report.imageUrl) : '';
      var pClaim      = getPendingClaim(report.id);
      var card        = document.createElement('div');
      card.className  = 'rc-card';
      card.innerHTML  =
        '<div class="rc-img-wrap">' +
          '<div class="rc-img-placeholder"><i class="fas fa-image"></i><span>No image</span></div>' +
          (imgSrc ? '<img class="rc-img" src="' + escapeHtml(imgSrc) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '<span class="rc-badge rc-badge--' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
          (pClaim ? '<span class="rc-badge-claim">Claim pending</span>' : '') +
        '</div>' +
        '<div class="rc-body">' +
          '<div class="rc-title">' + escapeHtml(report.itemName || 'Unknown Item') + '</div>' +
          '<div class="rc-meta"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(report.location || 'N/A') + '</div>' +
          '<div class="rc-meta"><i class="fas fa-calendar-alt"></i> ' + escapeHtml(formatDate(report.dateFound)) + '</div>' +
        '</div>' +
        (pClaim ?
          '<div class="rc-admin-actions">' +
            '<button class="rc-admin-btn rc-admin-btn--approve" onclick="event.stopPropagation();approveClaim(' + pClaim.id + ')"><i class="fas fa-check"></i> Approve</button>' +
            '<button class="rc-admin-btn rc-admin-btn--reject" onclick="event.stopPropagation();rejectClaim(' + pClaim.id + ')"><i class="fas fa-times"></i> Reject</button>' +
          '</div>' : '');
      card.addEventListener('click', function () { openAdminModal(report, pClaim, imgSrc, statusClass, statusLabel); });
      grid.appendChild(card);
    });
  }

  function openAdminModal(report, pClaim, imgSrc, statusClass, statusLabel) {
    var imgHtml   = imgSrc ? '<img src="' + imgSrc + '" alt="Item" style="width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin-bottom:16px;border:1px solid #e5e7eb;" onerror="this.style.display=\'none\'">' : '';
    var claimHtml = pClaim
      ? '<div class="detail-row"><i class="fas fa-user"></i><strong>Claimant:</strong>&nbsp;<span>' + escapeHtml(pClaim.student_email || pClaim.studentEmail || 'N/A') + '</span></div>' +
        '<div class="detail-row"><i class="fas fa-comment-alt"></i><strong>Claim note:</strong>&nbsp;<span>' + escapeHtml(pClaim.description || '—') + '</span></div>'
      : '';
    var actionsHtml = pClaim
      ? '<div class="modal-actions"><button class="print-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>' +
        '<button class="claim-btn" style="background:#16a34a;" onclick="approveClaim(' + pClaim.id + ')"><i class="fas fa-check"></i> Approve</button>' +
        '<button class="claim-btn" style="background:#dc2626;" onclick="rejectClaim(' + pClaim.id + ')"><i class="fas fa-times"></i> Reject</button>' +
        '<button class="back-btn" onclick="hideDetailModal()"><i class="fa-solid fa-arrow-left"></i> Back</button></div>'
      : '<div class="modal-actions"><button class="print-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button><button class="back-btn" onclick="hideDetailModal()"><i class="fa-solid fa-arrow-left"></i> Back</button></div>';
    showDetailModal(
      '<h2>Report Details</h2>' + imgHtml +
      '<div class="detail-row"><i class="fas fa-box"></i><strong>Item:</strong>&nbsp;<span>' + escapeHtml(report.itemName || 'N/A') + '</span></div>' +
      '<div class="detail-row"><i class="fas fa-tag"></i><strong>Category:</strong>&nbsp;<span>' + escapeHtml(report.category || 'N/A') + '</span></div>' +
      '<div class="detail-row"><i class="fas fa-map-marker-alt"></i><strong>Location:</strong>&nbsp;<span>' + escapeHtml(report.location || 'N/A') + '</span></div>' +
      '<div class="detail-row"><i class="fas fa-calendar"></i><strong>Date:</strong>&nbsp;<span>' + escapeHtml(report.dateFound || 'N/A') + '</span></div>' +
      '<div class="detail-row"><i class="fas fa-clock"></i><strong>Status:</strong>&nbsp;<span class="status-badge status-' + statusClass + '">' + escapeHtml(statusLabel) + '</span></div>' +
      '<div class="detail-row"><i class="fas fa-align-left"></i><strong>Description:</strong>&nbsp;<span>' + escapeHtml(report.description || 'N/A') + '</span></div>' +
      claimHtml + actionsHtml
    );
  }

  function loadData() {
    var raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (raw) {
      try { _adReports = JSON.parse(raw); updateStats(_adReports); renderAdminCards(); }
      catch (_e) { localStorage.removeItem(ADMIN_CACHE_KEY); }
    } else { showSkeletonCards(); }

    fetch(BASE_URL + '/reports')
      .then(function (res) {
        if (!res.ok) throw new Error('Server error (' + res.status + ')');
        return res.json();
      })
      .then(function (reports) {
        _adReports = reports || [];
        updateStats(_adReports);
        renderAdminCards();
        localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(_adReports));

        return fetch(BASE_URL + '/claims')
          .then(function (cRes) { return cRes.ok ? cRes.json() : []; })
          .then(function (claims) {
            _adClaims = Array.isArray(claims) ? claims : [];
            renderAdminCards();
          })
          .catch(function (claimsErr) {
            console.warn('[admin-dashboard] claims fetch failed, continuing with reports only:', claimsErr);
            _adClaims = [];
          });
      })
      .catch(function (err) {
        console.error('[admin-dashboard] loadData:', err);
        if (!raw) {
          var grid = document.getElementById('reportCards');
          if (grid) grid.innerHTML = '<div class="rc-empty"><i class="fas fa-wifi" style="color:#d1d5db;"></i><p>Could not load reports.</p></div>';
        }
      });
  }

  function initAdminDashboard() {
    window.clearSearch = function () {
      var inp = document.getElementById('globalSearch');
      var btn = document.getElementById('searchClearBtn');
      if (inp) { inp.value = ''; inp.focus(); }
      if (btn) btn.style.display = 'none';
      renderAdminCards();
    };

    if (_adInitialized) { loadData(); return; }
    _adInitialized = true;
    wireFilters();
    loadData();

    var closeBtn    = document.getElementById('closeDetailBtn');
    var detailModal = document.getElementById('detailModal');
    if (closeBtn && !closeBtn._adBound) {
      closeBtn._adBound = true;
      closeBtn.addEventListener('click', hideDetailModal);
    }
    if (detailModal && !detailModal._adBound) {
      detailModal._adBound = true;
      detailModal.addEventListener('click', function (e) { if (e.target === detailModal) hideDetailModal(); });
    }
  }

  window.initAdminDashboard = initAdminDashboard;
  window.approveClaim       = approveClaim;
  window.rejectClaim        = rejectClaim;

  if (typeof window.registerPage === 'function') {
    window.registerPage('dashboard', initAdminDashboard);
  } else {
    document.addEventListener('DOMContentLoaded', initAdminDashboard);
  }

})();
