import { permanentRedirect } from 'next/navigation';
// Keep the existing public /pricing canonical; accept links from the design reference.
export default function Page() { permanentRedirect('/pricing'); }
