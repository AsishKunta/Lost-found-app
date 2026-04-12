// ================================================================
//  router.js — unified SPA router for Student + Admin portal
//
//  Public API (all globals):
//    navigate(page, params?)  — switch to a named section
//    registerPage(name, fn)   — register a page init function
// ================================================================

(function () {

  // ── Page title map ────────────────────────────────────────────
  const PAGE_TITLES = {
    dashboard:      'Dashboard',
    report:         'Report Item',
    claim:          'File a Claim',
    conversations:  'Messages',
    'claim-requests': 'Claim Requests',
  };

  // ── Sidebar definitions per role ─────────────────────────────
  const SIDEBAR_LINKS = {
    student: [
      { page: 'dashboard',     icon: 'fa-tachometer-alt',  label: 'Dashboard'   },
      { page: 'report',        icon: 'fa-bullhorn',         label: 'Report Item' },
      { page: 'claim',         icon: 'fa-hand-holding',     label: 'Claims'      },
      { page: 'conversations', icon: 'fa-comments',         label: 'Messages'    },
    ],
    admin: [
      { page: 'dashboard',     icon: 'fa-tachometer-alt',  label: 'Dashboard'      },
      { page: 'claim-requests',icon: 'fa-clipboard-list',  label: 'Claim Requests' },
      { page: 'conversations', icon: 'fa-comments',         label: 'Messages'       },
    ],
  };

  // ── Page init function registry ──────────────────────────────
  const _initMap = {};

  // ── Public: register a page init function ─────────────────────
  window.registerPage = function (name, fn) {
    _initMap[name] = fn;
  };

  // ── Render role-based sidebar ─────────────────────────────────
  function renderSidebar(role) {
    // Brand subtitle
    var brandSub = document.querySelector('.sidebar-brand p');
    if (brandSub) brandSub.textContent = role === 'admin' ? 'Admin Portal' : 'Student Portal';

    // Nav links
    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    var links = (SIDEBAR_LINKS[role] || SIDEBAR_LINKS.student);
    nav.innerHTML = links.map(function (link) {
      return '<li>' +
        '<a class="sidebar-nav-link" data-page="' + link.page + '"' +
        ' href="#' + link.page + '"' +
        ' onclick="event.preventDefault(); navigate(\'' + link.page + '\');">' +
        '<i class="fas ' + link.icon + '"></i> ' + link.label +
        '</a></li>';
    }).join('');
  }

  // ── Public: navigate to a section ─────────────────────────────
  window.navigate = function (page, params) {
    var role = localStorage.getItem('role') || 'student';

    // Guard: students cannot access admin-only pages
    if (role === 'student' && page === 'claim-requests') page = 'dashboard';
    // Guard: admins cannot access student-only pages
    if (role === 'admin' && (page === 'report' || page === 'claim')) page = 'dashboard';

    if (!PAGE_TITLES[page]) page = 'dashboard';

    // 1. Hide all sections
    document.querySelectorAll('.spa-page').forEach(function (s) {
      s.classList.remove('active');
    });

    // 2. Show target section
    var section = document.getElementById('page-' + page);
    if (section) section.classList.add('active');

    // 3. Update topbar title
    var titleEl = document.getElementById('topbarTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    // 4. Highlight active sidebar link
    document.querySelectorAll('.sidebar-nav-link').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === page);
    });

    // 5. Push history state
    var hash = '#' + page;
    if (location.hash !== hash) {
      history.pushState({ page: page }, '', hash);
    }

    // 6. Call the page's init / refresh function
    var fn = _initMap[page];
    if (fn) fn(params);
  };

  // ── Handle browser back / forward ─────────────────────────────
  window.addEventListener('popstate', function (e) {
    var page = (e.state && e.state.page)
      || (location.hash.slice(1).split('&')[0])
      || 'dashboard';
    navigate(page);
  });

  // ── Register unified role-dispatched pages ────────────────────
  registerPage('dashboard', function (params) {
    var role = localStorage.getItem('role') || 'student';
    if (role === 'admin') {
      if (typeof window.initAdminDashboard === 'function') window.initAdminDashboard(params);
    } else {
      if (typeof window.initStudentDashboard === 'function') window.initStudentDashboard(params);
    }
  });

  registerPage('conversations', function (params) {
    var role = localStorage.getItem('role') || 'student';
    if (role === 'admin') {
      if (typeof window.initAdminMessages === 'function') window.initAdminMessages(params);
    } else {
      if (typeof window.initStudentMessages === 'function') window.initStudentMessages(params);
    }
  });

  // ── Initial navigation on page load ───────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var role = localStorage.getItem('role') || 'student';

    // 1. Render the role-specific sidebar
    renderSidebar(role);

    // 2. Update avatar role label
    var roleLabel = document.getElementById('avatarRoleLabel');
    if (roleLabel) roleLabel.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    // 3. Navigate to hashed page (or default)
    var hash = location.hash.slice(1).split('&')[0] || 'dashboard';
    navigate(hash);
  });

})();
