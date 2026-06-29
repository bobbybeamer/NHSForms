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
