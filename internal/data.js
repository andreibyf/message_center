/**
 * Internal NCCI Message Center — Mock Data
 * Full workflow history, internal notes, SLA tracking, department tagging.
 */

const DEPARTMENTS = ['AES', 'RMA'];

const ORIGINATORS = [
    { name: 'Catherine Brooks', dept: 'AES', role: 'Actuary' },
    { name: 'Raymond Foster', dept: 'AES', role: 'Senior Actuary' },
    { name: 'Diana Patel', dept: 'AES', role: 'Actuarial Analyst' },
    { name: 'Gregory Walsh', dept: 'RMA', role: 'Accountant' },
    { name: 'Monica Reeves', dept: 'RMA', role: 'Senior Accountant' },
    { name: 'Steven Chu', dept: 'RMA', role: 'Financial Analyst' },
];

const VALIDATORS = [
    { name: 'Maria Gonzalez', title: 'Senior Data Analyst' },
    { name: 'James Patterson', title: 'Data Analyst' },
    { name: 'Linda Chen', title: 'Data Analyst' },
    { name: 'Robert Williams', title: 'Senior Data Analyst' },
    { name: 'Sarah Mitchell', title: 'Data Analyst' },
];

const CARRIERS = [
    'Acme Insurance Co.', 'Liberty National WC', 'Summit Casualty Group',
    'Pacific Indemnity Corp.', 'Heritage Workers Comp', 'Continental Risk Mutual',
    'Beacon Underwriters', 'Pinnacle Insurance Holdings',
];

const STATES = ['FL','CA','TX','NY','PA','IL','OH','GA','NC','NJ','VA','MI','AZ','TN','IN','MO'];

const STATUS_DEFS = {
    draft:                { label: 'Draft',                  color: '#6B7280' },
    submitted:            { label: 'Submitted',              color: '#3B82F6' },
    under_review:         { label: 'Under Review',           color: '#6366F1' },
    resolved_internally:  { label: 'Resolved Internally',    color: '#14B8A6' },
    sent_to_carrier:      { label: 'Sent to Carrier',        color: '#F59E0B' },
    carrier_responded:    { label: 'Carrier Responded',      color: '#D97706' },
    validator_review:     { label: 'Validator Review',        color: '#A78BFA' },
    awaiting_originator:  { label: 'Awaiting Originator',    color: '#06B6D4' },
    additional_info:      { label: 'Additional Info Needed',  color: '#EF4444' },
    approved:             { label: 'Approved',               color: '#10B981' },
    closed:               { label: 'Closed',                 color: '#64748B' },
};

const SUBJECTS = [
    'Discrepancy in reported claim amount',
    'Missing medical documentation for claim',
    'Policy coverage verification required',
    'Claim classification code review',
    'Duplicate claim filing detected',
    'Experience modification factor inquiry',
    'Unreported claim identified in audit',
    'Payroll discrepancy on unit stat report',
    'Loss run reconciliation needed',
    'Claim closure verification request',
    'Subrogation recovery not reported',
    'Claim reopening justification needed',
    'Interstate claim jurisdiction question',
    'Indemnity benefit calculation review',
    'Medical-only to lost-time reclassification',
    'Allocated loss adjustment expense inquiry',
    'Claim valuation discrepancy noted',
    'Policy cancellation mid-term — open claims',
    'Class code reassignment impact on claims',
    'Second injury fund recovery question',
];

