export type LegalSection = { heading: string; body: string[] };

export type LegalDoc = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

export type LegalBundle = {
  privacy: LegalDoc;
  terms: LegalDoc;
};
