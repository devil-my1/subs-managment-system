import Shell from "@/components/layout/Shell";

export default function SettingsPage() {
  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-[#ab9db9] text-sm">Update your preferences</p>
        <div className="rounded-2xl bg-[#231b2e] border border-[#342a45] p-6 text-[#ab9db9] text-sm">
          Settings content coming soon.
        </div>
      </div>
    </Shell>
  );
}
