/**
 * NCCI Message Center — Application Logic
 * Handles filtering, searching, sorting, detail panel, and responses.
 */

(function () {
    'use strict';

    // ── State ──
    let inquiries = [...MOCK_INQUIRIES];
    let filteredInquiries = [];
    let activeFilter = 'all';
    let activeInquiryId = null;
    let searchQuery = '';
    let filterState = '';
    let filterYear = '';
    let filterAge = '';
    let sortMode = 'date_desc';

    // ── DOM refs ──
    const $body = document.getElementById('inquiryTableBody');
    const $search = document.getElementById('searchInput');
    const $filterState = document.getElementById('filterState');
    const $filterYear = document.getElementById('filterYear');
    const $filterAge = document.getElementById('filterAge');
    const $sortSelect = document.getElementById('sortSelect');
    const $emptyState = document.getElementById('emptyState');
    const $detailPanel = document.getElementById('detailPanel');
    const $overlay = document.getElementById('panelOverlay');
    const $toastContainer = document.getElementById('toastContainer');

    // ── Init ──
    function init() {
        populateFilterOptions();
        bindEvents();
        applyFilters();
    }

    // ── Populate dropdown filters ──
    function populateFilterOptions() {
        const states = [...new Set(inquiries.map(i => i.state))].sort();
        const years = [...new Set(inquiries.map(i => i.policyYear))].sort((a, b) => b - a);
        states.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            $filterState.appendChild(opt);
        });
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y; opt.textContent = y;
            $filterYear.appendChild(opt);
        });
    }

    // ── Events ──
    function bindEvents() {
        // Sidebar nav
        document.querySelectorAll('.nav-item[data-filter]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                el.classList.add('active');
                activeFilter = el.dataset.filter;
                applyFilters();
            });
        });

        // Summary card clicks
        document.querySelectorAll('.summary-card[data-status]').forEach(el => {
            el.addEventListener('click', () => {
                const status = el.dataset.status;
                const navEl = document.querySelector(`.nav-item[data-filter="${status}"]`);
                if (navEl) navEl.click();
            });
        });

        // Search
        $search.addEventListener('input', debounce(() => {
            searchQuery = $search.value.trim().toLowerCase();
            applyFilters();
        }, 200));

        // Filters
        $filterState.addEventListener('change', () => { filterState = $filterState.value; applyFilters(); });
        $filterYear.addEventListener('change', () => { filterYear = $filterYear.value; applyFilters(); });
        $filterAge.addEventListener('change', () => { filterAge = $filterAge.value; applyFilters(); });
        $sortSelect.addEventListener('change', () => { sortMode = $sortSelect.value; applyFilters(); });

        // Panel close
        document.getElementById('panelCloseBtn').addEventListener('click', closePanel);
        $overlay.addEventListener('click', closePanel);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

        // Submit response
        document.getElementById('submitResponseBtn').addEventListener('click', submitResponse);
        document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);

        // Export
        document.getElementById('exportBtn').addEventListener('click', exportCSV);
    }

    // ── Filtering & Sorting ──
    function applyFilters() {
        let results = [...inquiries];

        // Status filter
        if (activeFilter !== 'all') {
            results = results.filter(i => i.status === activeFilter);
        }

        // Search
        if (searchQuery) {
            results = results.filter(i =>
                i.id.toLowerCase().includes(searchQuery) ||
                i.claimNumber.toLowerCase().includes(searchQuery) ||
                i.policyNumber.toLowerCase().includes(searchQuery) ||
                i.analyst.toLowerCase().includes(searchQuery) ||
                i.subject.toLowerCase().includes(searchQuery) ||
                i.state.toLowerCase().includes(searchQuery)
            );
        }

        // State
        if (filterState) results = results.filter(i => i.state === filterState);
        // Year
        if (filterYear) results = results.filter(i => String(i.policyYear) === filterYear);
        // Age
        if (filterAge) results = results.filter(i => i.ageDays <= parseInt(filterAge));

        // Sort
        results = sortInquiries(results, sortMode);

        filteredInquiries = results;
        renderTable();
        updateCounts();
        updateStats();
    }

    function sortInquiries(arr, mode) {
        const copy = [...arr];
        switch (mode) {
            case 'date_desc': return copy.sort((a, b) => new Date(b.originDate) - new Date(a.originDate));
            case 'date_asc': return copy.sort((a, b) => new Date(a.originDate) - new Date(b.originDate));
            case 'age_desc': return copy.sort((a, b) => b.ageDays - a.ageDays);
            case 'age_asc': return copy.sort((a, b) => a.ageDays - b.ageDays);
            case 'id_asc': return copy.sort((a, b) => a.id.localeCompare(b.id));
            case 'id_desc': return copy.sort((a, b) => b.id.localeCompare(a.id));
            default: return copy;
        }
    }

    // ── Render Table ──
    function renderTable() {
        if (filteredInquiries.length === 0) {
            $body.innerHTML = '';
            $emptyState.classList.remove('hidden');
            return;
        }
        $emptyState.classList.add('hidden');

        $body.innerHTML = filteredInquiries.map(inq => {
            const ageClass = inq.ageDays > 60 ? 'critical' : inq.ageDays > 30 ? 'urgent' : '';
            const isActive = inq.id === activeInquiryId ? ' active-row' : '';
            const statusLabel = inq.status.replace('_', ' ');
            return `<tr data-id="${inq.id}" class="${isActive}" title="Click to view details">
                <td class="col-status"><span class="status-dot ${inq.status}" title="${statusLabel}"></span></td>
                <td class="col-id"><strong>${inq.id}</strong></td>
                <td class="col-claim">${inq.claimNumber}</td>
                <td class="col-policy">${inq.policyNumber}</td>
                <td class="col-state">${inq.state}</td>
                <td class="col-year">${inq.policyYear}</td>
                <td class="col-analyst">${inq.analyst}</td>
                <td class="col-date">${formatDate(inq.originDate)}</td>
                <td class="col-age"><span class="age-cell ${ageClass}">${inq.ageDays}d</span></td>
                <td class="col-preview">${truncate(inq.subject, 45)}</td>
            </tr>`;
        }).join('');

        // Row click handlers
        $body.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', () => openPanel(row.dataset.id));
        });
    }

    // ── Counts & Stats ──
    function updateCounts() {
        const all = inquiries;
        const countOf = status => all.filter(i => i.status === status).length;
        setText('countAll', all.length);
        setText('countOpen', countOf('open'));
        setText('countPending', countOf('pending_review'));
        setText('countReopened', countOf('reopened'));
        setText('countAccepted', countOf('accepted'));
        setText('countClosed', countOf('closed'));

        setText('summaryTotal', all.length);
        setText('summaryOpen', countOf('open'));
        setText('summaryPending', countOf('pending_review'));
        setText('summaryReopened', countOf('reopened'));
        setText('summaryAccepted', countOf('accepted'));
        setText('summaryClosed', countOf('closed'));

        // Notification badge — open + reopened
        const needsAction = countOf('open') + countOf('reopened');
        const badge = document.getElementById('notifBadge');
        badge.textContent = needsAction;
        badge.style.display = needsAction > 0 ? 'flex' : 'none';
    }

    function updateStats() {
        const actionable = inquiries.filter(i => i.status !== 'closed' && i.status !== 'accepted');
        if (actionable.length > 0) {
            const avg = Math.round(actionable.reduce((s, i) => s + i.ageDays, 0) / actionable.length);
            setText('statsAvgAge', avg + ' days');
        } else {
            setText('statsAvgAge', '—');
        }
        const urgent = inquiries.filter(i => (i.status === 'open' || i.status === 'reopened') && i.ageDays > 30).length;
        setText('statsUrgent', urgent);
    }

    // ── Detail Panel ──
    function openPanel(id) {
        const inq = inquiries.find(i => i.id === id);
        if (!inq) return;
        activeInquiryId = id;

        // Highlight active row
        $body.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
        const activeRow = $body.querySelector(`tr[data-id="${id}"]`);
        if (activeRow) activeRow.classList.add('active-row');

        // Fill panel
        setText('panelInquiryId', inq.id);
        setText('panelClaim', inq.claimNumber);
        setText('panelPolicy', inq.policyNumber);
        setText('panelState', inq.state);
        setText('panelYear', inq.policyYear);
        setText('panelDate', formatDateLong(inq.originDate));
        setText('panelAnalyst', inq.analyst);
        setText('panelAge', `${inq.ageDays} days old`);

        const badge = document.getElementById('panelStatusBadge');
        badge.className = `status-badge ${inq.status}`;
        badge.textContent = inq.status.replace('_', ' ');

        document.getElementById('panelMessage').textContent = inq.message;

        // Responses
        renderResponses(inq);

        // Clear compose
        document.getElementById('responseTextarea').value = '';
        document.getElementById('actionSelect').value = '';

        // Show panel
        $detailPanel.classList.remove('hidden');
        $overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            $detailPanel.classList.add('visible');
            $overlay.classList.add('visible');
        });
    }

    function closePanel() {
        $detailPanel.classList.remove('visible');
        $overlay.classList.remove('visible');
        setTimeout(() => {
            $detailPanel.classList.add('hidden');
            $overlay.classList.add('hidden');
        }, 350);
        activeInquiryId = null;
        $body.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
    }

    function renderResponses(inq) {
        const container = document.getElementById('responseHistory');
        if (!inq.responses || inq.responses.length === 0) {
            container.innerHTML = '<p class="no-responses">No responses yet.</p>';
            return;
        }
        container.innerHTML = inq.responses.map(r => `
            <div class="response-entry">
                <div class="response-meta">
                    <strong>${r.author}</strong>
                    <span>${formatDateLong(r.date)}</span>
                </div>
                <div class="message-bubble ${r.author.includes('NCCI') ? 'ncci' : 'carrier'}">${escapeHTML(r.message)}</div>
            </div>
        `).join('');
    }

    // ── Submit Response ──
    function submitResponse() {
        const textarea = document.getElementById('responseTextarea');
        const actionSelect = document.getElementById('actionSelect');
        const text = textarea.value.trim();

        if (!text) {
            showToast('Please enter a response message.', 'info');
            textarea.focus();
            return;
        }
        if (!activeInquiryId) return;

        const inq = inquiries.find(i => i.id === activeInquiryId);
        if (!inq) return;

        // Add response
        const resp = {
            id: `RESP-${Date.now()}`,
            author: 'Carrier Representative',
            date: new Date().toISOString(),
            message: text,
        };
        inq.responses.push(resp);

        // Update status if selected
        if (actionSelect.value) {
            inq.status = actionSelect.value;
        }

        // Re-render
        renderResponses(inq);
        applyFilters();

        // Update panel badge
        const badge = document.getElementById('panelStatusBadge');
        badge.className = `status-badge ${inq.status}`;
        badge.textContent = inq.status.replace('_', ' ');

        // Clear
        textarea.value = '';
        actionSelect.value = '';

        showToast('Response submitted successfully.', 'success');
    }

    function saveDraft() {
        const textarea = document.getElementById('responseTextarea');
        if (!textarea.value.trim()) {
            showToast('Nothing to save.', 'info');
            return;
        }
        showToast('Draft saved.', 'success');
    }

    // ── Export CSV ──
    function exportCSV() {
        const headers = ['Inquiry ID','Status','Claim Number','Policy Number','State','Policy Year','Analyst','Origin Date','Age (Days)','Subject'];
        const rows = filteredInquiries.map(i => [
            i.id, i.status, i.claimNumber, i.policyNumber, i.state, i.policyYear,
            i.analyst, formatDate(i.originDate), i.ageDays, `"${i.subject}"`
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ncci_inquiries_${formatDateFile(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${filteredInquiries.length} inquiries.`, 'success');
    }

    // ── Toast ──
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        $toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ── Helpers ──
    function setText(id, val) { document.getElementById(id).textContent = val; }

    function formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateLong(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    }

    function formatDateFile(d) {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }

    function truncate(str, len) {
        return str.length > len ? str.slice(0, len) + '…' : str;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // ── Boot ──
    document.addEventListener('DOMContentLoaded', init);
})();
