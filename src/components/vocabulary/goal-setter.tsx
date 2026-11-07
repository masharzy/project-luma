'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from './vocabulary.module.css';
export function GoalSetter({goal}:{goal:number}){
 const router=useRouter();const [v,setV]=useState(goal),[busy,setBusy]=useState(false);
 async function save(n:number){setV(n);setBusy(true);await fetch('/api/vocabulary/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dailyGoal:n})}).catch(()=>{});setBusy(false);router.refresh();}
 return <label className={styles.goalSet}><select disabled={busy} value={v} onChange={e=>void save(Number(e.target.value))} aria-label="Daily goal">{[...new Set([5,10,15,20,30,50,goal])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} cards a day</option>)}</select></label>;
}
