import { toast } from "@/hooks/use-toast";

export async function copyToClipboard(text: string, label: string = "Text") {
  let copied = false;
  
  // Try modern API first (will fail in iframe)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.log('Modern clipboard API blocked, trying fallback...');
  }
  
  // Try fallback if modern API failed
  if (!copied) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      copied = document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }
  
  // Show result
  if (copied) {
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  } else {
    toast({
      title: "Copy manually",
      description: text,
      duration: 10000, // Show for longer so user can copy
    });
  }
  
  return copied;
}