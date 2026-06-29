// ─── MERG SOP Recipient Configuration ────────────────────────────────────────
// Named individuals and team inboxes from the MERG SOP documents.
// Source: SOP - MERG Completed - Internal Email - Purchasing (yhs-tr.merg-medeng)
//         SOP - MERG Completed - Internal Email - (Leasing)
//         SOP - Email - MERG - To Supplier for Quote
//
// All email addresses marked "// confirm" were not explicitly given in the SOP
// documents and have been inferred or placeholder-generated.
// CONFIRM ALL WITH CLIENT before going live.

export interface Recipient {
  name: string;
  email: string;
}

// ─── Named contacts and team inboxes ─────────────────────────────────────────

export const CONTACTS = {
  // Fixed team inboxes
  medEngInbox:      { name: 'Medical Engineering (MERG)', email: 'yhs-tr.merg-medeng@nhs.net'      },
  emeAdminInbox:    { name: 'EME Admin',                  email: 'yhs-tr.eme.admin@nhs.net'         },
  mergApplications: { name: 'MERG Applications',          email: 'yhs-tr.merg.applications@nhs.net' }, // confirm
  charityFinance:   { name: 'Charity Finance',            email: 'yhs-tr.charity-finance@nhs.net'   }, // confirm
  storesSgh:        { name: 'Stores (Scarborough/SGH)',   email: 'yhs-tr.stores.sgh@nhs.net'        }, // confirm
  storesYork:       { name: 'Stores (York Hospital)',     email: 'yhs-tr.stores.york@nhs.net'       }, // confirm
  nhsSupplyChain:   { name: 'NHS Supply Chain',           email: 'enquiries@supplychain.nhs.uk'     }, // confirm

  // Named individuals — Cc on all concluded/completed emails
  alastairJakeman:  { name: 'Alastair Jakeman', email: 'alastair.jakeman@nhs.net'  }, // confirm
  steveBennison:    { name: 'Steve Bennison',   email: 'steve.bennison@nhs.net'    }, // confirm
  edPearson:        { name: 'Ed Pearson',       email: 'ed.pearson@nhs.net'        }, // confirm

  // Medical Engineering team — purchasing route (maint = Medical Engineering, not SHYPS)
  davidSteel:       { name: 'David Steel',      email: 'david.steel@nhs.net'       }, // confirm
  jamesHowes:       { name: 'James Howes',      email: 'james.howes@nhs.net'       }, // confirm
  carolineFisher:   { name: 'Caroline Fisher',  email: 'caroline.fisher@nhs.net'   }, // confirm — purchasing
  danielWebb:       { name: 'Daniel Webb',      email: 'daniel.webb@nhs.net'       }, // confirm — leasing

  // SHYPS team — used when isShyps === 'Yes' instead of standard Med Eng recipients
  lukePoskitt:      { name: 'Luke Poskitt',     email: 'luke.poskitt@nhs.net'      }, // confirm
  garethWilliams:   { name: 'Gareth Williams',  email: 'gareth.williams@nhs.net'   }, // confirm
  helenGreenley:    { name: 'Helen Greenley',   email: 'helen.greenley@nhs.net'    }, // confirm
  karenAwty:        { name: 'Karen Awty',       email: 'karen.awty@nhs.net'        }, // confirm
  mattCoulson:      { name: 'Matt Coulson',     email: 'matt.coulson@nhs.net'      }, // confirm
} as const satisfies Record<string, Recipient>;

// ─── Stores lookup by site ───────────────────────────────────────────────────

export function storesBySite(site: string): Recipient[] {
  const s = (site ?? '').toLowerCase();
  const isYork = s.includes('york');
  const isSgh  = s.includes('scarborough') || s.includes(' sgh') || s.includes('harrogate');
  if (isYork && !isSgh) return [CONTACTS.storesYork];
  if (isSgh  && !isYork) return [CONTACTS.storesSgh];
  // Ambiguous or unrecognised site — include both (confirm with client)
  return [CONTACTS.storesYork, CONTACTS.storesSgh];
}

// ─── MERG concluded recipient computation ────────────────────────────────────

export interface MergConcludedFields {
  requester: Recipient;
  fmEmail: string;
  fmName: string;
  cgmEmail: string;
  cgmName: string;
  site: string;
  fundingSource: string;
  maint: string;
  isShyps: string;      // 'Yes' | 'No' | ''
  urnRequested: string; // 'Yes' | 'No' | ''
}

export function computeMergConcludedTo(f: MergConcludedFields, isLeasing: boolean): Recipient[] {
  const to: Recipient[] = [
    f.requester,
    { name: f.fmName,  email: f.fmEmail  },
    { name: f.cgmName, email: f.cgmEmail },
    CONTACTS.alastairJakeman,
    CONTACTS.medEngInbox,
    ...storesBySite(f.site),
  ];

  if (f.fundingSource === 'Charity') {
    to.push(CONTACTS.charityFinance);
  }
  if (f.urnRequested === 'Yes') {
    to.push(CONTACTS.nhsSupplyChain);
  }

  // Maintenance-dependent recipients (only when Medical Engineering is the route)
  if (f.maint === 'Medical Engineering') {
    if (f.isShyps === 'Yes') {
      // SHYPS: replace standard Medical Engineering maintenance names with SHYPS team.
      // The core SHYPS team (Luke, Gareth, Helen, Karen) handle the equipment;
      // Helen Greenley and Matt Coulson handle the maintenance element.
      // Helen is already in the list; Matt Coulson is additional.
      to.push(
        CONTACTS.lukePoskitt,
        CONTACTS.garethWilliams,
        CONTACTS.helenGreenley,
        CONTACTS.karenAwty,
        CONTACTS.mattCoulson, // maintenance element
      );
    } else if (isLeasing) {
      // Leasing route: EME admin, Daniel Webb, David Steel
      to.push(CONTACTS.emeAdminInbox, CONTACTS.danielWebb, CONTACTS.davidSteel);
    } else {
      // Purchasing route: EME admin, David Steel, James Howes, Caroline Fisher
      to.push(CONTACTS.emeAdminInbox, CONTACTS.davidSteel, CONTACTS.jamesHowes, CONTACTS.carolineFisher);
    }
  }

  return to;
}

export function computeMergConcludedCc(): Recipient[] {
  return [CONTACTS.steveBennison, CONTACTS.edPearson, CONTACTS.mergApplications];
}

// ─── Quote request recipients ─────────────────────────────────────────────────

export function computeMergQuoteTo(supplierName: string): Recipient[] {
  // Supplier contact email is not known at form-submission time — shown as a placeholder.
  const email = supplierName
    ? `[${supplierName} quotations email — confirm before sending]`
    : '[supplier email — confirm before sending]';
  return [{ name: supplierName || 'Supplier', email }];
}

export function computeMergQuoteCc(): Recipient[] {
  return [CONTACTS.mergApplications];
}

// ─── Approval notification Cc ─────────────────────────────────────────────────

export function computeNotificationCc(
  formTypeKey: string,
  procBpEmail?: string,
  procBpName?: string,
): Recipient[] {
  if (formTypeKey === 'sfi_waiver' && procBpEmail && procBpName) {
    return [{ name: procBpName, email: procBpEmail }];
  }
  return [CONTACTS.mergApplications];
}
