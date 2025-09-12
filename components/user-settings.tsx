"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import UsageInfo from "./usage-info";
import { useAppStore } from "@store/app-store";
import { useUserInitialization } from "@providers/user-provider";
import SettingsDialog from "./dialogs/settings-dialog";

interface UserSettingsProps {}

const UserSettings = ({}: UserSettingsProps) => {
  const { user } = useUser();
  const { isUsageRestricted, messageCount, fileCount } = useAppStore();
  const { isInitialized } = useUserInitialization();

  return (
    <div className="flex flex-col gap-5 dark:border-neutral-700">
      {isInitialized && (
        <UsageInfo
          isUsageRestricted={isUsageRestricted}
          messageCount={messageCount}
          chatCount={fileCount}
        />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserButton />
          <p className="text-neutral-900 dark:text-neutral-400">
            {user?.fullName}
          </p>
        </div>
        <SettingsDialog />
      </div>
    </div>
  );
};

export default UserSettings;
