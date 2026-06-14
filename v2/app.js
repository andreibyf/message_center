/**
 * NCCI Message Center v2 — Inbox Split-Pane Logic
 */
(function () {
    'use strict';

    let inquiries = [...MOCK_INQUIRIES];
    let filtered = [];
    let activeId = null;
    let activeFilter = 'all';
    let searchQuery = '';
    let sortMode = 'date_desc';
    let filterState = '';
    let filterYear = '';
    let filterAge = '';

    const $ = id => document.getElementById(id);
    const $list = $('listScroll');
    const $empty = $('listEmpty');
    const $placeholder = $('detailPlaceholder');
    const $detail = $('detailContent');
    const $thread = $('thread');
    const $threadScroll = $('threadScroll');
    const $toasts = $('toastWrap');

    function init() {
        populateFilters();
        bindTabs();
        bindSearch();
        bindSort();
        bindFilters();
        bindSend();
        bindDivider();
        refresh();
    }

    /* ─── Populate filter dropdowns ─── */
    function populateFilters() {
        const states = [...new Set(inquiries.map(i => i.state))].sort();
        const years = [...new Set(inquiries.map(i => i.policyYear))].sort((a, b) => b - a);
        const $fs = $('filterState');
        const $fy = $('filterYear');
        states.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; $fs.appendChild(o); });
        years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; $fy.appendChild(o); });
    }

    /* ─── Filter change handlers ─── */
    function bindFilters() {
        $('filterState').addEventListener('change', e => { filterState = e.target.value; refresh(); });
        $('filterYear').addEventListener('change', e => { filterYear = e.target.value; refresh(); });
        $('filterAge').addEventListener('change', e => { filterAge = e.target.value; refresh(); });
    }

    /* ─── Tabs ─── */
    function bindTabs() {
        document.querySelectorAll('.tab[data-filter]').forEach(t => {
            t.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
                t.classList.add('active');
                activeFilter = t.dataset.filter;
                refresh();
            });
        });
    }

    /* ─── Search ─── */
    function bindSearch() {
        $('searchInput').addEventListener('input', debounce(e => {
            searchQuery = e.target.value.trim().toLowerCase();
            refresh();
        }, 180));
    }

    /* ─── Sort ─── */
    function bindSort() {
        $('sortSelect').addEventListener('change', e => { sortMode = e.target.value; refresh(); });
    }

    /* ─── Send ─── */
    function bindSend() {
        $('sendBtn').addEventListener('click', () => {
            const text = $('replyText').value.trim();
            if (!text || !activeId) return toast('Enter a response first.');
            const inq = inquiries.find(i => i.id === activeId);
            if (!inq) return;
            inq.responses.push({
                id: 'R-' + Date.now(),
                author: 'Carrier Representative',
                date: new Date().toISOString(),
                message: text
            });
            const newStatus = $('statusSelect').value;
            if (newStatus) inq.status = newStatus;
            $('replyText').value = '';
            $('statusSelect').value = '';
            renderDetail(inq);
            refresh();
            toast('Response submitted.');
        });
    }

    /* ─── Resizable Divider ─── */
    function bindDivider() {
        const divider = $('paneDivider');
        const listPane = $('listPane');
        let dragging = false, startX, startW;

        divider.addEventListener('mousedown', e => {
            dragging = true; startX = e.clientX; startW = listPane.offsetWidth;
            divider.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const w = Math.max(300, Math.min(600, startW + (e.clientX - startX)));
            listPane.style.width = w + 'px';
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            divider.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });
    }

    /* ─── Refresh ─── */
    function refresh() {
        let res = [...inquiries];
        if (activeFilter !== 'all') res = res.filter(i => i.status === activeFilter);
        if (searchQuery) {
            res = res.filter(i =>
                i.id.toLowerCase().includes(searchQuery) ||
                i.claimNumber.toLowerCase().includes(searchQuery) ||
                i.policyNumber.toLowerCase().includes(searchQuery) ||
                i.analyst.toLowerCase().includes(searchQuery) ||
                i.subject.toLowerCase().includes(searchQuery) ||
                i.state.toLowerCase().includes(searchQuery)
            );
        }
        if (filterState) res = res.filter(i => i.state === filterState);
        if (filterYear) res = res.filter(i => String(i.policyYear) === filterYear);
        if (filterAge) res = res.filter(i => i.ageDays <= parseInt(filterAge));
        if (sortMode === 'date_desc') res.sort((a, b) => new Date(b.originDate) - new Date(a.originDate));
        else if (sortMode === 'date_asc') res.sort((a, b) => new Date(a.originDate) - new Date(b.originDate));
        else if (sortMode === 'age_desc') res.sort((a, b) => b.ageDays - a.ageDays);
        filtered = res;
        renderList();
        updateCounts();
    }

    /* ─── Render List ─── */
    function renderList() {
        if (filtered.length === 0) {
            $list.innerHTML = '';
            $empty.classList.remove('hidden');
            return;
        }
        $empty.classList.add('hidden');
        $list.innerHTML = filtered.map(i => {
            const ageClass = i.ageDays > 60 ? 'crit' : i.ageDays > 30 ? 'warn' : '';
            const isActive = i.id === activeId ? ' active' : '';
            const hasNoResp = i.responses.length === 0 && i.status === 'open';
            return `<div class="inq-card${isActive}" data-id="${i.id}">
                ${hasNoResp ? '<span class="inq-card-unread"></span>' : ''}
                <div class="inq-card-top">
                    <span class="inq-card-id">${i.id}</span>
                    <span class="inq-card-age ${ageClass}">${i.ageDays}d</span>
                </div>
                <div class="inq-card-subject">${esc(i.subject)}</div>
                <div class="inq-card-meta">
                    <span class="dot ${i.status}"></span>
                    <span>${statusLabel(i.status)}</span>
                    <span>·</span>
                    <span>${i.state}</span>
                    <span>·</span>
                    <span>${i.analyst.split(' ')[1] || i.analyst}</span>
                    <span>·</span>
                    <span>${shortDate(i.originDate)}</span>
                </div>
            </div>`;
        }).join('');
        $list.querySelectorAll('.inq-card').forEach(c => {
            c.addEventListener('click', () => selectInquiry(c.dataset.id));
        });
    }

    /* ─── Select Inquiry ─── */
    function selectInquiry(id) {
        activeId = id;
        const inq = inquiries.find(i => i.id === id);
        if (!inq) return;
        $list.querySelectorAll('.inq-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
        $placeholder.classList.add('hidden');
        $detail.classList.remove('hidden');
        renderDetail(inq);
    }

    /* ─── Render Detail ─── */
    function renderDetail(inq) {
        $('detailId').textContent = inq.id;
        $('detailSubject').textContent = inq.subject;
        const badge = $('detailBadge');
        badge.className = 'badge ' + inq.status;
        badge.textContent = statusLabel(inq.status);
        $('detailAge').textContent = inq.ageDays + ' days old';
        $('detailClaim').textContent = inq.claimNumber;
        $('detailPolicy').textContent = inq.policyNumber;
        $('detailState').textContent = inq.state;
        $('detailYear').textContent = inq.policyYear;
        $('detailAnalyst').textContent = inq.analyst;
        $('detailDate').textContent = longDate(inq.originDate);

        // Build thread
        let html = `<div class="msg ncci">
            <div class="msg-author">NCCI — ${esc(inq.analyst)}</div>
            ${esc(inq.message)}
            <div class="msg-date">${longDate(inq.originDate)}</div>
        </div>`;
        inq.responses.forEach(r => {
            const side = r.author.includes('NCCI') ? 'ncci' : 'carrier';
            html += `<div class="msg ${side}">
                <div class="msg-author">${esc(r.author)}</div>
                ${esc(r.message)}
                <div class="msg-date">${longDate(r.date)}</div>
            </div>`;
        });
        $thread.innerHTML = html;
        // Scroll to bottom
        requestAnimationFrame(() => { $threadScroll.scrollTop = $threadScroll.scrollHeight; });
    }

    /* ─── Counts ─── */
    function updateCounts() {
        const c = s => inquiries.filter(i => i.status === s).length;
        $('tabAll').textContent = inquiries.length;
        $('tabOpen').textContent = c('open');
        $('tabPending').textContent = c('pending_review');
        $('tabReopened').textContent = c('reopened');
        $('tabAccepted').textContent = c('accepted');
        $('tabClosed').textContent = c('closed');
    }

    /* ─── Toast ─── */
    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'toast'; el.textContent = msg;
        $toasts.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2500);
    }

    /* ─── Helpers ─── */
    function statusLabel(s) { return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
    function shortDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    function longDate(iso) { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }

    document.addEventListener('DOMContentLoaded', init);
})();
