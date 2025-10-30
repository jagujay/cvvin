import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { consolidatedAPI } from '@/services/consolidatedAPI';
import { Download, Eye, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurePDFViewerProps {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  className?: string;
  showDownload?: boolean;
  showInfo?: boolean;
  height?: string;
}

const SecurePDFViewer: React.FC<SecurePDFViewerProps> = ({
  fileId,
  fileName = 'Resume',
  fileSize,
  className = '',
  showDownload = true,
  showInfo = true,
  height = '600px'
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      if (!fileId || !currentUser) {
        setLoading(false);
        return;
      }

      // Clean up previous URL if it exists
      if (objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      try {
        setLoading(true);
        setError(false);

        // Get file info first (optional)
        try {
          const info = await consolidatedAPI.getFileInfo(currentUser, fileId);
          setFileInfo(info);
        } catch (infoError) {
          console.warn('Could not get file info:', infoError);
          // Continue even if file info fails
        }

        // Download PDF as blob and create object URL for iframe
        // This works because iframes can't send custom auth headers
        const blob = await consolidatedAPI.downloadFile(currentUser, fileId);
        const objectUrl = window.URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
      } catch (error) {
        console.error('Failed to load PDF:', error);
        setError(true);
        toast({
          variant: "destructive",
          title: "Failed to Load PDF",
          description: "Could not load the PDF file. Please try again."
        });
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
    
    // Cleanup: revoke object URL when component unmounts or dependencies change
    return () => {
      if (objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [fileId, currentUser, toast]);

  const handleDownload = async () => {
    if (!fileId || !currentUser) return;

    try {
      const blob = await consolidatedAPI.downloadFile(currentUser, fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'resume.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not download the PDF file. Please try again."
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading PDF...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !pdfUrl) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">Failed to load PDF</p>
            {showDownload && (
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showInfo && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{fileName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {fileSize && (
                <Badge variant="secondary">
                  {formatFileSize(fileSize)}
                </Badge>
              )}
              {showDownload && (
                <Button onClick={handleDownload} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="relative" style={{ height: showInfo ? `calc(${height} - 80px)` : height }}>
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0 rounded-b-lg"
            title={fileName}
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurePDFViewer;
