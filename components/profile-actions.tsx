import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item";
import { Edit, Coins, Gift, HelpCircle, NotepadText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileActions() {
  const router = useRouter();

  const baseItemClasses =
    "cursor-pointer rounded-lg border p-4 shadow-sm hover:bg-gray-300 dark:hover:bg-slate-800 transition";

  return (
    <div className="w-full grid gap-4">
      <Item
        onClick={() => router.push("/profile/edit")}
        className={baseItemClasses}
      >
        <ItemMedia variant="icon">
          <Edit className="h-6 w-6" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Edit Your Profile</ItemTitle>
          <ItemDescription>
            Update your personal details and preferences.
          </ItemDescription>
        </ItemContent>
      </Item>

      <Item
        onClick={() => router.push("/profile/coin_history")}
        className={baseItemClasses}
      >
        <ItemMedia variant="icon">
          <Coins className="h-6 w-6" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Check Coins History</ItemTitle>
          <ItemDescription>View your earned and spent coins.</ItemDescription>
        </ItemContent>
      </Item>

      <Item
        onClick={() => router.push("/profile/refer_and_earn")}
        className={baseItemClasses}
      >
        <ItemMedia variant="icon">
          <Gift className="h-6 w-6" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Refer and Earn</ItemTitle>
          <ItemDescription>Invite friends and earn .</ItemDescription>
        </ItemContent>
      </Item>

      <Item
        onClick={() => router.push("/profile/help_and_support")}
        className={baseItemClasses}
      >
        <ItemMedia variant="icon">
          <HelpCircle className="h-6 w-6" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Help and Support</ItemTitle>
          <ItemDescription>Get assistance with your account.</ItemDescription>
        </ItemContent>
      </Item>

      <Item
        onClick={() => router.push("/profile/faqs")}
        className={baseItemClasses}
      >
        <ItemMedia variant="icon">
          <NotepadText className="h-6 w-6" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>FAQs</ItemTitle>
          <ItemDescription>
            Find quick answers to common questions.
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}
