/**
 * Hand-curated seed of Oregon public records custodians.
 *
 * IMPORTANT: every email and URL below MUST be verified by sending a "is this
 * the right address for ORS 192 public records requests?" probe before any
 * real request is sent. Public records officers rotate; published intake
 * methods change. Many Oregon agencies (e.g. City of Portland, Multnomah
 * County) prefer submissions through a GovQA-style portal rather than email,
 * in which case the email field below is a fallback and the portal URL is
 * authoritative.
 *
 * Source notes are intentionally explicit so a human can re-verify.
 */
export type CustodianSeed = {
  name: string;
  agency: string;
  jurisdiction: string;
  email: string;
  address?: string;
  publicRecordsUrl?: string;
  notes: string;
  source: string;
};

export const CUSTODIAN_SEEDS: CustodianSeed[] = [
  {
    name: "Public Records Officer",
    agency: "Portland City Auditor",
    jurisdiction: "Portland, Oregon",
    email: "auditor@portlandoregon.gov",
    publicRecordsUrl: "https://www.portland.gov/auditor",
    notes:
      "City Auditor handles many records about city governance, council, and elections. VERIFY intake address before any real send.",
    source: "VERIFY",
  },
  {
    name: "Public Records Officer",
    agency: "Portland Bureau of Transportation (PBOT)",
    jurisdiction: "Portland, Oregon",
    email: "pbotrecords@portlandoregon.gov",
    publicRecordsUrl: "https://www.portland.gov/transportation/contact",
    notes:
      "Traffic, paving, signage, ROW permits, signal records. Portland may route through portland.govqa.us — confirm.",
    source: "VERIFY",
  },
  {
    name: "Records Unit",
    agency: "Portland Police Bureau",
    jurisdiction: "Portland, Oregon",
    email: "ppbrecords@portlandoregon.gov",
    publicRecordsUrl:
      "https://www.portland.gov/police/records/public-records-requests",
    notes:
      "Use-of-force, incident reports, internal affairs summaries. Many records are exempt under ORS 192.345 — expect partial denials.",
    source: "VERIFY",
  },
  {
    name: "Public Records Officer",
    agency: "Portland Bureau of Environmental Services",
    jurisdiction: "Portland, Oregon",
    email: "besrecords@portlandoregon.gov",
    publicRecordsUrl: "https://www.portland.gov/bes",
    notes: "Sewer, stormwater, watershed records.",
    source: "VERIFY",
  },
  {
    name: "Public Records Office",
    agency: "Multnomah County",
    jurisdiction: "Multnomah County, Oregon",
    email: "publicrecords@multco.us",
    publicRecordsUrl: "https://www.multco.us/multnomah-county/public-records",
    notes:
      "County-wide intake. They often route to specific departments. Health, DCJ, and DA records have separate intake.",
    source: "VERIFY",
  },
  {
    name: "Records Division",
    agency: "Multnomah County Sheriff's Office",
    jurisdiction: "Multnomah County, Oregon",
    email: "mcso.records@mcso.us",
    publicRecordsUrl:
      "https://www.mcso.us/site/index.cfm/public-records-request/",
    notes: "Jail, patrol, civil-process records.",
    source: "VERIFY",
  },
  {
    name: "Public Records Coordinator",
    agency: "Oregon Department of Justice",
    jurisdiction: "State of Oregon",
    email: "public.records@doj.state.or.us",
    publicRecordsUrl: "https://www.doj.state.or.us/public-records-requests/",
    notes:
      "Statewide AG records, consumer protection complaints, child support division records.",
    source: "VERIFY",
  },
  {
    name: "Public Records Officer",
    agency: "Oregon Liquor and Cannabis Commission (OLCC)",
    jurisdiction: "State of Oregon",
    email: "olcc.publicrecords@oregon.gov",
    publicRecordsUrl: "https://www.oregon.gov/olcc/Pages/public_records.aspx",
    notes:
      "Licensing, enforcement, marketplace data. Some licensee data is publicly searchable without a request.",
    source: "VERIFY",
  },
  {
    name: "Public Records Officer",
    agency: "Portland Public Schools",
    jurisdiction: "Portland, Oregon",
    email: "publicrecords@pps.net",
    publicRecordsUrl: "https://www.pps.net/Page/2089",
    notes:
      "Board materials, district policies, employee public-facing records. FERPA-protected student records are exempt.",
    source: "VERIFY",
  },
  {
    name: "Public Records Officer",
    agency: "Metro (regional government)",
    jurisdiction: "Portland metro region, Oregon",
    email: "publicrecords@oregonmetro.gov",
    publicRecordsUrl:
      "https://www.oregonmetro.gov/regional-leadership/public-records",
    notes:
      "Regional planning, Zoo, Expo, Convention Center, solid waste, parks. Tri-county scope.",
    source: "VERIFY",
  },
];
