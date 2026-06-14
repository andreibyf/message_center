/**
 * NCCI Internal Message Center — Application Logic
 * Role-based views, auto-routing, workflow actions, activity timeline.
 */
(function () {
    'use strict';

    let inquiries = [...INTERNAL_INQUIRIES];
    let filtered = [];
    let activeRole = 'validator'; // 'validator' | 'originator'
    let activeFilter = 'all';
    let activeId = null;
    let searchQuery = '';
    let sortMode = 'date_desc';
    let filterDept = '';
    let filterState = '';
    let filterYear = '';

    const $ = id => document.getElementById(id);
    const $body = $('tableBody');
    const $empty = $('emptyState');
    const $panel = $('detailPanel');
    const $overlay = $('overlay');
    const $toasts = $('toastContainer');

    const PIPELINE_STEPS = [
        { key: 'submitted', label: 'Submitted' },
        { key: 'under_review', label: 'Analyst Review' },
        { key: 'sent_to_carrier', label: 'With Carrier' },
        { key: 'carrier_responded', label: 'Carrier Resp.' },
        { key: 'validator_review', label: 'Validator Review' },
        { key: 'awaiting_originator', label: 'Originator Review' },
        { key: 'approved', label: 'Approved' },
        { key: 'closed', label: 'Closed' },
    ];

    function init() {
        populateFilters();
        bindRoleSwitcher();
        bindNav();
        bindSearch();
        bindSort();
        bindFilters();
        bindPanelClose();
        bindPanelTabs();
        bindModal();
        bindNotes();
        bindCarrierReply();
        bindActionRequired();
        refresh();
    }

    // ── Populate dropdown filters ──
    function populateFilters() {
        const states = [...new Set(inquiries.map(i => i.state))].sort();
        const years = [...new Set(inquiries.map(i => i.policyYear))].sort((a, b) => b - a);
        const $fs = $('filterState'), $fy = $('filterYear');
        states.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; $fs.appendChild(o); });
        years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; $fy.appendChild(o); });
        // Modal states & carriers
        const $ns = $('newState'), $nc = $('newCarrier');
        states.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; $ns.appendChild(o); });
        CARRIERS.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; $nc.appendChild(o); });
    }

    // ── Role Switcher ──
    function bindRoleSwitcher() {
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeRole = btn.dataset.role;
                refresh();
                if (activeId) renderActions(inquiries.find(i => i.id === activeId));
            });
        });
    }

    // ── Sidebar Nav ──
    function bindNav() {
        document.querySelectorAll('.nav-item[data-filter]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                el.classList.add('active');
                activeFilter = el.dataset.filter;
                refresh();
            });
        });
    }

    // ── Search ──
    function bindSearch() {
        $('searchInput').addEventListener('input', debounce(e => {
            searchQuery = e.target.value.trim().toLowerCase();
            refresh();
        }, 200));
    }

    // ── Sort ──
    function bindSort() {
        $('sortSelect').addEventListener('change', e => { sortMode = e.target.value; refresh(); });
    }

    // ── Filters ──
    function bindFilters() {
        $('filterDept').addEventListener('change', e => { filterDept = e.target.value; refresh(); });
        $('filterState').addEventListener('change', e => { filterState = e.target.value; refresh(); });
        $('filterYear').addEventListener('change', e => { filterYear = e.target.value; refresh(); });
    }

    // ── Action Required button ──
    function bindActionRequired() {
        $('actionRequiredBtn').addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const el = document.querySelector('.nav-item[data-filter="action_required"]');
            if (el) { el.classList.add('active'); }
            activeFilter = 'action_required';
            refresh();
        });
    }

    // ── Refresh ──
    function refresh() {
        let res = [...inquiries];

        // Status filter
        if (activeFilter === 'action_required') {
            res = res.filter(i => isActionRequired(i));
        } else if (activeFilter !== 'all') {
            res = res.filter(i => i.status === activeFilter);
        }

        // Search
        if (searchQuery) {
            res = res.filter(i =>
                i.id.toLowerCase().includes(searchQuery) ||
                i.claimNumber.toLowerCase().includes(searchQuery) ||
                i.policyNumber.toLowerCase().includes(searchQuery) ||
                i.subject.toLowerCase().includes(searchQuery) ||
                (i.originator.name || '').toLowerCase().includes(searchQuery) ||
                (i.validator?.name || '').toLowerCase().includes(searchQuery) ||
                i.state.toLowerCase().includes(searchQuery) ||
                i.carrier.toLowerCase().includes(searchQuery)
            );
        }

        // Dropdown filters
        if (filterDept) res = res.filter(i => i.originator.dept === filterDept);
        if (filterState) res = res.filter(i => i.state === filterState);
        if (filterYear) res = res.filter(i => String(i.policyYear) === filterYear);

        // Sort
        switch (sortMode) {
            case 'date_desc': res.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)); break;
            case 'date_asc': res.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate)); break;
            case 'age_desc': res.sort((a, b) => b.ageDays - a.ageDays); break;
            case 'sla_desc': res.sort((a, b) => (b.daysWithCarrier || 0) - (a.daysWithCarrier || 0)); break;
        }

        filtered = res;
        renderTable();
        updateCounts();
    }

    // ── Is action required for current role? ──
    function isActionRequired(inq) {
        if (activeRole === 'validator') {
            return ['submitted', 'carrier_responded', 'additional_info', 'approved'].includes(inq.status);
        } else {
            return ['awaiting_originator'].includes(inq.status);
        }
    }

    // ── Render Table ──
    function renderTable() {
        if (filtered.length === 0) { $body.innerHTML = ''; $empty.classList.remove('hidden'); return; }
        $empty.classList.add('hidden');
        $body.innerHTML = filtered.map(inq => {
            const isActive = inq.id === activeId ? ' active-row' : '';
            const ageClass = inq.ageDays > 60 ? 'crit' : inq.ageDays > 30 ? 'warn' : '';
            const slaVal = inq.daysWithCarrier;
            const slaClass = slaVal > 30 ? 'crit' : slaVal > 14 ? 'warn' : '';
            const statusLabel = STATUS_DEFS[inq.status]?.label || inq.status;
            return `<tr data-id="${inq.id}" class="${isActive}" title="${statusLabel}">
                <td class="col-status"><span class="status-dot ${inq.status}"></span></td>
                <td class="col-id"><strong>${inq.id}</strong></td>
                <td class="col-dept"><span class="dept-tag ${inq.originator.dept}">${inq.originator.dept}</span></td>
                <td class="col-claim">${inq.claimNumber}</td>
                <td class="col-state">${inq.state}</td>
                <td class="col-carrier">${truncate(inq.carrier, 18)}</td>
                <td class="col-originator">${inq.originator.name.split(' ')[1]}</td>
                <td class="col-validator">${inq.validator ? inq.validator.name.split(' ')[1] : '—'}</td>
                <td class="col-date">${shortDate(inq.createdDate)}</td>
                <td class="col-age"><span class="age-cell ${ageClass}">${inq.ageDays}d</span></td>
                <td class="col-sla"><span class="sla-cell ${slaClass}">${slaVal != null ? slaVal + 'd' : '—'}</span></td>
                <td class="col-subject">${truncate(inq.subject, 32)}</td>
            </tr>`;
        }).join('');
        $body.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', () => openPanel(row.dataset.id));
        });
    }

    // ── Counts ──
    function updateCounts() {
        const c = s => inquiries.filter(i => i.status === s).length;
        const actionCount = inquiries.filter(i => isActionRequired(i)).length;
        setText('cAll', inquiries.length);
        setText('cAction', actionCount);
        setText('cDraft', c('draft'));
        setText('cSubmitted', c('submitted'));
        setText('cUnderReview', c('under_review'));
        setText('cSentCarrier', c('sent_to_carrier'));
        setText('cCarrierResp', c('carrier_responded'));
        setText('cValidatorRev', c('validator_review'));
        setText('cAwaitOrig', c('awaiting_originator'));
        setText('cAddlInfo', c('additional_info'));
        setText('cApproved', c('approved'));
        setText('cClosed', c('closed'));
        setText('actionBadge', actionCount);
    }

    // ── Open Detail Panel ──
    function openPanel(id) {
        const inq = inquiries.find(i => i.id === id);
        if (!inq) return;
        activeId = id;

        // Highlight row
        $body.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
        const r = $body.querySelector(`tr[data-id="${id}"]`);
        if (r) r.classList.add('active-row');

        // Fill header
        setText('panelId', inq.id);
        $('panelSubject').textContent = inq.subject;
        const badge = $('panelBadge');
        badge.className = 'badge ' + inq.status;
        badge.textContent = STATUS_DEFS[inq.status]?.label || inq.status;
        const deptBadge = $('panelDept');
        deptBadge.className = 'badge dept-badge ' + inq.originator.dept;
        deptBadge.textContent = inq.originator.dept;
        setText('panelAge', inq.ageDays + ' days old');

        // SLA tag
        const slaTag = $('panelSLA');
        if (inq.daysWithCarrier != null) {
            slaTag.classList.remove('hidden');
            const slaClass = inq.daysWithCarrier > 30 ? 'crit' : inq.daysWithCarrier > 14 ? 'warn' : 'ok';
            slaTag.className = 'sla-tag ' + slaClass;
            slaTag.textContent = `⏱ ${inq.daysWithCarrier}d with carrier`;
        } else {
            slaTag.classList.add('hidden');
        }

        // Pipeline
        renderPipeline(inq);

        // Details tab (editable if draft)
        renderDetailsTab(inq);

        // Carrier thread
        renderThread(inq);

        // Notes
        renderNotes(inq);

        // Timeline
        renderTimeline(inq);

        // Actions
        renderActions(inq);

        // Show
        $panel.classList.remove('hidden');
        $overlay.classList.remove('hidden');
        requestAnimationFrame(() => { $panel.classList.add('visible'); $overlay.classList.add('visible'); });

        // Activate first tab
        switchTab('details');
    }

    function closePanel() {
        $panel.classList.remove('visible');
        $overlay.classList.remove('visible');
        setTimeout(() => { $panel.classList.add('hidden'); $overlay.classList.add('hidden'); }, 350);
        activeId = null;
        $body.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
    }

    function bindPanelClose() {
        $('panelClose').addEventListener('click', closePanel);
        $overlay.addEventListener('click', closePanel);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
    }

    // ── Panel Tabs ──
    function bindPanelTabs() {
        document.querySelectorAll('.ptab').forEach(t => {
            t.addEventListener('click', () => switchTab(t.dataset.tab));
        });
    }

    function switchTab(tab) {
        document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === tab));
    }

    // ── Render Details Tab (editable for drafts) ──
    function renderDetailsTab(inq) {
        const tab = $('tabDetails');
        const isDraft = inq.status === 'draft';

        if (isDraft) {
            // Build state options
            const stateOpts = STATES.map(s => `<option value="${s}" ${s === inq.state ? 'selected' : ''}>${s}</option>`).join('');
            // Build carrier options
            const carrierOpts = CARRIERS.map(c => `<option value="${esc(c)}" ${c === inq.carrier ? 'selected' : ''}>${esc(c)}</option>`).join('');
            // Build year options
            const yearOpts = [2026,2025,2024,2023].map(y => `<option value="${y}" ${y === inq.policyYear ? 'selected' : ''}>${y}</option>`).join('');

            tab.innerHTML = `
                <div class="draft-edit-banner">✏️ This inquiry is a draft — all fields are editable.</div>
                <div class="info-grid">
                    <div class="info-item"><label class="info-label" for="eClaim">Claim #</label><input class="form-input compact" id="eClaim" value="${esc(inq.claimNumber)}"></div>
                    <div class="info-item"><label class="info-label" for="ePolicy">Policy #</label><input class="form-input compact" id="ePolicy" value="${esc(inq.policyNumber)}"></div>
                    <div class="info-item"><label class="info-label" for="eState">State</label><select class="filter-select" id="eState">${stateOpts}</select></div>
                    <div class="info-item"><label class="info-label" for="eYear">Policy Year</label><select class="filter-select" id="eYear">${yearOpts}</select></div>
                    <div class="info-item"><label class="info-label" for="eCarrier">Carrier</label><select class="filter-select" id="eCarrier">${carrierOpts}</select></div>
                    <div class="info-item"><span class="info-label">Originator</span><span class="info-value">${esc(inq.originator.name)} (${esc(inq.originator.role)}, ${esc(inq.originator.dept)})</span></div>
                </div>
                <div class="form-group full" style="margin-top:12px">
                    <label class="info-label" for="eSubject">Subject</label>
                    <input class="form-input" id="eSubject" value="${esc(inq.subject)}">
                </div>
                <div class="form-group full" style="margin-top:10px">
                    <label class="info-label" for="eBody">Description</label>
                    <textarea class="form-input" id="eBody" rows="6">${esc(inq.body)}</textarea>
                </div>
            `;
        } else {
            tab.innerHTML = `
                <div class="info-grid">
                    <div class="info-item"><span class="info-label">Claim #</span><span class="info-value">${esc(inq.claimNumber)}</span></div>
                    <div class="info-item"><span class="info-label">Policy #</span><span class="info-value">${esc(inq.policyNumber)}</span></div>
                    <div class="info-item"><span class="info-label">State</span><span class="info-value">${esc(inq.state)}</span></div>
                    <div class="info-item"><span class="info-label">Policy Year</span><span class="info-value">${inq.policyYear}</span></div>
                    <div class="info-item"><span class="info-label">Carrier</span><span class="info-value">${esc(inq.carrier)}</span></div>
                    <div class="info-item"><span class="info-label">Originator</span><span class="info-value">${esc(inq.originator.name)} (${esc(inq.originator.role)}, ${esc(inq.originator.dept)})</span></div>
                    <div class="info-item"><span class="info-label">Analyst</span><span class="info-value">${inq.validator ? esc(inq.validator.name) + ' (' + esc(inq.validator.title) + ')' : 'Unassigned'}</span></div>
                    <div class="info-item"><span class="info-label">Created</span><span class="info-value">${longDate(inq.createdDate)}</span></div>
                </div>
                <h4 class="section-title">Inquiry Description</h4>
                <div class="inquiry-body">${esc(inq.body)}</div>
            `;
        }
    }

    // ── Save Draft Edits ──
    function saveDraftEdits(inq) {
        const eClaim = $('eClaim'), ePolicy = $('ePolicy'), eState = $('eState'),
              eYear = $('eYear'), eCarrier = $('eCarrier'), eSubject = $('eSubject'), eBody = $('eBody');
        if (!eClaim) return; // Not in edit mode
        inq.claimNumber = eClaim.value.trim() || inq.claimNumber;
        inq.policyNumber = ePolicy.value.trim() || inq.policyNumber;
        inq.state = eState.value;
        inq.policyYear = parseInt(eYear.value);
        inq.carrier = eCarrier.value;
        inq.subject = eSubject.value.trim() || inq.subject;
        inq.body = eBody.value.trim() || inq.body;
        // Update header to reflect changes
        $('panelSubject').textContent = inq.subject;
    }

    // ── Pipeline ──
    function renderPipeline(inq) {
        const statusOrder = PIPELINE_STEPS.map(s => s.key);
        let currentIdx = statusOrder.indexOf(inq.status);
        // Resolved internally maps to after under_review
        if (inq.resolvedInternally) currentIdx = Math.max(currentIdx, 2);
        if (currentIdx === -1) currentIdx = 0;

        $('pipeline').innerHTML = PIPELINE_STEPS.map((step, i) => {
            let cls = 'future';
            if (i < currentIdx) cls = 'done';
            else if (i === currentIdx) cls = 'current';
            const arrow = i < PIPELINE_STEPS.length - 1 ? '<span class="pipe-arrow">›</span>' : '';
            return `<span class="pipe-step ${cls}">${step.label}</span>${arrow}`;
        }).join('');
    }

    // ── Carrier Thread ──
    function renderThread(inq) {
        const container = $('carrierThread');
        if (!inq.carrierMessages || inq.carrierMessages.length === 0) {
            container.innerHTML = '<p class="no-messages">No carrier correspondence yet.</p>';
            return;
        }
        container.innerHTML = inq.carrierMessages.map(m => {
            const side = m.from === 'Carrier' ? 'carrier' : 'ncci';
            return `<div class="msg ${side}">
                <div class="msg-author">${esc(m.by)}</div>
                ${esc(m.message)}
                <div class="msg-date">${longDate(m.date)}</div>
            </div>`;
        }).join('');
    }

    // ── Notes ──
    function renderNotes(inq) {
        const container = $('notesList');
        if (!inq.internalNotes || inq.internalNotes.length === 0) {
            container.innerHTML = '<p class="no-notes">No internal notes yet.</p>';
            return;
        }
        container.innerHTML = inq.internalNotes.map(n => `
            <div class="note-card">
                <div class="note-meta"><span>${esc(n.by)}</span><span>${shortDate(n.date)}</span></div>
                <div class="note-text">${esc(n.text)}</div>
            </div>
        `).join('');
    }

    function bindNotes() {
        $('addNoteBtn').addEventListener('click', () => {
            const text = $('noteInput').value.trim();
            if (!text || !activeId) return;
            const inq = inquiries.find(i => i.id === activeId);
            if (!inq) return;
            const author = activeRole === 'validator' ? (inq.validator?.name || 'Data Analyst') : inq.originator.name;
            inq.internalNotes.push({ by: author, date: new Date().toISOString(), text });
            $('noteInput').value = '';
            renderNotes(inq);
            toast('Note added.');
        });
    }

    // ── Carrier Reply ──
    function bindCarrierReply() {
        $('sendToCarrierBtn').addEventListener('click', () => {
            const text = $('carrierReply').value.trim();
            if (!text || !activeId) return;
            const inq = inquiries.find(i => i.id === activeId);
            if (!inq) return;
            inq.carrierMessages.push({ from: 'NCCI', by: inq.validator?.name || 'Data Analyst', date: new Date().toISOString(), message: text });
            if (inq.status !== 'sent_to_carrier') {
                changeStatus(inq, 'sent_to_carrier', 'Sent inquiry to carrier');
                inq.sentToCarrierDate = new Date().toISOString();
                inq.daysWithCarrier = 0;
            }
            $('carrierReply').value = '';
            renderThread(inq);
            refresh();
            openPanel(inq.id);
            toast('Message sent to carrier.');
        });
    }

    // ── Timeline ──
    function renderTimeline(inq) {
        const container = $('timelineList');
        const acts = [...inq.activities].reverse();
        container.innerHTML = acts.map((a, i) => {
            const cls = i === 0 ? 'current' : 'done';
            return `<div class="tl-item ${cls}">
                <div class="tl-action">${statusActionLabel(a.action)}</div>
                <div class="tl-detail">${esc(a.detail)}</div>
                <div class="tl-meta">${esc(a.by)} · ${esc(a.role)} · ${longDate(a.date)}</div>
            </div>`;
        }).join('');
    }

    function statusActionLabel(action) {
        const map = {
            created: '📝 Created', submitted: '📤 Submitted', assigned: '👤 Assigned',
            under_review: '🔍 Under Review', resolved_internally: '✅ Resolved Internally',
            sent_to_carrier: '📨 Sent to Carrier', carrier_responded: '📩 Carrier Responded',
            validator_review: '🔎 Validator Review', awaiting_originator: '📢 Routed to Originator',
            additional_info: '🔄 Additional Info Requested', approved: '✅ Approved', closed: '🔒 Closed',
        };
        return map[action] || action;
    }

    // ── Dynamic Action Buttons ──
    function renderActions(inq) {
        const bar = $('actionBar');
        if (!inq) { bar.innerHTML = ''; return; }

        let html = `<span class="action-bar-label">Actions as <strong>${activeRole === 'validator' ? 'Data Analyst' : 'Originator'}</strong></span>`;

        if (activeRole === 'validator') {
            switch (inq.status) {
                case 'submitted':
                    html += btn('primary', 'Begin Review', 'beginReview'); break;
                case 'under_review':
                    html += btn('primary', 'Send to Carrier', 'sendCarrier');
                    html += btn('success', 'Resolve Internally', 'resolveInternal'); break;
                case 'carrier_responded':
                case 'additional_info':
                    html += btn('primary', 'Review Response', 'reviewResponse'); break;
                case 'validator_review':
                    html += btn('success', 'Approve & Route to Originator', 'routeOriginator');
                    html += btn('danger', 'Return to Carrier', 'returnCarrier'); break;
                case 'approved':
                    html += btn('success', 'Close Inquiry', 'closeInquiry'); break;
            }
        } else { // originator
            switch (inq.status) {
                case 'draft':
                    html += btn('secondary', 'Save Changes', 'saveDraft');
                    html += btn('primary', 'Submit to Analyst', 'submitDraft'); break;
                case 'awaiting_originator':
                    html += btn('success', 'Approve Response', 'approveResponse');
                    html += btn('danger', 'Request More Info', 'requestMore'); break;
            }
        }

        bar.innerHTML = html;

        // Bind action buttons
        bar.querySelectorAll('[data-action]').forEach(b => {
            b.addEventListener('click', () => {
                const act = b.dataset.action;
                if (act === 'returnCarrier' || act === 'requestMore') {
                    showRejectPrompt(inq, act);
                } else {
                    handleAction(act, inq);
                }
            });
        });
    }

    function btn(type, label, action) {
        return `<button class="btn-${type}" data-action="${action}">${label}</button>`;
    }

    function handleAction(action, inq) {
        const validatorName = inq.validator?.name || 'Data Analyst';
        const originatorName = inq.originator.name;

        switch (action) {
            case 'beginReview':
                changeStatus(inq, 'under_review', `${validatorName} began research and analysis`);
                toast('Inquiry moved to Under Review.');
                break;
            case 'sendCarrier':
                switchTab('conversation');
                toast('Switch to Carrier Thread to compose your message.');
                return; // Don't refresh yet
            case 'resolveInternal':
                changeStatus(inq, 'awaiting_originator', `Resolved internally — auto-routed to ${originatorName} (${inq.originator.dept}) for review`);
                inq.resolvedInternally = true;
                toast('Resolved internally. Auto-routed to originator.');
                break;
            case 'reviewResponse':
                changeStatus(inq, 'validator_review', `${validatorName} reviewing carrier response`);
                toast('Status updated to Validator Review.');
                break;
            case 'routeOriginator':
                changeStatus(inq, 'awaiting_originator', `Response verified — auto-routed to ${originatorName} (${inq.originator.dept}) for review`);
                toast('Auto-routed to originator for review.');
                break;
            case 'returnCarrier':
                // Handled via showRejectPrompt — should not reach here directly
                break;
            case 'closeInquiry':
                changeStatus(inq, 'closed', `Inquiry closed by ${validatorName}`);
                toast('Inquiry closed.');
                break;
            case 'saveDraft':
                saveDraftEdits(inq);
                refresh();
                openPanel(inq.id);
                toast('Draft saved.');
                return;
            case 'submitDraft':
                saveDraftEdits(inq);
                if (!inq.validator) inq.validator = VALIDATORS[Math.floor(Math.random() * VALIDATORS.length)];
                changeStatus(inq, 'submitted', `Submitted to Data Analyst queue by ${originatorName}`);
                toast('Inquiry submitted to analyst queue.');
                break;
            case 'approveResponse':
                changeStatus(inq, 'approved', `Response approved by ${originatorName} (${inq.originator.dept})`);
                toast('Response approved. Validator can now close.');
                break;
            case 'requestMore':
                // Handled via showRejectPrompt — should not reach here directly
                break;
        }
        refresh();
        openPanel(inq.id);
    }

    // ── Reject Prompt (requires reason) ──
    function showRejectPrompt(inq, action) {
        const bar = $('actionBar');
        const isReturn = action === 'returnCarrier';
        const title = isReturn ? 'Return to Carrier' : 'Request Additional Information';
        const placeholder = isReturn
            ? 'Explain what additional information is needed from the carrier…'
            : 'Explain why additional information is needed…';

        bar.innerHTML = `
            <div class="reject-prompt">
                <div class="reject-prompt-header">
                    <span class="reject-prompt-title">⚠️ ${title}</span>
                    <button class="icon-btn reject-cancel" id="rejectCancel" title="Cancel">
                        <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <textarea id="rejectReason" rows="3" class="reject-textarea" placeholder="${placeholder}"></textarea>
                <div class="reject-actions">
                    <button class="btn-secondary" id="rejectCancelBtn">Cancel</button>
                    <button class="btn-danger" id="rejectConfirmBtn">${title}</button>
                </div>
            </div>
        `;

        // Focus the textarea
        requestAnimationFrame(() => $('rejectReason').focus());

        // Cancel
        const cancel = () => renderActions(inq);
        $('rejectCancel').addEventListener('click', cancel);
        $('rejectCancelBtn').addEventListener('click', cancel);

        // Confirm
        $('rejectConfirmBtn').addEventListener('click', () => {
            const reason = $('rejectReason').value.trim();
            if (!reason) {
                $('rejectReason').style.borderColor = 'var(--red)';
                $('rejectReason').setAttribute('placeholder', '⚠ A reason is required before sending back.');
                return;
            }

            const validatorName = inq.validator?.name || 'Data Analyst';
            const originatorName = inq.originator.name;

            if (isReturn) {
                changeStatus(inq, 'sent_to_carrier', `Returned to carrier: ${reason}`);
                inq.daysWithCarrier = 0;
                inq.internalNotes.push({
                    by: validatorName,
                    date: new Date().toISOString(),
                    text: `Return reason: ${reason}`
                });
                toast('Returned to carrier with explanation.');
                refresh();
                openPanel(inq.id);
                switchTab('conversation');
            } else {
                changeStatus(inq, 'additional_info', `${originatorName} (${inq.originator.dept}) requested additional info: ${reason}`);
                inq.internalNotes.push({
                    by: originatorName,
                    date: new Date().toISOString(),
                    text: `Additional info request: ${reason}`
                });
                toast('Sent back with explanation. Routed to analyst.');
                refresh();
                openPanel(inq.id);
            }
        });
    }

    function changeStatus(inq, newStatus, detail) {
        const by = activeRole === 'validator' ? (inq.validator?.name || 'Data Analyst') : inq.originator.name;
        const role = activeRole === 'validator' ? (inq.validator?.title || 'Data Analyst') : inq.originator.role + ' (' + inq.originator.dept + ')';
        // Auto-route entries use 'System'
        const isAutoRoute = detail.includes('auto-routed') || detail.includes('Auto-route');
        inq.activities.push({
            action: newStatus,
            by: isAutoRoute ? 'System' : by,
            role: isAutoRoute ? 'Auto-route' : role,
            date: new Date().toISOString(),
            detail: detail,
        });
        inq.status = newStatus;
    }

    // ── New Inquiry Modal ──
    function bindModal() {
        $('newInquiryBtn').addEventListener('click', () => {
            renderModalFooter();
            $('modalOverlay').classList.remove('hidden');
        });
        $('modalClose').addEventListener('click', () => $('modalOverlay').classList.add('hidden'));
        $('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) $('modalOverlay').classList.add('hidden'); });
    }

    function renderModalFooter() {
        const footer = $('modalFooter');
        if (activeRole === 'validator') {
            footer.innerHTML = `
                <button class="btn-secondary" id="saveDraftBtn">Save as Draft</button>
                <button class="btn-primary" id="submitInquiryBtn">Create & Begin Review</button>
            `;
        } else {
            footer.innerHTML = `
                <button class="btn-secondary" id="saveDraftBtn">Save as Draft</button>
                <button class="btn-primary" id="submitInquiryBtn">Submit to Analyst</button>
            `;
        }
        $('submitInquiryBtn').addEventListener('click', () => createInquiry(activeRole === 'validator' ? 'under_review' : 'submitted'));
        $('saveDraftBtn').addEventListener('click', () => createInquiry('draft'));
    }

    function createInquiry(status) {
        const dept = $('newDept').value;
        const state = $('newState').value;
        const claim = $('newClaim').value.trim();
        const policy = $('newPolicy').value.trim();
        const year = $('newYear').value;
        const carrier = $('newCarrier').value;
        const subject = $('newSubject').value.trim();
        const body = $('newBody').value.trim();

        if (!subject || !body) { toast('Please fill in subject and description.'); return; }

        const id = `INQ-${String(new Date().getFullYear()).slice(2)}${String(inquiries.length + 1).padStart(5, '0')}`;
        const now = new Date().toISOString();

        let originator, validator, activities;

        if (activeRole === 'validator') {
            // Validator-initiated: they are the analyst, dept comes from dropdown
            const v = VALIDATORS[Math.floor(Math.random() * VALIDATORS.length)];
            originator = { name: v.name, dept: dept, role: v.title };
            validator = v;
            activities = [
                { action: 'created', by: v.name, role: v.title, date: now, detail: 'Inquiry created by Data Analyst (self-initiated)' },
            ];
            if (status === 'under_review') {
                activities.push({ action: 'under_review', by: v.name, role: v.title, date: now, detail: `${v.name} began research and analysis` });
            }
        } else {
            // Originator-initiated
            originator = ORIGINATORS.find(o => o.dept === dept) || ORIGINATORS[0];
            validator = status === 'submitted' ? VALIDATORS[Math.floor(Math.random() * VALIDATORS.length)] : null;
            activities = [
                { action: 'created', by: originator.name, role: originator.role + ' (' + dept + ')', date: now, detail: 'Inquiry created from ' + dept + ' analysis' },
            ];
            if (status === 'submitted') {
                activities.push({ action: 'submitted', by: originator.name, role: originator.role, date: now, detail: 'Submitted to Data Analyst queue' });
            }
        }

        const inq = {
            id, subject, body, originator, validator,
            carrier: carrier || 'TBD', claimNumber: claim || 'TBD', policyNumber: policy || 'TBD',
            state: state || 'TBD', policyYear: parseInt(year), status,
            activities, internalNotes: [], carrierMessages: [],
            sentToCarrierDate: null, carrierRespondedDate: null,
            daysWithCarrier: null, ageDays: 0, resolvedInternally: false, createdDate: now,
        };

        inquiries.unshift(inq);
        $('modalOverlay').classList.add('hidden');
        // Clear form
        ['newSubject', 'newBody', 'newClaim', 'newPolicy'].forEach(id => $(id).value = '');
        refresh();

        const msgs = {
            'draft': 'Draft saved.',
            'submitted': 'Inquiry submitted to analyst queue.',
            'under_review': 'Inquiry created — now under your review.',
        };
        toast(msgs[status] || 'Inquiry created.');
    }

    // ── Helpers ──
    function setText(id, val) { $(id).textContent = val; }
    function shortDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    function longDate(iso) { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }
    function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'toast'; el.textContent = '✓ ' + msg;
        $toasts.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
