export const day=(v:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Dhaka'}).format(new Date(v));
