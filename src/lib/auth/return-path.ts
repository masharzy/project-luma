// Only explicit first-party mock links can override the normal dashboard landing.
export function mockReturnPath(value:unknown){return typeof value==='string'&&/^\/mocks\/\d{1,16}$/.test(value)?value:'/dashboard';}
