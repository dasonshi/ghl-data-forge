import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FeedbackForm {
  name: string;
  email: string;
  component: string;
  otherComponent: string;
  message: string;
}

const COMPONENT_OPTIONS = [
  { value: "object_import", label: "Object Import" },
  { value: "value_update", label: "Value Update" },
  { value: "field_import", label: "Field Import" },
  { value: "record_import_update", label: "Record Import / Update" },
  { value: "other", label: "Other" },
];

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [form, setForm] = useState<FeedbackForm>({
    name: "",
    email: "",
    component: "",
    otherComponent: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.component || !form.message) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        component: form.component === 'other' ? form.otherComponent : form.component,
        message: form.message,
      };

      console.log('🚀 Sending feedback...');
      
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('✅ Feedback sent successfully');
      
      toast({
        title: "Feedback Sent!",
        description: "Thank you for your feedback. We'll get back to you soon.",
      });
      
      // Reset form
      setForm({
        name: "",
        email: "",
        component: "",
        otherComponent: "",
        message: "",
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ Feedback submission error:', error);
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, questions, or issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="component">Component *</Label>
            <Select value={form.component} onValueChange={(value) => handleInputChange('component', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select the component you're asking about" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                {COMPONENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.component === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="otherComponent">Please specify *</Label>
              <Input
                id="otherComponent"
                value={form.otherComponent}
                onChange={(e) => handleInputChange('otherComponent', e.target.value)}
                placeholder="Describe the component or feature"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Describe your question, issue, or feedback..."
              className="min-h-[120px]"
              required
            />
          </div>


          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                onOpenChange(false);
                // Scroll to help documentation
                const helpSection = document.getElementById('help-documentation');
                if (helpSection) {
                  helpSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
            >
              Help
            </Button>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}