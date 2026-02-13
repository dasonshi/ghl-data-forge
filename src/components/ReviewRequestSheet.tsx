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
      <SheetContent side="right" className="w-[340px] sm:w-[400px]">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <SheetTitle>Enjoying Data Forge?</SheetTitle>
          </div>
          <SheetDescription className="text-base">
            If you're finding this tool useful, we'd really appreciate a quick review
            on the GHL marketplace. Your feedback helps other agencies discover the app!
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 mt-8">
          <Button onClick={onReview} className="w-full">
            Leave a Review
          </Button>
          <Button onClick={onLater} variant="outline" className="w-full">
            Maybe Later
          </Button>
        </div>

        <SheetFooter className="mt-6">
          <button
            onClick={onNever}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            No thanks, never ask again
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