const INQUIRY_BODIES = [
    `During our rate analysis for the upcoming policy period, we identified a discrepancy between the reported incurred losses of $45,230 and the expected losses based on the classification code and payroll exposure.\n\nPlease investigate whether the claim valuation reflects the most current reserve estimates and verify the accuracy of the loss data submitted in the latest unit statistical report.`,
    `Our experience rating review has flagged this claim as potentially misclassified. The reported classification code (8810 — Clerical Office) is inconsistent with the injury description (fall from scaffolding at construction site).\n\nPlease verify the correct classification code and determine if this impacts the policyholder's experience modification factor.`,
    `The loss run data for this carrier shows a claim that was reported as closed, but our actuarial models indicate ongoing reserve activity. This inconsistency affects the aggregate loss development factors we are computing.\n\nPlease confirm the current claim status and whether any reopening or additional payments have occurred since the last valuation.`,
    `During the RMA premium reconciliation for this policy period, we noticed that the audited payroll of $1,580,000 significantly exceeds the reported payroll of $1,245,000 in the unit statistical filing.\n\nThis discrepancy of $335,000 affects both premium calculations and loss ratios. Please verify the correct payroll figure with the carrier.`,
    `Our analysis of this policyholder's experience modification shows an unexplained spike. Upon investigation, we found a claim with a reported incurred value of $287,000 that does not appear in previous valuations.\n\nPlease determine if this is a newly reported claim, a reopened claim, or a data entry error in the carrier's submission.`,
    `The subrogation recovery of approximately $15,000 on this claim has not been reflected in the statistical data. Accurate recovery reporting is essential for proper experience rating and aggregate analysis.\n\nPlease verify with the carrier whether this recovery has been applied and request updated claim data.`,
    `We are reviewing duplicate claim submissions from this carrier. Two claims with substantially similar details (same employee, same injury date, same employer) appear under different claim numbers.\n\nPlease investigate and confirm which claim number is the primary filing, and whether the duplicate should be voided.`,
    `During our jurisdictional analysis, this claim involves an employee injured while temporarily working in a state different from the policy's base state. The applicable benefit rates depend on the correct jurisdiction.\n\nPlease clarify with the carrier: state where injury occurred, state of hire, and which state's benefits are being applied.`,
];

const INTERNAL_NOTES_POOL = [
    'Checked WCSP database — claim exists but valuation date is from 6 months ago. Need current figures.',
    'Contacted carrier\'s claims dept via phone, left voicemail. Will follow up if no response by EOW.',
    'Cross-referenced with prior year unit stat — this claim was not present, confirming it\'s newly reported.',
    'Reviewed classification manual — Code 8810 does not cover scaffolding work. Likely should be 5403.',
    'Payroll discrepancy aligns with policyholder audit findings from the state insurance department.',
    'Ran duplicate detection query — 94% match score between the two claims. Very likely duplicate.',
    'Checked subrogation recovery database — recovery was posted but not transmitted in latest data call.',
    'Spoke with carrier\'s underwriting department — they confirmed the policy was active on injury date.',
    'Reviewed medical records summary — injury severity suggests this should be a lost-time claim.',
    'Compared reported losses against NCCI benchmarks — reported amount is 2.3x the expected value for this class.',
];

