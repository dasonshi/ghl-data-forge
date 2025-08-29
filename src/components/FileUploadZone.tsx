import { useCallback, useState } from "react";
import { Upload, File, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  selectedFile?: File | null;
  className?: string;
}

export function FileUploadZone({ 
  onFileSelect, 
  acceptedTypes = ".csv",
  maxSize = 10,
  selectedFile: externalSelectedFile,
  className 
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalSelectedFile, setInternalSelectedFile] = useState<File | null>(null);
  
  // Use external file if provided, otherwise use internal state
  const selectedFile = externalSelectedFile || internalSelectedFile;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize * 1024 * 1024) {
        if (!externalSelectedFile) {
          setInternalSelectedFile(file);
        }
        onFileSelect(file);
      }
    }
  }, [maxSize, onFileSelect]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!externalSelectedFile) {
        setInternalSelectedFile(file);
      }
      onFileSelect(file);
    }
  }, [onFileSelect, externalSelectedFile]);

  const clearFile = useCallback(() => {
    if (!externalSelectedFile) {
      setInternalSelectedFile(null);
    }
  }, [externalSelectedFile]);

  return (
    <div
      className={cn(
        "border-2 border-dashed transition-all duration-200 rounded-lg",
        isDragOver 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/30 hover:border-primary/50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label 
        htmlFor="file-upload"
        className="relative block p-8 text-center space-y-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg"
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-success">
              <File className="h-8 w-8" />
              <span className="font-medium">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  clearFile();
                }}
                className="h-6 w-6 p-0"
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground">
                Supports {acceptedTypes} files up to {maxSize}MB
              </p>
            </div>
            <Button variant="outline" type="button" className="mt-4">
              Browse Files
            </Button>
          </>
        )}
        
        <input
          id="file-upload"
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}