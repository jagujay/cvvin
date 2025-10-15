#!/bin/bash

echo "🖼️ Setting up CVVIN Image Handling System"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f "package.json" ]; then
    echo "❌ Error: Backend package.json not found"
    exit 1
fi

# Install Sharp for image processing
echo "Installing Sharp for image processing..."
npm install sharp@^0.33.0

if [ $? -eq 0 ]; then
    echo "✅ Sharp installed successfully"
else
    echo "❌ Failed to install Sharp"
    exit 1
fi

cd ..

echo "🔧 Backend setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Start your backend server: cd backend && npm start"
echo "2. Start your frontend server: cd frontend && npm start"
echo "3. Visit http://localhost:5173/image-demo to test the system"
echo "4. Upload some images and test the features"
echo ""
echo "📚 Documentation:"
echo "- Image handling guide: docs/image-handling-guide.md"
echo "- Frontend update summary: docs/frontend-image-update-summary.md"
echo "- File access guide: docs/file-access-guide.md"
echo ""
echo "🎉 Image system setup complete!"