const now = new Date();
function daysAgo(n) { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function claimNum(state, year) { return `WC-${state}-${String(year).slice(2)}${randInt(10000,99999)}`; }
function policyNum(year) { return `WCP-${String(year).slice(2)}${randInt(1000000,9999999)}`; }

/**
 * Build a single inquiry with full workflow history
 */
function buildInquiry(idx, status, ageDays) {
    const originator = pick(ORIGINATORS);
    const validator = pick(VALIDATORS);
    const carrier = pick(CARRIERS);
    const state = pick(STATES);
    const policyYear = randInt(2023, 2026);
    const subject = SUBJECTS[idx % SUBJECTS.length];
    const body = INQUIRY_BODIES[idx % INQUIRY_BODIES.length];
    const id = `INQ-${String(now.getFullYear()).slice(2)}${String(idx + 1).padStart(5, '0')}`;

    // Build activity timeline based on status
    const activities = [];
    const sentDay = ageDays;

    activities.push({ action: 'created', by: originator.name, role: originator.role + ' (' + originator.dept + ')', date: daysAgo(sentDay), detail: 'Inquiry created from ' + originator.dept + ' analysis' });

    if (status === 'draft') {
        return makeInquiry({ id, subject, body, originator, validator: null, carrier, state, policyYear, status, activities, internalNotes: [], carrierMessages: [], sentToCarrierDate: null, carrierRespondedDate: null, ageDays });
    }

    activities.push({ action: 'submitted', by: originator.name, role: originator.role, date: daysAgo(sentDay), detail: 'Submitted to Data Analyst queue' });

    if (status === 'submitted') {
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: [], carrierMessages: [], sentToCarrierDate: null, carrierRespondedDate: null, ageDays });
    }

    activities.push({ action: 'assigned', by: 'System', role: 'Auto-assign', date: daysAgo(sentDay - 1), detail: `Assigned to ${validator.name}` });
    activities.push({ action: 'under_review', by: validator.name, role: validator.title, date: daysAgo(sentDay - 1), detail: 'Began research and analysis' });

    const notes = [];
    notes.push({ by: validator.name, date: daysAgo(sentDay - 2), text: pick(INTERNAL_NOTES_POOL) });

    if (status === 'under_review') {
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages: [], sentToCarrierDate: null, carrierRespondedDate: null, ageDays });
    }

    if (status === 'resolved_internally') {
        notes.push({ by: validator.name, date: daysAgo(sentDay - 4), text: pick(INTERNAL_NOTES_POOL) });
        activities.push({ action: 'resolved_internally', by: validator.name, role: validator.title, date: daysAgo(sentDay - 5), detail: 'Resolved without carrier inquiry — data verified in WCSP database' });
        activities.push({ action: 'awaiting_originator', by: 'System', role: 'Auto-route', date: daysAgo(sentDay - 5), detail: `Auto-routed to ${originator.name} (${originator.dept}) for review` });
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status: 'awaiting_originator', activities, internalNotes: notes, carrierMessages: [], sentToCarrierDate: null, carrierRespondedDate: null, ageDays, resolvedInternally: true });
    }

    // Sent to carrier path
    const sentCarrierDay = sentDay - 3;
    activities.push({ action: 'sent_to_carrier', by: validator.name, role: validator.title, date: daysAgo(sentCarrierDay), detail: `Inquiry sent to ${carrier}` });
    const sentToCarrierDate = daysAgo(sentCarrierDay);

    const carrierMessages = [];
    carrierMessages.push({ from: 'NCCI', by: validator.name, date: daysAgo(sentCarrierDay), message: body });

    if (status === 'sent_to_carrier') {
        const carrierDays = sentCarrierDay;
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate: null, ageDays, daysWithCarrier: carrierDays });
    }

    // Carrier responded
    const respondedDay = Math.max(1, sentCarrierDay - randInt(5, 15));
    activities.push({ action: 'carrier_responded', by: carrier, role: 'Carrier', date: daysAgo(respondedDay), detail: 'Carrier submitted response' });
    const carrierRespondedDate = daysAgo(respondedDay);
    const daysWithCarrier = sentCarrierDay - respondedDay;

    carrierMessages.push({ from: 'Carrier', by: carrier, date: daysAgo(respondedDay), message: getCarrierResponse() });

    if (status === 'carrier_responded') {
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate, ageDays, daysWithCarrier });
    }

    activities.push({ action: 'validator_review', by: validator.name, role: validator.title, date: daysAgo(respondedDay - 1), detail: 'Reviewing carrier response' });
    notes.push({ by: validator.name, date: daysAgo(respondedDay - 1), text: pick(INTERNAL_NOTES_POOL) });

    if (status === 'validator_review') {
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate, ageDays, daysWithCarrier });
    }

    // Validator approved → auto-route to originator
    activities.push({ action: 'awaiting_originator', by: 'System', role: 'Auto-route', date: daysAgo(respondedDay - 2), detail: `Response verified — auto-routed to ${originator.name} (${originator.dept}) for review` });

    if (status === 'awaiting_originator') {
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate, ageDays, daysWithCarrier });
    }

    if (status === 'additional_info') {
        activities.push({ action: 'additional_info', by: originator.name, role: originator.role + ' (' + originator.dept + ')', date: daysAgo(respondedDay - 4), detail: 'Originator requested additional information' });
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate, ageDays, daysWithCarrier });
    }

    // Approved
    activities.push({ action: 'approved', by: originator.name, role: originator.role + ' (' + originator.dept + ')', date: daysAgo(respondedDay - 3), detail: 'Response approved by originator' });

    if (status === 'approved') {
        return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status, activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate, ageDays, daysWithCarrier });
    }

    // Closed
    activities.push({ action: 'closed', by: validator.name, role: validator.title, date: daysAgo(Math.max(0, respondedDay - 4)), detail: 'Inquiry closed' });
    return makeInquiry({ id, subject, body, originator, validator, carrier, state, policyYear, status: 'closed', activities, internalNotes: notes, carrierMessages, sentToCarrierDate, carrierRespondedDate, ageDays, daysWithCarrier });
}

