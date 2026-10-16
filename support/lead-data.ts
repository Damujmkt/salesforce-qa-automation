import { randomUUID } from 'node:crypto';

export type LeadData = {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  leadSource: string;
};

export function uniqueLead(): LeadData {
  const suffix = randomUUID().slice(0, 8);
  return {
    firstName: 'Hdb',
    lastName: `QA${suffix}`,
    company: `Assessment ${suffix}`,
    email: `sf.qa.${suffix}@example.com`,
    leadSource: 'Web'
  };
}
