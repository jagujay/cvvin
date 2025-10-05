#!/usr/bin/env python3
"""
Test script for CVVIN Analysis Service
Run this to verify the setup is working correctly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import test_connection, create_tables
from app.core.logging import logger

def test_configuration():
    """Test configuration loading"""
    print("🔧 Testing configuration...")
    print(f"   Database URL: {settings.database_url}")
    print(f"   Upload directory: {settings.upload_dir}")
    print(f"   Max DB file size: {settings.max_db_file_size / (1024*1024):.1f}MB")
    print(f"   Max file size: {settings.max_file_size / (1024*1024):.1f}MB")
    print(f"   Ollama host: {settings.ollama_host}")
    print("✅ Configuration loaded successfully")

def test_database():
    """Test database connection"""
    print("\n🗄️  Testing database connection...")
    if test_connection():
        print("✅ Database connection successful")
        try:
            create_tables()
            print("✅ Database tables created successfully")
        except Exception as e:
            print(f"❌ Failed to create tables: {e}")
            return False
    else:
        print("❌ Database connection failed")
        return False
    return True

def test_directories():
    """Test directory structure"""
    print("\n📁 Testing directory structure...")
    directories = [
        settings.upload_dir,
        os.path.join(settings.upload_dir, 'users'),
        os.path.join(settings.upload_dir, 'temp'),
        os.path.join(settings.upload_dir, 'backups')
    ]
    
    for directory in directories:
        if os.path.exists(directory):
            print(f"✅ Directory exists: {directory}")
        else:
            print(f"❌ Directory missing: {directory}")
            return False
    return True

def main():
    """Run all tests"""
    print("🚀 CVVIN Analysis Service - Setup Test")
    print("=" * 50)
    
    tests = [
        test_configuration,
        test_database,
        test_directories
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Setup is ready.")
        print("\nNext steps:")
        print("1. Install Python dependencies: pip install -r requirements.txt")
        print("2. Copy env.example to .env and update database credentials")
        print("3. Run the service: python -m app.main")
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()


