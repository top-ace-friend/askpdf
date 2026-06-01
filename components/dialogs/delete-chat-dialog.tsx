import { Button } from "@components/ui/button";
import {
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@components/ui/dialog";
import { Loader2 } from "lucide-react";

interface DeleteChatDialogProps {
  showDeleteDialog: boolean;
  pdfName: string;
  isPending: boolean;
  setShowDeleteDialog: (showDeleteDialog: boolean) => void;
  cancelDeleteChat: () => void;
  confirmDeleteChat: () => void;
}

const DeleteChatDialog = ({
  showDeleteDialog,
  setShowDeleteDialog,
  pdfName,
  cancelDeleteChat,
  confirmDeleteChat,
  isPending,
}: DeleteChatDialogProps) => {
  return (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Chat</DialogTitle>
          <DialogDescription>
            <p className="mt-2">
              Are you sure you want to delete this chat with{" "}
              <span className="font-semibold">{pdfName}</span>? This action
              cannot be undone and will permanently remove all messages in this
              conversation.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={cancelDeleteChat}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteChat}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteChatDialog;
