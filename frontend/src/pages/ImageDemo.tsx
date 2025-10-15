import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SecureImage from '@/components/ui/secure-image';
import { SecureAvatar } from '@/components/ui/secure-avatar';
import ImageGallery from '@/components/ui/image-gallery';
import { useAuth } from '@/contexts/AuthContext';
import { consolidatedAPI } from '@/services/consolidatedAPI';
import { extractFileIdFromUrl, generateAvatarFallback, getImageDimensions, getImageQuality } from '@/lib/image-utils';
import { Upload, Download, Eye, Settings, Image as ImageIcon } from 'lucide-react';
import Layout from '@/components/layout/Layout';

const ImageDemo = () => {
  const { currentUser } = useAuth();
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSettings, setImageSettings] = useState({
    width: 300,
    height: 200,
    quality: 80,
    format: 'jpeg' as 'webp' | 'jpeg' | 'png'
  });

  // Load user files
  useEffect(() => {
    const loadUserFiles = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const files = await consolidatedAPI.getUserFiles(currentUser);
        setUserFiles(files);
      } catch (error) {
        console.error('Failed to load files:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserFiles();
  }, [currentUser]);

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !currentUser) return;

    try {
      setUploading(true);
      const result = await consolidatedAPI.uploadFile(currentUser, selectedFile);
      
      // Reload files
      const files = await consolidatedAPI.getUserFiles(currentUser);
      setUserFiles(files);
      
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Filter image files
  const imageFiles = userFiles.filter(file => 
    file.mimeType && file.mimeType.startsWith('image/')
  );

  // Get sample image for testing
  const sampleImage = imageFiles[0];

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Image Handling Demo</h1>
          <p className="text-muted-foreground">
            Test the secure image handling system with resizing, format conversion, and optimization.
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Select Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                
                {selectedFile && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Image Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading images...</div>
                ) : (
                  <ImageGallery
                    images={imageFiles.map(file => ({
                      id: file.id,
                      name: file.fileName,
                      url: file.filePath,
                      fileId: file.id,
                      uploadedAt: file.createdAt
                    }))}
                    columns={4}
                    showActions={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Avatar Testing */}
              <Card>
                <CardHeader>
                  <CardTitle>Avatar Components</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <SecureAvatar
                      fileId={sampleImage?.id}
                      imageUrl={sampleImage?.filePath}
                      fallbackText="U"
                      size={40}
                      quality={85}
                    />
                    <SecureAvatar
                      fileId={sampleImage?.id}
                      imageUrl={sampleImage?.filePath}
                      fallbackText="U"
                      size={60}
                      quality={85}
                    />
                    <SecureAvatar
                      fileId={sampleImage?.id}
                      imageUrl={sampleImage?.filePath}
                      fallbackText="U"
                      size={80}
                      quality={85}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Different avatar sizes (40px, 60px, 80px)
                  </p>
                </CardContent>
              </Card>

              {/* Image Resizing Testing */}
              <Card>
                <CardHeader>
                  <CardTitle>Image Resizing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sampleImage ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Original</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="Original"
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Resized (150x100)</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="Resized"
                          width={150}
                          height={100}
                          quality={80}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Upload an image to test resizing</p>
                  )}
                </CardContent>
              </Card>

              {/* Format Testing */}
              <Card>
                <CardHeader>
                  <CardTitle>Format Conversion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sampleImage ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">JPEG</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="JPEG"
                          format="jpeg"
                          quality={80}
                          className="w-full h-24 object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">PNG</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="PNG"
                          format="png"
                          quality={80}
                          className="w-full h-24 object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">WebP</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="WebP"
                          format="webp"
                          quality={80}
                          className="w-full h-24 object-cover rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Upload an image to test formats</p>
                  )}
                </CardContent>
              </Card>

              {/* Thumbnail Testing */}
              <Card>
                <CardHeader>
                  <CardTitle>Thumbnail Generation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sampleImage ? (
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">50px</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="50px thumbnail"
                          thumbnail={true}
                          size={50}
                          className="w-12 h-12 object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">100px</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="100px thumbnail"
                          thumbnail={true}
                          size={100}
                          className="w-24 h-24 object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">150px</p>
                        <SecureImage
                          fileId={sampleImage.id}
                          imageUrl={sampleImage.filePath}
                          alt="150px thumbnail"
                          thumbnail={true}
                          size={150}
                          className="w-36 h-36 object-cover rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Upload an image to test thumbnails</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Image Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={imageSettings.width}
                      onChange={(e) => setImageSettings({
                        ...imageSettings,
                        width: parseInt(e.target.value) || 300
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={imageSettings.height}
                      onChange={(e) => setImageSettings({
                        ...imageSettings,
                        height: parseInt(e.target.value) || 200
                      })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quality">Quality (1-100)</Label>
                    <Input
                      id="quality"
                      type="number"
                      min="1"
                      max="100"
                      value={imageSettings.quality}
                      onChange={(e) => setImageSettings({
                        ...imageSettings,
                        quality: parseInt(e.target.value) || 80
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <select
                      id="format"
                      value={imageSettings.format}
                      onChange={(e) => setImageSettings({
                        ...imageSettings,
                        format: e.target.value as 'webp' | 'jpeg' | 'png'
                      })}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="jpeg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </div>
                </div>

                {/* Preview with current settings */}
                {sampleImage && (
                  <div className="mt-6">
                    <Label>Preview with Current Settings</Label>
                    <div className="mt-2">
                      <SecureImage
                        fileId={sampleImage.id}
                        imageUrl={sampleImage.filePath}
                        alt="Preview"
                        width={imageSettings.width}
                        height={imageSettings.height}
                        quality={imageSettings.quality}
                        format={imageSettings.format}
                        className="border rounded"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ImageDemo;