function makeInquiry(fields) {
    return {
        id: fields.id,
        subject: fields.subject,
        body: fields.body,
        originator: fields.originator,
        validator: fields.validator,
        carrier: fields.carrier,
        claimNumber: claimNum(fields.state, fields.policyYear),
        policyNumber: policyNum(fields.policyYear),
        state: fields.state,
        policyYear: fields.policyYear,
        status: fields.status,
        activities: fields.activities,
        internalNotes: fields.internalNotes,
        carrierMessages: fields.carrierMessages,
        sentToCarrierDate: fields.sentToCarrierDate,
        carrierRespondedDate: fields.carrierRespondedDate,
        daysWithCarrier: fields.daysWithCarrier || null,
        ageDays: fields.ageDays,
        resolvedInternally: fields.resolvedInternally || false,
        createdDate: fields.activities[0].date,
    };
}

function getCarrierResponse() {
    const responses = [
        'We have reviewed the inquiry and confirm the reported data is accurate. The claim valuation reflects the most recent reserve estimate as of the last valuation date. Updated documentation has been attached.',
        'After investigation, we have identified a data entry error in our submission. A corrected unit statistical report has been submitted to reflect the accurate figures. We apologize for the discrepancy.',
        'Our claims department has verified the classification code assignment. The employee was performing duties consistent with the reported classification at the time of injury. Supporting job description documentation is enclosed.',
        'We acknowledge the duplicate filing. Claim number referenced in this inquiry is the primary filing. The secondary claim has been voided in our system and will be removed from the next data submission.',
        'The subrogation recovery has been applied to the claim. Our next scheduled data transmission will include the updated figures reflecting the $15,000 recovery.',
        'We are currently gathering additional documentation from the policyholder regarding the payroll discrepancy. We expect to provide a complete response within 10 business days.',
    ];
    return pick(responses);
}

// ── Generate 25 inquiries across all statuses ──
const STATUSES_DISTRIBUTION = [
    { status: 'draft', count: 1 },
    { status: 'submitted', count: 2 },
    { status: 'under_review', count: 3 },
    { status: 'sent_to_carrier', count: 4 },
    { status: 'carrier_responded', count: 2 },
    { status: 'validator_review', count: 2 },
    { status: 'awaiting_originator', count: 3 },
    { status: 'additional_info', count: 1 },
    { status: 'approved', count: 2 },
    { status: 'closed', count: 4 },
    { status: 'resolved_internally', count: 1 },
];

const INTERNAL_INQUIRIES = [];
let idx = 0;
STATUSES_DISTRIBUTION.forEach(({ status, count }) => {
    for (let i = 0; i < count; i++) {
        INTERNAL_INQUIRIES.push(buildInquiry(idx++, status, randInt(3, 90)));
    }
});
