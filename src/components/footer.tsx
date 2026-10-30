import { footerMarkup } from "@/lib/home-prototype";
export function Footer(){return <footer className="jtn-design jtn-footer" lang="en" dangerouslySetInnerHTML={{__html:footerMarkup.replace("__YEAR__",String(new Date().getFullYear()))}}/>;}
