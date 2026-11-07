import {requireAdmin} from '@/lib/auth/guards';
import {PageHeader} from '@/components/admin/ui';
import {VocabBoard} from '@/components/admin/vocab-board';
import {FREE_LIMIT} from '@/lib/vocab-constants';
export const dynamic='force-dynamic';
export const metadata={title:'Vocabulary'};
export default async function Page(){
 await requireAdmin();
 return <div><PageHeader title="Vocabulary" sub="Every word, meaning, example and quiz question learners see. Edit, add, hide or reorder."/><VocabBoard freeLimit={FREE_LIMIT}/></div>;
}
