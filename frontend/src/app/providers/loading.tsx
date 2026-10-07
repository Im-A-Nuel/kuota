import { SkeletonLines } from "@/components/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className="text-5xl font-light">Providers</h1>
      <div className="mt-10">
        <SkeletonLines count={4} label="Loading providers" />
      </div>
    </div>
  );
}
