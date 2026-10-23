"use client";
export function AdminAudioUploader(props: { value?: string; onChange?: (url: string) => void; onUploadComplete?: (url: string) => void; [key: string]: unknown }) {
  return <label className="flex flex-col gap-2 text-sm">Audio URL (HTTPS)<input className="border rounded px-3 py-2 w-full" type="url" value={props.value || ''} placeholder="https://…/listening.mp3" onChange={e => { props.onChange?.(e.target.value); props.onUploadComplete?.(e.target.value); }} /></label>;
}
