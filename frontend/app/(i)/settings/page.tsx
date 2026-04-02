import Shell from "@/components/layout/Shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SectionCard } from "@/components/ui/SectionCard"
import AccountTab from "@/components/settings/AccountTab"

export default function SettingsPage() {
	return (
		<Shell>
			<div className="flex flex-col gap-6">
				<div>
					<h2 className="text-white text-2xl font-semibold">Settings</h2>
					<p className="text-[#ab9db9] text-sm mt-1">Manage your account</p>
				</div>
				<Tabs defaultValue="account">
					<TabsList className="bg-surface-2 rounded-lg p-1 w-full sm:w-auto">
						<TabsTrigger
							value="account"
							className="data-[state=active]:bg-primary data-[state=active]:text-white text-text-muted"
						>
							Account
						</TabsTrigger>
						<TabsTrigger
							value="notifications"
							className="data-[state=active]:bg-primary data-[state=active]:text-white text-text-muted"
						>
							Notifications
						</TabsTrigger>
						<TabsTrigger
							value="appearance"
							className="data-[state=active]:bg-primary data-[state=active]:text-white text-text-muted"
						>
							Appearance
						</TabsTrigger>
					</TabsList>
					<TabsContent value="account">
						<AccountTab />
					</TabsContent>
					<TabsContent value="notifications">
						<SectionCard className="p-6">
							<p className="text-[#ab9db9] text-sm">Coming soon.</p>
						</SectionCard>
					</TabsContent>
					<TabsContent value="appearance">
						<SectionCard className="p-6">
							<p className="text-[#ab9db9] text-sm">Coming soon.</p>
						</SectionCard>
					</TabsContent>
				</Tabs>
			</div>
		</Shell>
	)
}
