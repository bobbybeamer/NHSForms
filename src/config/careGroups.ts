// Care Group → Finance Manager email mapping.
// Care groups 1–3 have named Finance Managers seeded in the demo data.
// Groups 4–6 fall back to the default (group 1) Finance Manager for this demo.
// TO CONFIRM WITH CLIENT: care group definitions and FM assignments.
export const CARE_GROUP_FM_EMAIL: Record<number, string> = {
  1: 'fm.cg1@nhs.net',
  2: 'fm.cg2@nhs.net',
  3: 'fm.cg3@nhs.net',
  4: 'fm.cg1@nhs.net', // default — update when groups 4–6 are confirmed
  5: 'fm.cg1@nhs.net',
  6: 'fm.cg1@nhs.net',
};

// Care Group → Care Group Manager email mapping.
// TO CONFIRM WITH CLIENT: the purchasing and leasing SOP documents list slightly
// different FM/CGM assignments for some groups. These entries are seeded from
// the purchasing SOP — verify all against the leasing SOP before going live.
export const CARE_GROUP_MANAGER_EMAIL: Record<number, string> = {
  1: 'cgm.caregroup1@nhs.net', // confirm with client
  2: 'cgm.caregroup2@nhs.net', // confirm with client
  3: 'cgm.caregroup3@nhs.net', // confirm with client
  4: 'cgm.caregroup1@nhs.net', // default — confirm
  5: 'cgm.caregroup1@nhs.net', // confirm
  6: 'cgm.caregroup1@nhs.net', // confirm
};

// Care Group → Care Group Manager display name (no system users seeded for CGMs).
// TO CONFIRM WITH CLIENT: actual names; check for differences between purchasing/leasing SOPs.
export const CARE_GROUP_MANAGER_NAME: Record<number, string> = {
  1: 'Care Group 1 Manager', // confirm with client
  2: 'Care Group 2 Manager', // confirm with client
  3: 'Care Group 3 Manager', // confirm with client
  4: 'Care Group 1 Manager', // default
  5: 'Care Group 1 Manager',
  6: 'Care Group 1 Manager',
};
