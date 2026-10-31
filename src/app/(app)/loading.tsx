import Loader from "@/components/kokonutui/loader";

export default function Loading() {
  return <div className="flex min-h-[55vh] items-center justify-center"><Loader title="Menyiapkan workspace" subtitle="Data Anda sedang dimuat." size="sm" /></div>;
}
