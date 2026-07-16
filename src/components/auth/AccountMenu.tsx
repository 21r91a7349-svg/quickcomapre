'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "next-auth";
import { login, logout } from "@/app/actions/auth";
import { LogOut, User as UserIcon, Settings, Bell } from "lucide-react";

interface AccountMenuProps {
  user: User | undefined;
}

export function AccountMenu({ user }: AccountMenuProps) {
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => login()}>
        Sign In
      </Button>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src={user.image || ''} alt={user.name || 'User avatar'} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Bell className="mr-2 h-4 w-4" />
          <span>My Alerts</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-red-500 focus:text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
