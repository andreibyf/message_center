/**
 * Mock data for the NCCI Message Center prototype.
 * Each inquiry represents a message from an NCCI analyst to an insurance carrier
 * regarding a workers' compensation claim.
 */

const STATES = [
    'FL','CA','TX','NY','PA','IL','OH','GA','NC','NJ',
    'VA','MI','AZ','TN','IN','MO','MD','WI','CO','AL'
];

const ANALYSTS = [
    'Maria Gonzalez','James Patterson','Linda Chen','Robert Williams',
    'Sarah Mitchell','David Kim','Angela Torres','Michael O\'Brien',
    'Patricia Johnson','Thomas Nguyen','Karen Rodriguez','Christopher Lee'
];

const STATUS_OPTIONS = ['open','pending_review','accepted','closed','reopened'];

const INQUIRY_SUBJECTS = [
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
    'Second injury fund recovery question',
    'Claim valuation discrepancy noted',
    'Policy cancellation mid-term — open claims',
    'Class code reassignment impact on claims'
];

const INQUIRY_MESSAGES = [
    `Our audit has identified a discrepancy between the reported claim amount of $45,230 and the amount reflected in our records ($38,750). Please review the claim valuation and provide supporting documentation for the reported amount, including any reserve adjustments made after the initial filing.\n\nSpecifically, we need:\n1. Itemized breakdown of the claim costs\n2. Date of last reserve adjustment\n3. Supporting medical or legal documentation`,

    `During our routine review, we noticed that the medical documentation for this claim appears to be incomplete. The initial injury report references a follow-up surgical procedure, but no corresponding medical bills or treatment records have been submitted.\n\nPlease provide the complete medical records and billing statements to support the current claim valuation within 30 days.`,

    `We are conducting a policy coverage verification review and require confirmation that the referenced policy was active and in force on the date of the reported injury. Our records show a potential gap in coverage between the policy renewal dates.\n\nPlease confirm the effective dates and provide the declarations page for the referenced policy period.`,

    `The classification code assigned to this claim (Code 8810 — Clerical Office) does not appear consistent with the nature of the reported injury (fall from scaffolding). Please review the assigned classification code and either confirm its accuracy or submit a correction with supporting job description documentation.\n\nThis affects the experience modification calculation for the policyholder.`,

    `Our system has flagged a potential duplicate filing for this claim. A claim with substantially similar details (same employee, same injury date, same employer) was previously reported under a different claim number. Please review both filings and confirm whether this is a duplicate or a separate claim event.\n\nIf duplicate, please advise which claim number should be considered the primary filing.`,

    `We are reviewing the experience modification factor calculation for this policyholder and have identified that this claim\'s reported losses appear to significantly impact the mod calculation. Please verify the accuracy of the following:\n\n1. Total incurred losses\n2. Claim status (open/closed)\n3. Any subrogation or second injury fund recoveries\n\nTimely response will ensure accurate mod calculation for the upcoming policy period.`,

    `During our annual audit of unit statistical reports, we identified a claim that appears to have occurred during the referenced policy period but was not included in the carrier\'s submission. The claim involves a workplace injury reported to the state workers\' compensation board.\n\nPlease investigate and submit the unreported claim data or provide documentation explaining why this claim was excluded.`,

    `A payroll discrepancy has been identified on the unit statistical report for the referenced policy. The reported payroll of $1,245,000 does not reconcile with the audited payroll figure of $1,580,000 obtained from the policyholder\'s records.\n\nPlease review and submit a corrected unit statistical report reflecting the accurate payroll figures.`,

    `We are performing a loss run reconciliation and have identified differences between your reported losses and the amounts reflected in our database. The variance of $12,450 needs to be resolved to ensure accurate statistical reporting.\n\nPlease provide an updated loss run report as of the current valuation date.`,

    `This claim has been reported as closed, but our records indicate that there may be outstanding medical treatments or pending legal proceedings. Please confirm the claim closure status and provide the final settlement documentation.\n\nIf the claim has been reopened, please submit an updated status report.`,

    `Our records indicate that a subrogation recovery of approximately $15,000 was obtained on this claim, but this recovery has not been reflected in the reported claim data. Please update the claim to include any third-party recoveries.\n\nAccurate reporting of recoveries is essential for proper experience rating calculations.`,

    `This claim was previously reported as closed but has been reopened. Please provide justification for the reopening, including:\n\n1. Reason for reopening\n2. Updated reserve estimates\n3. Expected duration of additional claim activity\n4. Any new medical evidence or legal developments`,

    `This claim involves an employee who was injured while temporarily working in a different state than the policy\'s base state. We need clarification on the applicable jurisdiction for benefits calculation.\n\nPlease confirm:\n1. State where injury occurred\n2. State of hire\n3. Policy\'s base state\n4. Which state\'s benefits are being applied`,

    `We are reviewing the indemnity benefit calculations for this claim and have identified a potential error. The weekly benefit rate of $892 appears to exceed the maximum allowable rate for the injury state during the applicable policy period.\n\nPlease review the calculation and provide the wage documentation used to determine the benefit rate.`,

    `This claim was originally reported as a medical-only claim but appears to have developed into a lost-time claim based on recent activity. If the injured worker has now missed more than the waiting period, the claim should be reclassified.\n\nPlease confirm the current claim type and update if necessary. This reclassification affects the experience rating calculation.`
];

