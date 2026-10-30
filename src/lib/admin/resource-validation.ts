import {AuthHttpError} from "@/lib/auth/http";
export function validateResource(d:Record<string,unknown>){
 const title=typeof d.title==="string"?d.title.trim():"";
 const category=String(d.category||""),body=typeof d.body==="string"?d.body:"";
 const access=String(d.access||""),status=String(d.status||"");
 const sourceUrl=typeof d.sourceUrl==="string"?d.sourceUrl.trim():"";
 if(title.length<3||title.length>180||body.length>50000||
 !["writing","ebook","journal","grammar"].includes(category)||!["free","premium"].includes(access)||
 !["draft","published","archived"].includes(status)||sourceUrl.length>2000)throw new AuthHttpError(400,"Invalid resource fields");
 if(sourceUrl){try{const u=new URL(sourceUrl);if(u.protocol!=="https:"||u.username||u.password)throw Error("bad");}catch{throw new AuthHttpError(400,"Use a valid HTTPS resource link");}}
 if(status==="published"&&!body.trim()&&!sourceUrl)throw new AuthHttpError(400,"Add resource text or a link before publishing");
 return {title,category,body,access,status,sourceUrl:sourceUrl||null};
}
