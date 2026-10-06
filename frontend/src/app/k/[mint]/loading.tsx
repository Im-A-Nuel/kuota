import { SkeletonLines } from "@/components/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="skeleton h-56 rounded-panel" />
      <div className="mt-10">
        <SkeletonLines count={5} label="Loading kuota" />
      </div>
    </div>
  );
}