/**
 * Generate a set of realistic mock inquiries
 */
function generateMockData(count) {
    const inquiries = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 120) + 1;
        const originDate = new Date(now);
        originDate.setDate(originDate.getDate() - daysAgo);

        const policyYear = 2023 + Math.floor(Math.random() * 4); // 2023-2026
        const state = STATES[Math.floor(Math.random() * STATES.length)];
        const analyst = ANALYSTS[Math.floor(Math.random() * ANALYSTS.length)];
        const status = STATUS_OPTIONS[Math.floor(Math.random() * STATUS_OPTIONS.length)];
        const subjectIdx = Math.floor(Math.random() * INQUIRY_SUBJECTS.length);
        const messageIdx = Math.floor(Math.random() * INQUIRY_MESSAGES.length);

        // Generate claim and policy numbers
        const claimNum = `WC-${state}-${String(policyYear).slice(2)}${String(Math.floor(Math.random() * 90000) + 10000)}`;
        const policyNum = `WCP-${String(policyYear).slice(2)}${String(Math.floor(Math.random() * 9000000) + 1000000)}`;

        // Generate responses for some inquiries
        const responses = [];
        if (status === 'accepted' || status === 'closed' || status === 'pending_review') {
            const respDaysAgo = Math.max(1, daysAgo - Math.floor(Math.random() * 15) - 1);
            const respDate = new Date(now);
            respDate.setDate(respDate.getDate() - respDaysAgo);
            responses.push({
                id: `RESP-${String(i + 1).padStart(4, '0')}-01`,
                author: 'Carrier Representative',
                date: respDate.toISOString(),
                message: getRandomResponse(status),
            });
        }
        if (status === 'reopened') {
            const resp1DaysAgo = Math.max(3, daysAgo - Math.floor(Math.random() * 10) - 5);
            const resp1Date = new Date(now);
            resp1Date.setDate(resp1Date.getDate() - resp1DaysAgo);
            responses.push({
                id: `RESP-${String(i + 1).padStart(4, '0')}-01`,
                author: 'Carrier Representative',
                date: resp1Date.toISOString(),
                message: 'We have reviewed the inquiry and submitted the requested documentation. Please see attached records.',
            });
            const resp2DaysAgo = Math.max(1, resp1DaysAgo - 3);
            const resp2Date = new Date(now);
            resp2Date.setDate(resp2Date.getDate() - resp2DaysAgo);
            responses.push({
                id: `RESP-${String(i + 1).padStart(4, '0')}-02`,
                author: analyst + ' (NCCI)',
                date: resp2Date.toISOString(),
                message: 'Thank you for the response. After further review, additional information is needed. The claim has been reopened for further investigation. Please provide updated reserve estimates.',
            });
        }

        inquiries.push({
            id: `INQ-${String(now.getFullYear()).slice(2)}${String(i + 1).padStart(5, '0')}`,
            subject: INQUIRY_SUBJECTS[subjectIdx],
            message: INQUIRY_MESSAGES[messageIdx],
            claimNumber: claimNum,
            policyNumber: policyNum,
            state: state,
            policyYear: policyYear,
            analyst: analyst,
            originDate: originDate.toISOString(),
            ageDays: daysAgo,
            status: status,
            responses: responses,
        });
    }

    return inquiries;
}

function getRandomResponse(status) {
    const responses = {
        accepted: [
            'We have reviewed the inquiry and confirm the information is accurate. The requested corrections have been submitted.',
            'Acknowledged. Our claims department has verified the data and submitted the necessary updates to our system.',
            'The discrepancy has been resolved. Updated documentation has been uploaded to the portal.',
        ],
        closed: [
            'This matter has been resolved. Final documentation was submitted on the date referenced in our previous communication.',
            'Claim has been reconciled and finalized. No further action is required from our end.',
        ],
        pending_review: [
            'We are currently reviewing the inquiry and gathering the necessary documentation from our claims department. We expect to have a complete response within 10 business days.',
            'Our team is investigating the matter. We have requested additional records from the policyholder and will respond once received.',
            'Thank you for bringing this to our attention. Our compliance team is reviewing the data and will provide a detailed response shortly.',
        ],
    };
    const pool = responses[status] || responses.pending_review;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Generate 25 mock inquiries
const MOCK_INQUIRIES = generateMockData(25);
