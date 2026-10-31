// Only explicit first-party mock and membership links override the dashboard landing.
const membershipReturn = /^\/dashboard\/subscription(?:\?plan=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/i;
export function mockReturnPath(value: unknown) {
  return typeof value === 'string' && (/^\/mocks\/\d{1,16}$/.test(value) || membershipReturn.test(value)) ? value : '/dashboard';
}
