import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ReviewRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: () => void;
  onLater: () => void;
  onNever: () => void;
}

export function ReviewRequestSheet({
  open,
  onOpenChange,
  onReview,
  onLater,
  onNever,
}: ReviewRequestSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <div className="max-w-lg mx-auto">
          <SheetHeader className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <SheetTitle>Enjoying Custom Data Importer?</SheetTitle>
            </div>
            <SheetDescription className="text-base">
              If you're finding this tool useful, we'd really appreciate a quick review
              on the GHL marketplace. Your feedback helps other agencies discover the app!
            </SheetDescription>
          </SheetHeader>

          <div className="flex gap-3 mt-6 justify-center">
            <Button onClick={onLater} variant="outline">
              Maybe Later
            </Button>
            <Button onClick={onReview}>
              Leave a Review
            </Button>
          </div>

          <SheetFooter className="mt-4 justify-center">
            <button
              onClick={onNever}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              No thanks, never ask again
            </button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
