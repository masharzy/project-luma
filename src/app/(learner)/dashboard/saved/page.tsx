import {requireUser} from '@/lib/auth/guards';import {learnerData} from '@/lib/learner/data';import {SavedResources} from '@/components/learner-preferences';import {StudentHeading} from '@/components/learner-panels';
export const metadata={title:'Saved resources'};
export default async function Page(){const u=await requireUser();const d=await learnerData(u.id);return <><StudentHeading title="Saved resources" description="Your saved cue cards, samples and collections."/><SavedResources initial={d.saved}/></>}
