import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="eyebrow">404</div>
      <h1 className="display mt-2 text-[4rem]">Air ball.</h1>
      <p className="mt-2 text-ink-2">That page isn&apos;t on this court.</p>
      <Link href="/" className="btn-ball mt-6">Back home</Link>
    </div>
  );
}
