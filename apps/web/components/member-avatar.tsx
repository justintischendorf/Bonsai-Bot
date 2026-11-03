import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Member } from "@/hooks/use-discord-member-info";

export function MemberAvatar({ member }: { member: Member }) {
  return (
    <Avatar size="lg">
      <AvatarImage src={member.avatarUrl} alt={member.name} />
      <AvatarFallback>{[...member.name][0]?.toUpperCase()}</AvatarFallback>
      <AvatarBadge
        className={member.online ? "bg-positive" : "bg-destructive"}
      />
    </Avatar>
  );
}
