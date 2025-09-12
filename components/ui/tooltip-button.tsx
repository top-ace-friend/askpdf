import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip";
import { FunctionComponent } from "react";
import { Button } from "./button";
import { cn } from "@lib/utils";

interface TooltipButtonProps {
  icon: any;
  tooltipText: string;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}

const TooltipButton: FunctionComponent<
  TooltipButtonProps & React.ComponentPropsWithoutRef<typeof TooltipContent>
> = ({ icon, tooltipText, className, iconClassName, onClick, ...props }) => {
  const Icon = icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            className={cn(
              "bg-transparent hover:bg-transparent p-0 w-fit h-fit",
              className
            )}
            size="sm"
            onClick={onClick}
          >
            <Icon
              size={15}
              className={cn(
                "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300",
                iconClassName
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent {...props}>
          <p className="text-sm">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipButton;
