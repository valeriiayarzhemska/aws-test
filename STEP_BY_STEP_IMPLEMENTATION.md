# Step-by-Step CI/CD Implementation Guide

**Goal:** Create a full CI/CD pipeline that pushes code to Git → builds via CodeBuild → deploys to S3 → serves via CloudFront, with environment variables stored in a separate S3 bucket.

**Estimated Time:** 2-3 hours  
**Difficulty:** Intermediate

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS Account created ([Sign up here](https://portal.aws.amazon.com/billing/signup))
- [ ] AWS CLI installed ([Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- [ ] Git repository (GitHub, GitLab, or CodeCommit)
- [ ] Your OPENAI_API_KEY ready
- [ ] This Next.js project ready to deploy

---

## PART 1: Initial AWS Setup (15 minutes)

### Step 1.1: Configure AWS CLI

Open your terminal and configure AWS credentials:

```bash
aws configure
```

Enter when prompted:

- **AWS Access Key ID**: Get from [IAM Console → Users → Security credentials](https://console.aws.amazon.com/iam/home#/users)
- **AWS Secret Access Key**: Get from same location
- **Default region**: `us-east-1` (recommended for CloudFront)
- **Default output format**: `json`

**Verify it works:**

```bash
aws sts get-caller-identity
```

You should see your AWS account details.

### Step 1.2: Set Your Configuration Variables

Create a file to store your configuration (don't commit this):

```bash
# Create config file
cat > aws-config.env <<EOF
# Replace these with your actual values
PROJECT_NAME="nextjs-chat-app"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
GITHUB_REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO"
GITHUB_BRANCH="main"
OPENAI_API_KEY="your-actual-openai-key-here"
EOF

# Load the config
source aws-config.env

echo "✅ Configuration loaded!"
echo "Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Project: $PROJECT_NAME"
```

---

## PART 2: Create S3 Buckets (10 minutes)

### Step 2.1: Create Hosting S3 Bucket

This bucket will store your built Next.js application.

**Option A: Using AWS Console**

1. Go to [S3 Console](https://s3.console.aws.amazon.com/s3/home)
2. Click **"Create bucket"**
3. **Bucket name**: `${PROJECT_NAME}-hosting` (e.g., `nextjs-chat-app-hosting`)
   - ⚠️ Must be globally unique
   - ⚠️ No uppercase, no underscores
4. **Region**: Select `us-east-1`
5. **Block Public Access**: Keep all checked for now (CloudFront will access it)
6. Click **"Create bucket"**

**Option B: Using AWS CLI**

```bash
# Set bucket name
HOSTING_BUCKET="${PROJECT_NAME}-hosting"

# Create bucket
aws s3 mb s3://$HOSTING_BUCKET --region $AWS_REGION

# Verify creation
aws s3 ls | grep $HOSTING_BUCKET
```

✅ **Checkpoint:** You should see your bucket listed at [S3 Console](https://s3.console.aws.amazon.com/s3/buckets)

### Step 2.2: Create Environment Variables S3 Bucket

This bucket will store your sensitive environment variables.

**Using AWS CLI:**

```bash
# Set bucket name
ENV_BUCKET="${PROJECT_NAME}-env-vars"

# Create bucket
aws s3 mb s3://$ENV_BUCKET --region $AWS_REGION

# Block ALL public access (important for security)
aws s3api put-public-access-block \
  --bucket $ENV_BUCKET \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✅ Environment bucket created: $ENV_BUCKET"
```

### Step 2.3: Upload Environment Variables to S3

Create and upload your environment file:

```bash
# Create .env.production file (DO NOT commit this to git!)
cat > .env.production <<EOF
OPENAI_API_KEY=$OPENAI_API_KEY
# Add other environment variables here
EOF

# Upload to S3
aws s3 cp .env.production s3://$ENV_BUCKET/.env.production

# Verify upload
aws s3 ls s3://$ENV_BUCKET/

echo "✅ Environment variables uploaded"
```

✅ **Checkpoint:** Verify file exists at [S3 Console](https://s3.console.aws.amazon.com/s3/buckets) → Select your env bucket

---

## PART 3: Create IAM Roles (15 minutes)

### Step 3.1: Create CodeBuild Service Role

CodeBuild needs permissions to access S3, CloudWatch, and your environment bucket.

**Using AWS Console:**

1. Go to [IAM Roles Console](https://console.aws.amazon.com/iam/home#/roles)
2. Click **"Create role"**
3. **Trusted entity type**: AWS service
4. **Use case**: CodeBuild → Click **"Next"**
5. **Permissions policies** - Add these policies:
   - `AmazonS3FullAccess` (search and check)
   - `CloudWatchLogsFullAccess` (search and check)
   - `CloudFrontFullAccess` (search and check)
6. Click **"Next"**
7. **Role name**: `${PROJECT_NAME}-codebuild-role` (e.g., `nextjs-chat-app-codebuild-role`)
8. Click **"Create role"**

**Using AWS CLI:**

```bash
CODEBUILD_ROLE="${PROJECT_NAME}-codebuild-role"

# Create trust policy
cat > /tmp/codebuild-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "codebuild.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name $CODEBUILD_ROLE \
  --assume-role-policy-document file:///tmp/codebuild-trust.json

# Attach policies
aws iam attach-role-policy \
  --role-name $CODEBUILD_ROLE \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name $CODEBUILD_ROLE \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

aws iam attach-role-policy \
  --role-name $CODEBUILD_ROLE \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

echo "✅ CodeBuild role created: $CODEBUILD_ROLE"
```

### Step 3.2: Create CodePipeline Service Role

**Using AWS Console:**

1. Go to [IAM Roles Console](https://console.aws.amazon.com/iam/home#/roles)
2. Click **"Create role"**
3. **Trusted entity type**: AWS service
4. **Use case**: CodePipeline → Click **"Next"**
5. **Permissions** - AWS will automatically attach `AWSCodePipelineServiceRole-*`
6. **Additionally add**:
   - `AmazonS3FullAccess`
   - `AWSCodeBuildAdminAccess`
7. **Role name**: `${PROJECT_NAME}-pipeline-role`
8. Click **"Create role"**

**Using AWS CLI:**

```bash
PIPELINE_ROLE="${PROJECT_NAME}-pipeline-role"

# Create trust policy
cat > /tmp/pipeline-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "codepipeline.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name $PIPELINE_ROLE \
  --assume-role-policy-document file:///tmp/pipeline-trust.json

# Attach policies
aws iam attach-role-policy \
  --role-name $PIPELINE_ROLE \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name $PIPELINE_ROLE \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess

echo "✅ Pipeline role created: $PIPELINE_ROLE"
```

✅ **Checkpoint:** Verify both roles exist at [IAM Roles Console](https://console.aws.amazon.com/iam/home#/roles)

---

## PART 4: Update buildspec.yml (5 minutes)

Update the buildspec.yml to fetch environment variables from S3:

```bash
cat > buildspec.yml <<'EOF'
version: 0.2

env:
  variables:
    ENV_BUCKET: "REPLACE_WITH_YOUR_ENV_BUCKET_NAME"
    CLOUDFRONT_DISTRIBUTION_ID: "WILL_BE_SET_LATER"

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "Installing dependencies..."
      - npm ci

  pre_build:
    commands:
      - echo "Downloading environment variables from S3..."
      - aws s3 cp s3://$ENV_BUCKET/.env.production .env.production || echo "No env file found"
      - |
        if [ -f .env.production ]; then
          export $(cat .env.production | grep -v '^#' | xargs)
          echo "✅ Environment variables loaded"
        fi
      - echo "Node version: $(node --version)"
      - echo "NPM version: $(npm --version)"

  build:
    commands:
      - echo "Building Next.js application..."
      - npm run build
      - echo "Build completed!"

  post_build:
    commands:
      - echo "Listing build output..."
      - ls -la out/
      - |
        if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ] && [ "$CLOUDFRONT_DISTRIBUTION_ID" != "WILL_BE_SET_LATER" ]; then
          echo "Invalidating CloudFront cache..."
          aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
        fi

artifacts:
  files:
    - '**/*'
  base-directory: out
  discard-paths: no

cache:
  paths:
    - 'node_modules/**/*'
    - '.next/cache/**/*'
EOF

# Replace ENV_BUCKET with your actual bucket name
sed -i.bak "s|REPLACE_WITH_YOUR_ENV_BUCKET_NAME|$ENV_BUCKET|g" buildspec.yml
rm buildspec.yml.bak

echo "✅ buildspec.yml updated"
```

---

## PART 5: Create CloudFront Distribution (20 minutes)

CloudFront serves as your CDN to cache and deliver content globally.

### Step 5.1: Create CloudFront Origin Access Control (OAC)

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/v3/home)
2. In left menu, click **"Origin access"** (under Security section)
3. Click **"Create control setting"**
4. **Name**: `${PROJECT_NAME}-oac`
5. **Signing behavior**: Sign requests (recommended)
6. Click **"Create"**

### Step 5.2: Create CloudFront Distribution

1. Still in [CloudFront Console](https://console.aws.amazon.com/cloudfront/v3/home)
2. Click **"Create distribution"**

**Origin Settings:** 3. **Origin domain**: Click the dropdown and select your hosting S3 bucket

- Should look like: `nextjs-chat-app-hosting.s3.us-east-1.amazonaws.com`
- ⚠️ Don't use the website endpoint, use the bucket endpoint

4. **Origin path**: Leave blank
5. **Name**: Auto-filled, leave as is
6. **Origin access**: Select **"Origin access control settings (recommended)"**
7. **Origin access control**: Select the OAC you just created
8. **Enable Origin Shield**: No

**Default cache behavior:** 9. **Viewer protocol policy**: **"Redirect HTTP to HTTPS"** 10. **Allowed HTTP methods**: **"GET, HEAD, OPTIONS"** 11. **Cache policy**: **"CachingOptimized"** 12. **Origin request policy**: None

**Settings:** 13. **Price class**: **"Use all edge locations (best performance)"** 14. **Alternate domain names (CNAMEs)**: Leave blank for now 15. **Custom SSL certificate**: Leave as default 16. **Default root object**: `index.html` 17. **Description**: "Next.js app CDN"

18. Click **"Create distribution"**

### Step 5.3: Copy the Policy Statement

After creation, you'll see a **blue banner** at the top:

- Click **"Copy policy"** button
- This copies the S3 bucket policy you need

### Step 5.4: Update S3 Bucket Policy

1. Go to [S3 Console](https://s3.console.aws.amazon.com/s3/buckets)
2. Click your hosting bucket
3. Go to **"Permissions"** tab
4. Scroll to **"Bucket policy"** section
5. Click **"Edit"**
6. Paste the policy you copied from CloudFront
7. Click **"Save changes"**

**Alternative - Manual policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-HOSTING-BUCKET-NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

### Step 5.5: Configure Custom Error Responses

Back in CloudFront:

1. Go to your distribution
2. Click **"Error pages"** tab
3. Click **"Create custom error response"**
   - **HTTP error code**: 403
   - **Customize error response**: Yes
   - **Response page path**: `/404.html`
   - **HTTP Response code**: 404
   - Click **"Create"**
4. Repeat for 404 errors:
   - **HTTP error code**: 404
   - **Response page path**: `/404.html`
   - **HTTP Response code**: 404

### Step 5.6: Save Your Distribution ID

```bash
# List distributions and find yours
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,Origins.Items[0].DomainName]' --output table

# Save the distribution ID (starts with E...)
CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # Replace with your actual ID

# Add to your config
echo "CLOUDFRONT_DISTRIBUTION_ID=$CLOUDFRONT_DISTRIBUTION_ID" >> aws-config.env

echo "✅ CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
```

✅ **Checkpoint:** Your distribution should show "Enabled" status at [CloudFront Console](https://console.aws.amazon.com/cloudfront/v3/home#/distributions)

⏱️ **Note:** Distribution deployment takes 10-15 minutes. Continue to next steps while it deploys.

---

## PART 6: Create CodeBuild Project (15 minutes)

### Step 6.1: Create CodeBuild Project in Console

1. Go to [CodeBuild Console](https://console.aws.amazon.com/codesuite/codebuild/projects)
2. Click **"Create build project"**

**Project configuration:** 3. **Project name**: `${PROJECT_NAME}-build` (e.g., `nextjs-chat-app-build`) 4. **Description**: "Build Next.js application"

**Source:** 5. **Source provider**: Select your Git provider

- **GitHub**: Recommended
- **Bitbucket**
- **AWS CodeCommit**

6. If GitHub:
   - Click **"Connect to GitHub"** (or "Connect using OAuth" if first time)
   - Authorize AWS CodeBuild
   - **Repository**: Select your repository
   - **Source version**: `main` (or your branch name)

**Environment:** 7. **Environment image**: **"Managed image"** 8. **Operating system**: **"Amazon Linux"** 9. **Runtime(s)**: **"Standard"** 10. **Image**: **"aws/codebuild/standard:7.0"** (latest) 11. **Image version**: **"Always use the latest image"** 12. **Environment type**: **"Linux"** 13. **Service role**: **"Existing service role"** 14. **Role ARN**: Select your CodeBuild role created earlier

**Additional configuration (expand):** 15. **Environment variables** - Add these: - Name: `ENV_BUCKET`, Value: `YOUR-ENV-BUCKET-NAME`, Type: Plaintext - Name: `CLOUDFRONT_DISTRIBUTION_ID`, Value: `YOUR-DISTRIBUTION-ID`, Type: Plaintext

**Buildspec:** 16. **Build specifications**: **"Use a buildspec file"** 17. **Buildspec name**: `buildspec.yml`

**Artifacts:** 18. **Type**: **"Amazon S3"** 19. **Bucket name**: Select your hosting bucket 20. **Name**: Leave blank 21. **Path**: Leave blank 22. **Namespace type**: None 23. **Artifacts packaging**: **"None"** (extract files) 24. **Disable artifact encryption**: Check this box

**Logs:** 25. **CloudWatch logs**: Enabled (default) 26. **Group name**: Leave as default 27. **Stream name**: Leave as default

27. Click **"Create build project"**

### Step 6.2: Test the Build

```bash
# Start a build manually
aws codebuild start-build --project-name ${PROJECT_NAME}-build

# Watch the build (get the build ID from above command output)
# Or check in console: https://console.aws.amazon.com/codesuite/codebuild/projects
```

**In Console:**

1. Go to [CodeBuild Projects](https://console.aws.amazon.com/codesuite/codebuild/projects)
2. Click your project
3. Click **"Start build"**
4. Watch the **"Build logs"** tab to see progress

✅ **Checkpoint:** Build should complete successfully and upload files to S3

**If build fails**, check:

- CloudWatch logs for error messages
- IAM role permissions
- buildspec.yml syntax
- Environment variables are set correctly

---

## PART 7: Create CodePipeline (20 minutes)

Now connect everything: Git → CodeBuild → S3 → CloudFront

### Step 7.1: Create Pipeline

1. Go to [CodePipeline Console](https://console.aws.amazon.com/codesuite/codepipeline/pipelines)
2. Click **"Create pipeline"**

**Step 1: Choose pipeline settings** 3. **Pipeline name**: `${PROJECT_NAME}-pipeline` 4. **Service role**: **"Existing service role"** 5. **Role name**: Select your pipeline role created earlier 6. **Allow AWS CodePipeline to create a service role**: Uncheck 7. **Artifact store**: **"Default location"** (S3 bucket will be auto-created) 8. Click **"Next"**

**Step 2: Add source stage** 9. **Source provider**: Select your provider (e.g., **"GitHub (Version 2)"**) 10. **Connection**: - If first time: Click **"Connect to GitHub"** - Follow OAuth flow to authorize AWS - Give connection a name: `github-connection` 11. **Repository name**: Select your repository 12. **Branch name**: `main` (or your default branch) 13. **Change detection options**: **"Start the pipeline on source code change"** (checked) 14. **Output artifact format**: **"CodePipeline default"** 15. Click **"Next"**

**Step 3: Add build stage** 16. **Build provider**: **"AWS CodeBuild"** 17. **Region**: Same as your project 18. **Project name**: Select your CodeBuild project 19. **Build type**: **"Single build"** 20. Click **"Next"**

**Step 4: Add deploy stage** 21. **Deploy provider**: **"Amazon S3"** 22. **Region**: Same as your project 23. **Bucket**: Select your hosting bucket 24. **S3 object key**: Leave blank 25. **Extract file before deploy**: **Check this box** ✅ (Important!) 26. **Deployment path**: Leave blank 27. **Additional files**: None 28. Click **"Next"**

**Step 5: Review** 29. Review all settings 30. Click **"Create pipeline"**

The pipeline will start automatically!

### Step 7.2: Watch the Pipeline Execute

The pipeline will go through 3 stages:

1. **Source** - Pull code from Git (30 seconds)
2. **Build** - Run CodeBuild (3-5 minutes)
3. **Deploy** - Upload to S3 (1 minute)

Watch at: [CodePipeline Console](https://console.aws.amazon.com/codesuite/codepipeline/pipelines)

✅ **Checkpoint:** All three stages should show **"Succeeded"** in green

---

## PART 8: Verify Deployment (10 minutes)

### Step 8.1: Check S3 Files

```bash
# List files in hosting bucket
aws s3 ls s3://$HOSTING_BUCKET/ --recursive

# You should see:
# index.html
# _next/static/...
# etc.
```

Or check in [S3 Console](https://s3.console.aws.amazon.com/s3/buckets) → Your hosting bucket

### Step 8.2: Get CloudFront URL

```bash
# Get your CloudFront domain
aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[0].DomainName, '$HOSTING_BUCKET')].DomainName" \
  --output text

# Example output: d111111abcdef8.cloudfront.net
```

Or find it at [CloudFront Console](https://console.aws.amazon.com/cloudfront/v3/home#/distributions) → Click your distribution → **Distribution domain name**

### Step 8.3: Test the Website

```bash
# Open in browser
CLOUDFRONT_DOMAIN="d111111abcdef8.cloudfront.net"  # Replace with yours
open "https://$CLOUDFRONT_DOMAIN"

# Or use curl to test
curl -I "https://$CLOUDFRONT_DOMAIN"
```

You should see your Next.js app live! 🎉

### Step 8.4: Verify Environment Variables Work

Test that your OPENAI_API_KEY is working:

1. Navigate to the OpenAI chat page
2. Try sending a message
3. It should respond (if API key is valid)

✅ **Checkpoint:** Website loads correctly and all features work

---

## PART 9: Test the Full CI/CD Pipeline (10 minutes)

Now test the complete flow: Git push → Auto deploy

### Step 9.1: Make a Code Change

```bash
# Make a visible change to your app
cat > src/app/page.tsx <<'EOF'
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black-900 py-12 px-4">
      <main className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">🚀 AWS CI/CD Deployed!</h1>
          <p className="text-xl text-black-300">PDP - March 2026</p>
          <p className="text-lg text-green-500 mt-4">
            ✅ Auto-deployed via CodePipeline!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/todos-swr"
            className="group block p-8 bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
          >
            <h2 className="text-2xl font-bold text-black-900 group-hover:text-blue-600 transition-colors">
              SWR Todos
            </h2>
          </Link>

          <Link
            href="/todos-react-query"
            className="group block p-8 bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500"
          >
            <h2 className="text-2xl font-bold text-black-900 group-hover:text-green-600 transition-colors">
              React Query Todos
            </h2>
          </Link>

          <Link
            href="/openai"
            className="group block p-8 bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-500"
          >
            <h2 className="text-2xl font-bold text-black-900 group-hover:text-purple-600 transition-colors mb-4">
              OpenAI Chat
            </h2>
            <p className="text-black-600 mb-4">
              Integration with OpenAI&apos;s GPT models
            </p>
          </Link>

          <Link
            href="/gpt4all"
            className="group block p-8 bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-500"
          >
            <h2 className="text-2xl font-bold text-black-900 group-hover:text-indigo-600 transition-colors mb-4">
              GPT4All Chat
            </h2>
            <p className="text-black-600 mb-4">
              Local LLM integration with GPT4All
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
EOF

echo "✅ Code updated with deployment message"
```

### Step 9.2: Commit and Push to Git

```bash
# Check git status
git status

# Add all changes
git add .

# Commit
git commit -m "feat: Add CI/CD deployment message and AWS configuration"

# Push to GitHub (triggers pipeline!)
git push origin main

echo "✅ Code pushed to Git!"
echo "Pipeline should start automatically..."
```

### Step 9.3: Watch the Pipeline

1. Go to [CodePipeline Console](https://console.aws.amazon.com/codesuite/codepipeline/pipelines)
2. You should see your pipeline status as **"In progress"**
3. Watch each stage complete:
   - Source: Pulling from Git
   - Build: Building Next.js app
   - Deploy: Uploading to S3

This usually takes **4-6 minutes** total.

### Step 9.4: Wait for CloudFront Invalidation

After deployment, wait for cache invalidation:

- If you added CloudFront invalidation to buildspec.yml: ~2-3 minutes
- If not: Wait 5-10 minutes for cache to expire, or invalidate manually:

```bash
# Manual invalidation
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

### Step 9.5: Verify the Update

```bash
# Refresh your browser or open CloudFront URL
open "https://$CLOUDFRONT_DOMAIN"
```

You should see your updated page with "🚀 AWS CI/CD Deployed!" message!

✅ **Success!** You have a fully working CI/CD pipeline! 🎉

---

## PART 10: Document Your Setup (5 minutes)

Save your configuration for future reference:

```bash
cat > AWS_DEPLOYMENT_INFO.md <<EOF
# AWS Deployment Information

**Project**: $PROJECT_NAME
**Date**: $(date)
**Region**: $AWS_REGION

## AWS Resources

### S3 Buckets
- **Hosting Bucket**: $HOSTING_BUCKET
- **Environment Bucket**: $ENV_BUCKET

### CloudFront
- **Distribution ID**: $CLOUDFRONT_DISTRIBUTION_ID
- **Domain**: $CLOUDFRONT_DOMAIN

### IAM Roles
- **CodeBuild Role**: $CODEBUILD_ROLE
- **Pipeline Role**: $PIPELINE_ROLE

### CodeBuild
- **Project**: ${PROJECT_NAME}-build

### CodePipeline
- **Pipeline**: ${PROJECT_NAME}-pipeline

## Quick Commands

\`\`\`bash
# View pipeline status
aws codepipeline get-pipeline-state --name ${PROJECT_NAME}-pipeline

# Start build manually
aws codebuild start-build --project-name ${PROJECT_NAME}-build

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"

# View S3 files
aws s3 ls s3://$HOSTING_BUCKET/ --recursive

# Sync local build to S3 (manual deployment)
npm run build && aws s3 sync out/ s3://$HOSTING_BUCKET --delete
\`\`\`

## Environment Variables

Stored in: s3://$ENV_BUCKET/.env.production

To update:
\`\`\`bash
# Edit .env.production locally
# Upload to S3
aws s3 cp .env.production s3://$ENV_BUCKET/.env.production
# Trigger new build
aws codepipeline start-pipeline-execution --name ${PROJECT_NAME}-pipeline
\`\`\`

## URLs

- **Website**: https://$CLOUDFRONT_DOMAIN
- **S3 Console**: https://s3.console.aws.amazon.com/s3/buckets/$HOSTING_BUCKET
- **CloudFront Console**: https://console.aws.amazon.com/cloudfront/v3/home#/distributions/$CLOUDFRONT_DISTRIBUTION_ID
- **Pipeline Console**: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${PROJECT_NAME}-pipeline/view

## Costs (Estimated)

- S3 Storage: ~$0.50/month
- CloudFront: ~$1-5/month (1TB free tier)
- CodePipeline: $1/month (1 free pipeline)
- CodeBuild: ~$0.50/month (100 min free tier)

**Total**: ~$2-7/month

## Next Steps

- [ ] Set up custom domain
- [ ] Configure SSL certificate
- [ ] Set up monitoring with CloudWatch
- [ ] Create staging environment
- [ ] Set up cost alerts
EOF

echo "✅ Documentation saved to AWS_DEPLOYMENT_INFO.md"
```

---

## 🎉 CONGRATULATIONS!

You have successfully set up a complete CI/CD pipeline with:

✅ **Git Integration** - Push code triggers automatic deployment  
✅ **CodePipeline** - Orchestrates the entire workflow  
✅ **CodeBuild** - Builds your Next.js app  
✅ **S3 Hosting** - Stores built files  
✅ **S3 Environment Variables** - Secure env var storage  
✅ **CloudFront CDN** - Global content delivery with caching

## 🔄 Your Workflow Now

```
1. Write code locally
   ↓
2. git commit && git push
   ↓
3. CodePipeline detects change
   ↓
4. CodeBuild downloads env from S3
   ↓
5. CodeBuild runs npm install & build
   ↓
6. Built files uploaded to S3
   ↓
7. CloudFront invalidation clears cache
   ↓
8. Users see updated site globally!
```

**Deploy time**: ~5 minutes from push to live

---

## 📊 Monitoring & Maintenance

### Daily Monitoring

Check pipeline status:

```bash
aws codepipeline get-pipeline-state --name ${PROJECT_NAME}-pipeline --query 'stageStates[*].[stageName,latestExecution.status]' --output table
```

### View Build Logs

1. [CodeBuild Console](https://console.aws.amazon.com/codesuite/codebuild/projects)
2. Click your project
3. View **Build history**
4. Click any build to see logs

### CloudFront Analytics

1. [CloudFront Console](https://console.aws.amazon.com/cloudfront/v3/home)
2. Click your distribution
3. View **Monitoring** tab for:
   - Requests
   - Data transfer
   - Cache hit ratio
   - Error rates

### Cost Monitoring

1. [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home#/cost-explorer)
2. Filter by service: S3, CloudFront, CodeBuild, CodePipeline
3. Set up [billing alerts](https://console.aws.amazon.com/billing/home#/preferences)

---

## 🐛 Troubleshooting

### Pipeline Fails at Source Stage

- Check GitHub connection: [CodePipeline Settings](https://console.aws.amazon.com/codesuite/settings/connections)
- Reconnect if needed

### Build Fails

- Check [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
- Verify environment variables in CodeBuild project
- Verify IAM role has S3 access
- Test build locally: `npm run build`

### Website Shows 403/404

- Check S3 bucket policy allows CloudFront
- Verify CloudFront distribution is deployed (not "In Progress")
- Check default root object is set to `index.html`
- Invalidate cache: `aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"`

### Environment Variables Not Working

- Verify file exists: `aws s3 ls s3://$ENV_BUCKET/`
- Check CodeBuild role has S3 read access
- Check buildspec.yml downloads the file correctly
- Verify file format (no quotes around values)

### Old Content Shows After Deploy

- CloudFront cache not invalidated
- Run: `aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"`
- Or wait 24 hours for cache to expire

---

## 🚀 Next Steps (Optional)

### Add Custom Domain

1. [Request SSL certificate](https://console.aws.amazon.com/acm/home?region=us-east-1) (must be in us-east-1)
2. Add domain to CloudFront distribution
3. Update DNS records

### Set Up Staging Environment

```bash
# Create staging bucket
aws s3 mb s3://${PROJECT_NAME}-staging

# Create staging pipeline
# Use branch: develop or staging
```

### Add Slack Notifications

1. Create SNS topic
2. Subscribe to CodePipeline events
3. Integrate with Slack webhook

### Add E2E Tests to Pipeline

Add test stage between build and deploy:

- Use CodeBuild with Playwright/Cypress
- Run tests against staging environment

---

## 📚 Helpful Links

- [CodePipeline Console](https://console.aws.amazon.com/codesuite/codepipeline/pipelines)
- [CodeBuild Projects](https://console.aws.amazon.com/codesuite/codebuild/projects)
- [S3 Buckets](https://s3.console.aws.amazon.com/s3/buckets)
- [CloudFront Distributions](https://console.aws.amazon.com/cloudfront/v3/home#/distributions)
- [IAM Roles](https://console.aws.amazon.com/iam/home#/roles)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
- [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home#/cost-explorer)

---

## ✅ Final Checklist

- [ ] S3 hosting bucket created
- [ ] S3 environment variables bucket created
- [ ] Environment variables uploaded to S3
- [ ] IAM roles created (CodeBuild, CodePipeline)
- [ ] CloudFront distribution created and deployed
- [ ] S3 bucket policy updated for CloudFront access
- [ ] CodeBuild project created
- [ ] Test build succeeded
- [ ] CodePipeline created
- [ ] Pipeline succeeded on first run
- [ ] Website accessible via CloudFront URL
- [ ] Made code change and pushed to Git
- [ ] Pipeline auto-triggered and deployed
- [ ] Website updated with new content
- [ ] Documentation saved

**If all checked:** You're done! 🎊

---

**Questions?** Refer to:

- [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) - Detailed explanations
- [AWS_SERVICES_REFERENCE.md](./AWS_SERVICES_REFERENCE.md) - Service details
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Progress tracking

**Need help?** Check AWS documentation or reach out to AWS support.
