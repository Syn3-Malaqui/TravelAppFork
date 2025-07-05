# AWS S3 Setup Guide

## Prerequisites
You need an AWS account and have created an S3 bucket for storing media files.

## Step 1: Create an IAM User
1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Give it a name like `travelapp-s3-user`
4. Attach the following policy (or create a custom one):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME",
                "arn:aws:s3:::YOUR-BUCKET-NAME/*"
            ]
        }
    ]
}
```

5. Create access keys for this user and save them securely

## Step 2: Configure S3 Bucket
1. **Enable public access (if needed)**: If your bucket was created after April 2023, you'll need to enable public access:
   - Go to your S3 bucket in AWS Console
   - Click on the "Permissions" tab
   - Under "Block public access (bucket settings)", click "Edit"
   - Uncheck "Block all public access" and confirm the changes

2. **Set up bucket policy for public read access**:
   - In the "Permissions" tab, scroll down to "Bucket policy"
   - Click "Edit" and add the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

**Important**: Replace `YOUR-BUCKET-NAME` with your actual bucket name.

3. **Set up CORS policy**:

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

## Step 3: Update Environment Variables
Update your `.env` file with your actual AWS credentials:

```bash
VITE_AWS_ACCESS_KEY_ID=your_actual_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_actual_secret_key_here
VITE_AWS_REGION=your_bucket_region  # e.g., us-east-1, eu-west-1
VITE_S3_BUCKET=your_actual_bucket_name
```

## Step 4: Test the Setup
1. Start your development server: `npm run dev`
2. Go to the compose page
3. Try uploading an image
4. Check that the image URL starts with `https://your-bucket-name.s3.region.amazonaws.com/`

## Important Notes
- The app is now configured to use S3 instead of Supabase Storage
- All existing functionality remains the same from a user perspective
- Images will be stored in S3 with the format: `userId/timestamp-random.extension`
- Make sure to add your production domain to the CORS policy when deploying

## Troubleshooting
- **If uploads fail with "The bucket does not allow ACLs"**: This means your bucket was created after April 2023 and has ACLs disabled. The code has been updated to work without ACLs.
- **If uploads fail**, check your AWS credentials and IAM permissions
- **If images don't load**, verify the bucket's public access settings and bucket policy
- **Check the browser console** for any CORS errors
- **If you get access denied errors**, ensure your IAM user has the following permissions:
  - `s3:PutObject`
  - `s3:GetObject`  
  - `s3:DeleteObject`
  - `s3:ListBucket`

## Common Issues After April 2023
AWS changed S3 security defaults in April 2023. If you're having issues:

1. **ACL errors**: The app no longer uses ACLs (they're deprecated). Instead, it relies on bucket policies.
2. **Public access blocked**: New buckets block public access by default. You need to manually enable it if you want public read access to images.
3. **Object ownership**: New buckets use "Bucket owner enforced" by default, which disables ACLs entirely.

## Manual Steps to Fix Your Bucket
If you're still having issues, follow these manual steps:

1. **Go to AWS S3 Console** → Your bucket → Permissions tab
2. **Block public access**: Edit and uncheck "Block all public access"
3. **Bucket policy**: Add the policy mentioned in Step 2 above
4. **Object Ownership**: Should be set to "Bucket owner enforced" (default for new buckets)
5. **CORS**: Add the CORS configuration mentioned in Step 3 above 