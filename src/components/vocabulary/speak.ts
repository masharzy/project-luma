export function speak(text:string,rate=0.9){
 try{const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=rate;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch{/* speech not supported */}
}
