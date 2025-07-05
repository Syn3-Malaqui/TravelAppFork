# S3 Upload Fix - Bucket Policy Configuration

## Problem
Your S3 uploads are failing because AWS deprecated ACLs (Access Control Lists) in April 2023. The error "The bucket does not allow ACLs" occurs because your bucket `travelstorage9090` was created after this date.

## Solution Applied
✅ **Code Updated**: Removed deprecated `ACL: 'public-read'` parameter from upload command in `src/lib/storage.ts`

## Required AWS Configuration

### Step 1: Enable Public Access (if needed)
1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click on your bucket: `travelstorage9090`
3. Go to the **Permissions** tab
4. Under **Block public access (bucket settings)**, click **Edit**
5. **Uncheck** "Block all public access"
6. **Save changes** and confirm

### Step 2: Add Bucket Policy
1. Still in the **Permissions** tab, scroll down to **Bucket policy**
2. Click **Edit** and paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::travelstorage9090/*"
        }
    ]
}
```

3. **Save changes**

### Step 3: Verify CORS Configuration
1. In the **Permissions** tab, scroll to **Cross-origin resource sharing (CORS)**
2. Click **Edit** and ensure this configuration is present:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

## Testing
1. Start your development server: `npm run dev`
2. Go to the compose page or profile edit page
3. Try uploading an image
4. Check browser console for debug logs starting with "S3 DEBUG"

## Expected Behavior
- Images should upload successfully without ACL errors
- Images should be publicly accessible at: `https://travelstorage9090.s3.eu-north-1.amazonaws.com/[filename]`
- Debug logs should show successful uploads

## If Still Having Issues
Check the browser console for:
- **S3 DEBUG** logs showing bucket/region/file info
- **Error messages** with specific AWS error codes
- **Network tab** for failed HTTP requests

The most common remaining issues are:
1. IAM permissions (ensure your user has s3:PutObject permission)
2. CORS configuration (if uploading from browser)
3. Bucket policy not properly saved 