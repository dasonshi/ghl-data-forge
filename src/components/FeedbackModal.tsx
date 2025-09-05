import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Send } from "lucide-react";
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
  screenshots: File[];
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
    screenshots: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    );
    
    setForm(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, ...newFiles].slice(0, 5), // Max 5 files
    }));
  };

  const removeFile = (index: number) => {
    setForm(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
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
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('component', form.component === 'other' ? form.otherComponent : form.component);
      formData.append('message', form.message);
      
      // Add screenshots
      form.screenshots.forEach((file, index) => {
        formData.append(`screenshot_${index}`, file);
      });

      console.log('🚀 Sending feedback to webhook...');
      
      const response = await fetch('https://services.leadconnectorhq.com/hooks/gdzneuvA9mUJoRroCv4O/webhook-trigger/8ec895cf-7784-4ca4-8856-a891acaa1e6d', {
        method: 'POST',
        mode: 'no-cors', // This bypasses CORS but we won't get response details
        body: formData,
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
        screenshots: [],
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

          <div className="space-y-3">
            <Label>Screenshots (optional)</Label>
            <div className="space-y-3">
              <Card className="border-dashed border-2 border-muted-foreground/25">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload screenshots to help us understand your issue
                    </p>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('screenshot-upload')?.click()}
                    >
                      Choose Files
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 5 files, 10MB each
                    </p>
                  </div>
                </CardContent>
              </Card>

              {form.screenshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Files:</p>
                  {form.screenshots.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
        </form>
      </DialogContent>
    </Dialog>
  );
}