// Manual payment options shown on the checkout page. Add an entry per method once the account details are final.
// Example: { name: 'bKash', account: '01XXXXXXXXX', steps: ['Open bKash and choose Send Money.', 'Send the exact total.'] }
export type PaymentMethod = { name: string; account: string; steps: string[] };
export const paymentMethods: PaymentMethod[] = [];
